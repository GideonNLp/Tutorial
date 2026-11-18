import type { RelayFailure, RelayResult } from '../partner/api';
import { relay, type BackupVersionInfo } from '../partner/api';
import type { AppData } from '../domain/types';
import { exportBackup, parseBackup, portableData } from '../storage/backup';
import { deriveBackupKeys, digest, openBackup, parseBackupFile, sealBackup, serializeBackupFile, type OpenFailure } from './crypto';

/**
 * What the backup does, apart from how it looks: seal the journal and send it, ask what the server
 * holds, fetch one version and open it, delete it. Every call fails softly with a reason, so the
 * screens can say what happened and the app keeps working offline.
 */

/** Tells whether the journal changed since the last copy, without anything else being kept. */
export const contentDigest = (data: AppData): Promise<string> => digest(JSON.stringify(portableData(data)));

/** Where a code's copy lives and the proof that it may be touched: both derive from the code. */
export async function backupIdentity(code: string): Promise<{ id: string; token: string }> {
  const { id, token } = await deriveBackupKeys(code);
  return { id, token };
}

// ---- The server copy ------------------------------------------------------------------------

/** `etag` is the version this device last wrote or restored; without it the call creates the first version. */
export async function pushBackup(
  code: string,
  data: AppData,
  etag: string | undefined,
  now: Date,
): Promise<RelayResult<{ etag: string; updatedAt: string }>> {
  const keys = await deriveBackupKeys(code);
  const envelope = await sealBackup(keys, exportBackup(data, now));
  return relay.putBackup(keys.id, keys.token, envelope, etag);
}

export async function listBackups(code: string): Promise<RelayResult<BackupVersionInfo[]>> {
  const { id, token } = await backupIdentity(code);
  const res = await relay.listBackups(id, token);
  return res.ok ? { ok: true, value: res.value.versions } : res;
}

export const deleteBackup = (id: string, token: string) => relay.deleteBackup(id, token);

export type RestoreFailure = RelayFailure | OpenFailure | 'invalid';
export type Restored = { ok: true; data: AppData; etag: string; updatedAt: string } | { ok: false; reason: RestoreFailure };

/** Fetches one version and opens it. A wrong code finds nothing (`not_found`): the id it leads to does not exist. */
export async function fetchBackup(code: string, role: BackupVersionInfo['role'], nowISO: string): Promise<Restored> {
  const keys = await deriveBackupKeys(code);
  const res = await relay.getBackup(keys.id, keys.token, role);
  if (!res.ok) return res;
  const opened = await openBackup(keys, { v: res.value.v as 1, z: res.value.z, iv: res.value.iv, ct: res.value.ct });
  if (!opened.ok) return { ok: false, reason: opened.error };
  const parsed = parseBackup(opened.json, nowISO);
  return parsed.ok ? { ok: true, data: parsed.data, etag: res.value.etag, updatedAt: res.value.updatedAt } : { ok: false, reason: 'invalid' };
}

// ---- The file -------------------------------------------------------------------------------

export async function sealToFile(code: string, data: AppData, now: Date): Promise<string> {
  const keys = await deriveBackupKeys(code);
  return serializeBackupFile(await sealBackup(keys, exportBackup(data, now)), now);
}

export type FileFailure = 'not_a_backup' | OpenFailure | 'invalid';

/** A file picked by the person is untrusted input: it is checked before anything is opened. */
export async function openFile(
  code: string,
  fileText: string,
  nowISO: string,
): Promise<{ ok: true; data: AppData } | { ok: false; reason: FileFailure }> {
  const envelope = parseBackupFile(fileText);
  if (!envelope) return { ok: false, reason: 'not_a_backup' };
  const opened = await openBackup(await deriveBackupKeys(code), envelope);
  if (!opened.ok) return { ok: false, reason: opened.error };
  const parsed = parseBackup(opened.json, nowISO);
  return parsed.ok ? { ok: true, data: parsed.data } : { ok: false, reason: 'invalid' };
}
