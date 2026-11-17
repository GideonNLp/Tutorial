import { PARTNER_SYNC_URL } from '../app/config';
import type { SealedText } from './crypto';

/**
 * HTTP client for the partner relay (server/relay.ts). Every call fails softly with a reason
 * instead of throwing, so the screens can say what happened and the app keeps working offline.
 */
export type RelayFailure = 'offline' | 'not_found' | 'conflict' | 'forbidden' | 'server';
export type RelayResult<T> = { ok: true; value: T } | { ok: false; reason: RelayFailure };

const TIMEOUT_MS = 12_000;

async function call<T>(
  method: string,
  path: string,
  options: { body?: unknown; token?: string; etag?: string; headers?: Record<string, string>; timeout?: number } = {},
): Promise<RelayResult<T>> {
  if (!PARTNER_SYNC_URL) return { ok: false, reason: 'offline' };
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.etag) headers['If-None-Match'] = options.etag;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? TIMEOUT_MS);
  try {
    const res = await fetch(PARTNER_SYNC_URL + path, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    if (res.status === 304) return { ok: true, value: undefined as T };
    if (res.status === 404) return { ok: false, reason: 'not_found' };
    // 409: a pairing code already taken. 412: someone else wrote the backup since this device last did.
    if (res.status === 409 || res.status === 412) return { ok: false, reason: 'conflict' };
    if (res.status === 403) return { ok: false, reason: 'forbidden' };
    if (!res.ok) return { ok: false, reason: 'server' };
    const text = await res.text();
    return { ok: true, value: (text ? JSON.parse(text) : undefined) as T };
  } catch {
    return { ok: false, reason: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

export interface PairingRecord {
  ownerPub: string;
  partnerPub?: string;
  payload?: SealedText;
  expiresAt: number;
}

export interface BackupVersionInfo {
  role: 'latest' | 'daily' | 'weekly';
  etag: string;
  updatedAt: string;
  size: number;
}

/** A sealed backup as the server holds it. */
export interface StoredBackup {
  v: number;
  z: 'gzip' | 'none';
  iv: string;
  ct: string;
  etag: string;
  updatedAt: string;
  role: BackupVersionInfo['role'];
}

/** Backups can be large and phones slow: they get longer than a summary does. */
const BACKUP_TIMEOUT_MS = 40_000;

export const relay = {
  createPairing: (code: string, ownerPub: string, tokenHash: string) =>
    call<{ expiresAt: number }>('POST', '/pair', { body: { code, ownerPub, tokenHash } }),
  getPairing: (code: string) => call<PairingRecord>('GET', `/pair/${code}`),
  joinPairing: (code: string, partnerPub: string) => call<{ ok: true }>('POST', `/pair/${code}/join`, { body: { partnerPub } }),
  approvePairing: (code: string, token: string, payload: SealedText) =>
    call<{ ok: true }>('POST', `/pair/${code}/approve`, { body: { payload }, token }),
  deletePairing: (code: string, token: string) => call<void>('DELETE', `/pair/${code}`, { token }),

  putChannel: (channelId: string, token: string, sealed: SealedText) =>
    call<{ etag: string }>('PUT', `/channel/${channelId}`, { body: sealed, token }),
  /** `value` is undefined when nothing changed since `etag`. */
  getChannel: (channelId: string, etag?: string) =>
    call<(SealedText & { etag: string; updatedAt: string }) | undefined>('GET', `/channel/${channelId}`, { etag }),
  deleteChannel: (channelId: string, token: string) => call<void>('DELETE', `/channel/${channelId}`, { token }),

  /** `etag` is the version this device last wrote or restored; without it the call creates the first version. */
  putBackup: (id: string, token: string, envelope: { v: number; z: string; iv: string; ct: string }, etag?: string) =>
    call<{ etag: string; updatedAt: string }>('PUT', `/backup/${id}`, {
      body: envelope,
      token,
      headers: etag ? { 'If-Match': etag } : { 'If-None-Match': '*' },
      timeout: BACKUP_TIMEOUT_MS,
    }),
  listBackups: (id: string, token: string) => call<{ versions: BackupVersionInfo[] }>('GET', `/backup/${id}`, { token }),
  getBackup: (id: string, token: string, role: BackupVersionInfo['role']) =>
    call<StoredBackup>('GET', `/backup/${id}/${role}`, { token, timeout: BACKUP_TIMEOUT_MS }),
  deleteBackup: (id: string, token: string) => call<void>('DELETE', `/backup/${id}`, { token }),
};
