import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_FILE_EXTENSION,
  deriveBackupKeys,
  formatRecoveryCode,
  generateRecoveryCode,
  isRecoveryCode,
  normalizeRecoveryCode,
  openBackup,
  parseBackupFile,
  RECOVERY_CODE_LENGTH,
  recoveryGroup,
  sealBackup,
  serializeBackupFile,
} from '../src/backup/crypto';
import { backupIdentity, contentDigest, deleteBackup, fetchBackup, listBackups, openFile, pushBackup, sealToFile } from '../src/backup/flows';
import { emptyAppData, type AppData } from '../src/domain/types';
import { exportBackup, parseBackup, portableData } from '../src/storage/backup';
import { fromB64Url } from '../src/partner/crypto';
import { handleRelay, memoryRelayStore } from '../server/relay';
import { sampleJournal } from './fixtures/sampleJournal';
import { NOW as NOW_ISO } from './helpers';

const TODAY = '2026-11-15';
const NOW = new Date(NOW_ISO);
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

describe('the recovery code', () => {
  it('has 24 characters from the unambiguous alphabet, ends in a valid check character, and is never the same twice', () => {
    const codes = new Set(Array.from({ length: 60 }, () => generateRecoveryCode()));
    expect(codes.size).toBe(60);
    for (const code of codes) {
      expect(code).toHaveLength(RECOVERY_CODE_LENGTH);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{24}$/);
      expect(isRecoveryCode(code)).toBe(true);
    }
  });

  it('notices any single wrong character', () => {
    const code = generateRecoveryCode();
    for (let i = 0; i < code.length; i++) {
      for (const c of ALPHABET) {
        if (c === code[i]) continue;
        expect(isRecoveryCode(code.slice(0, i) + c + code.slice(i + 1)), `${i}:${c}`).toBe(false);
      }
    }
  });

  it('notices almost every swap of two neighbouring characters', () => {
    // One code has only about twenty swaps, too few for a rate that does not wobble: count over many codes.
    let swaps = 0;
    let caught = 0;
    for (let n = 0; n < 300; n++) {
      const code = generateRecoveryCode();
      for (let i = 0; i + 1 < code.length; i++) {
        if (code[i] === code[i + 1]) continue;
        swaps++;
        if (!isRecoveryCode(code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2))) caught++;
      }
    }
    expect(caught / swaps).toBeGreaterThan(0.9);
  });

  it('refuses codes of the wrong length or with characters the alphabet does not have', () => {
    const code = generateRecoveryCode();
    expect(isRecoveryCode(code.slice(1))).toBe(false);
    expect(isRecoveryCode(code + 'A')).toBe(false);
    expect(isRecoveryCode('')).toBe(false);
    expect(isRecoveryCode(code.slice(0, -1) + 'O')).toBe(false);
    expect(isRecoveryCode(code.toLowerCase())).toBe(false); // typed codes go through normalizeRecoveryCode first
  });

  it('is shown in groups of four and typed back however the person writes it', () => {
    const code = generateRecoveryCode();
    const shown = formatRecoveryCode(code);
    expect(shown).toMatch(/^([A-Z2-9]{4}-){5}[A-Z2-9]{4}$/);
    expect(normalizeRecoveryCode(shown.toLowerCase().replace(/-/g, ' ·'.slice(0, 1)))).toBe(code);
    expect(normalizeRecoveryCode(` ${shown.toLowerCase()} `)).toBe(code);
    expect(recoveryGroup(code, 0)).toBe(code.slice(0, 4));
    expect(recoveryGroup(code, 5)).toBe(code.slice(20, 24));
  });
});

describe('what a code opens', () => {
  it('always derives the same id, token and key from the same code, and nothing else from another', async () => {
    const code = generateRecoveryCode();
    const a = await deriveBackupKeys(code);
    const b = await deriveBackupKeys(code);
    expect(b.id).toBe(a.id);
    expect(b.token).toBe(a.token);
    expect(a.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // The three come from different labels: knowing the id or the token says nothing about the others.
    expect(a.id).not.toBe(a.token.slice(0, 22));
    const other = await deriveBackupKeys(generateRecoveryCode());
    expect(other.id).not.toBe(a.id);
    expect(other.token).not.toBe(a.token);
    // The id does not contain the code.
    expect(a.id.toUpperCase()).not.toContain(code.slice(0, 8));
    // The key never leaves the key store.
    expect(a.key.extractable).toBe(false);
    expect(a.key.usages.sort()).toEqual(['decrypt', 'encrypt']);
  });
});

describe('a sealed copy', () => {
  const text = JSON.stringify({
    note: 'Notă privată: nimeni nu trebuie să citească asta',
    days: Array.from({ length: 800 }, (_, i) => ({ i, flow: 'medium' })),
  });
  const latin1 = (b64: string) => String.fromCharCode(...fromB64Url(b64));

  it('opens with the code that made it, and holds nothing readable', async () => {
    const keys = await deriveBackupKeys(generateRecoveryCode());
    const envelope = await sealBackup(keys, text);
    expect(envelope).toMatchObject({ v: 1, z: 'gzip' });
    expect(latin1(envelope.ct)).not.toContain('Notă');
    expect(latin1(envelope.ct)).not.toContain('privat');
    expect(latin1(envelope.ct)).not.toContain('"flow"');
    // Compressed before it is sealed: a journal of this shape is far smaller than its text.
    expect(envelope.ct.length).toBeLessThan(text.length / 4);
    expect(await openBackup(keys, envelope)).toEqual({ ok: true, json: text });
    // A fresh nonce every time.
    expect((await sealBackup(keys, text)).iv).not.toBe(envelope.iv);
  });

  it('does not open with another code, a changed byte, or another copy’s id', async () => {
    const code = generateRecoveryCode();
    const keys = await deriveBackupKeys(code);
    const envelope = await sealBackup(keys, text);
    expect(await openBackup(await deriveBackupKeys(generateRecoveryCode()), envelope)).toEqual({ ok: false, error: 'wrong_key' });

    const bytes = fromB64Url(envelope.ct);
    bytes[10] = bytes[10]! ^ 1;
    const changed = {
      ...envelope,
      ct: btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''),
    };
    expect(await openBackup(keys, changed)).toEqual({ ok: false, error: 'wrong_key' });
    // Saying the content is not compressed, to make it open as garbage, is caught as well.
    expect(await openBackup(keys, { ...envelope, z: 'none' })).toEqual({ ok: false, error: 'wrong_key' });
  });

  it('refuses a newer format, and gives up on something that unpacks to far more than any journal', async () => {
    const keys = await deriveBackupKeys(generateRecoveryCode());
    const envelope = await sealBackup(keys, text);
    expect(await openBackup(keys, { ...envelope, v: 2 as 1 })).toEqual({ ok: false, error: 'unsupported' });
    const bomb = await sealBackup(keys, 'a'.repeat(31_000_000));
    expect(bomb.ct.length).toBeLessThan(100_000);
    expect(await openBackup(keys, bomb)).toEqual({ ok: false, error: 'corrupt' });
  });
});

describe('the file', () => {
  it('is what the app writes and nothing else: anything picked from outside is checked first', async () => {
    const keys = await deriveBackupKeys(generateRecoveryCode());
    const envelope = await sealBackup(keys, '{}');
    const file = serializeBackupFile(envelope, NOW);
    expect(BACKUP_FILE_EXTENSION).toBe('cyclecare');
    expect(parseBackupFile(file)).toEqual(envelope);
    expect(parseBackupFile('not json')).toBeUndefined();
    expect(parseBackupFile('[]')).toBeUndefined();
    expect(parseBackupFile(JSON.stringify({ ...JSON.parse(file), app: 'Other' }))).toBeUndefined();
    expect(parseBackupFile(JSON.stringify({ ...JSON.parse(file), kind: 'backup' }))).toBeUndefined();
    expect(parseBackupFile(JSON.stringify({ ...JSON.parse(file), z: 'zip' }))).toBeUndefined();
    expect(parseBackupFile(JSON.stringify({ ...JSON.parse(file), ct: 'not base64!' }))).toBeUndefined();
    expect(parseBackupFile(JSON.stringify({ ...JSON.parse(file), ct: 'A'.repeat(4_000_001) }))).toBeUndefined();
    // The plain export is not an encrypted file.
    expect(parseBackupFile(exportBackup(emptyAppData(), NOW))).toBeUndefined();
  });
});

/** A journal with something in it, a partner link and a recovery code: everything that must or must not travel. */
function journal(): AppData {
  const { logs, profile } = sampleJournal(TODAY, NOW_ISO);
  const data: AppData = { ...emptyAppData(), logs, profile, user: { nickname: 'Ana' } };
  data.logs[TODAY] = { ...(data.logs[TODAY] ?? { date: TODAY, updatedAt: NOW_ISO }), note: 'Notă privată pentru copie' };
  data.partner = {
    permissions: data.partner.permissions,
    share: {
      channelId: 'ChannelIdAbCdEfGhIjKl',
      dataKey: 'PARTNER-DATA-KEY-NOT-FOR-BACKUPS-0123456789abc',
      writeToken: 'partner-write-token-secret',
      connectedAt: NOW_ISO,
    },
  };
  data.backup = { code: generateRecoveryCode(), createdAt: NOW_ISO, confirmed: true, auto: { since: NOW_ISO, etag: '"abc"' } };
  return data;
}

describe('what leaves the phone', () => {
  it('is the journal, without the keys of a partner link and without the recovery code', () => {
    const data = journal();
    const out = exportBackup(data, NOW);
    expect(out).not.toContain(data.backup!.code);
    expect(out).not.toContain('PARTNER-DATA-KEY');
    expect(out).not.toContain('partner-write-token');
    expect(out).toContain('Notă privată pentru copie');
    const portable = portableData(data);
    expect(portable.backup).toBeUndefined();
    expect(portable.partnerView).toBeUndefined();
    expect(portable.partner.share).toBeUndefined();
    // And a file claiming to carry them brings none of it back.
    const forged = JSON.parse(out) as { data: Record<string, unknown> };
    forged.data.backup = { code: 'FORGED-CODE', auto: { since: 'x' } };
    const parsed = parseBackup(JSON.stringify(forged), NOW_ISO);
    expect(parsed.ok && parsed.data.backup).toBeFalsy();
  });

  it('has a digest that moves with the journal and with nothing else', async () => {
    const data = journal();
    const before = await contentDigest(data);
    // The state of the copy itself, and the partner's keys, are not part of what is compared.
    const moved: AppData = { ...data, backup: { ...data.backup!, auto: { ...data.backup!.auto!, etag: '"other"', lastAt: 'later' } } };
    expect(await contentDigest(moved)).toBe(before);
    const edited: AppData = { ...data, logs: { ...data.logs, [TODAY]: { ...data.logs[TODAY]!, note: 'altceva' } } };
    expect(await contentDigest(edited)).not.toBe(before);
  });
});

describe('the copy on the server', () => {
  const store = memoryRelayStore();
  const seen: string[] = [];
  beforeEach(() => {
    vi.stubGlobal('fetch', (input: string, init?: RequestInit) => {
      seen.push(`${init?.method ?? 'GET'} ${input}`);
      return handleRelay(new Request(`http://relay.test${input}`, init), store);
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    seen.length = 0;
  });

  it('is made under the code, listed, fetched and opened on another phone with the same code', async () => {
    const code = generateRecoveryCode();
    const data = journal();
    const pushed = await pushBackup(code, data, undefined, NOW);
    expect(pushed.ok).toBe(true);

    const versions = await listBackups(code);
    expect(versions.ok && versions.value.map((v) => v.role)).toEqual(['latest']);

    const restored = await fetchBackup(code, 'latest', NOW_ISO);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(Object.keys(restored.data.logs)).toEqual(Object.keys(data.logs));
    expect(restored.data.logs[TODAY]?.note).toBe('Notă privată pentru copie');
    expect(restored.data.user.nickname).toBe('Ana');
    // Nothing of the old phone's links or codes came along.
    expect(restored.data.backup).toBeUndefined();
    expect(restored.data.partner.share).toBeUndefined();
    expect(restored.etag).toBe(pushed.ok ? pushed.value.etag : '');
  });

  it('shows the server nothing readable, and nothing that tells which code or which journal it is', async () => {
    const raw = memoryRelayStore();
    const direct = (input: string, init?: RequestInit) => handleRelay(new Request(`http://relay.test${input}`, init), raw);
    vi.stubGlobal('fetch', direct);
    const code = generateRecoveryCode();
    const data = journal();
    await pushBackup(code, data, undefined, NOW);
    const { id } = await backupIdentity(code);
    const stored = (await raw.get(`backup:${id}:b1`)) as { iv: string; ct: string };
    const asText = String.fromCharCode(...fromB64Url(stored.ct));
    for (const secret of ['Notă privată', 'Ana', 'PARTNER-DATA-KEY', code, '"flow"']) expect(asText).not.toContain(secret);
    const meta = JSON.stringify(await raw.get(`backup:${id}:meta`));
    expect(meta).not.toContain(code);
    expect(meta).not.toContain((await deriveBackupKeys(code)).token); // only its hash is kept
    expect(seen.every((entry) => !entry.includes(code))).toBe(true);
  });

  it('finds nothing under a wrong code, and says a mistyped one is not even a code', async () => {
    const code = generateRecoveryCode();
    await pushBackup(code, journal(), undefined, NOW);
    expect(await fetchBackup(generateRecoveryCode(), 'latest', NOW_ISO)).toEqual({ ok: false, reason: 'not_found' });
    expect(isRecoveryCode(code.slice(0, 23) + (code.at(-1) === 'A' ? 'B' : 'A'))).toBe(false);
  });

  it('refuses a second phone that does not know the latest version, and lets the first one go on', async () => {
    const code = generateRecoveryCode();
    const first = await pushBackup(code, journal(), undefined, NOW);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // A phone that restored the copy has its etag; one that only knows the code has none, or an old one.
    expect(await pushBackup(code, journal(), undefined, NOW)).toEqual({ ok: false, reason: 'conflict' });
    expect(await pushBackup(code, journal(), '"0000000000000000"', NOW)).toEqual({ ok: false, reason: 'conflict' });
    const second = await pushBackup(code, journal(), first.value.etag, NOW);
    expect(second.ok).toBe(true);
    // The first phone's etag is now stale: it finds out instead of overwriting the newer copy.
    expect(await pushBackup(code, journal(), first.value.etag, NOW)).toEqual({ ok: false, reason: 'conflict' });
  });

  it('is deleted for good with the code’s identity, and a repeated delete is harmless', async () => {
    const code = generateRecoveryCode();
    await pushBackup(code, journal(), undefined, NOW);
    const { id, token } = await backupIdentity(code);
    expect((await deleteBackup(id, token)).ok).toBe(true);
    expect((await deleteBackup(id, token)).ok).toBe(true);
    expect(await fetchBackup(code, 'latest', NOW_ISO)).toEqual({ ok: false, reason: 'not_found' });
    expect(await listBackups(code)).toEqual({ ok: false, reason: 'not_found' });
  });

  it('fails softly when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    const code = generateRecoveryCode();
    expect(await pushBackup(code, journal(), undefined, NOW)).toEqual({ ok: false, reason: 'offline' });
    expect(await fetchBackup(code, 'latest', NOW_ISO)).toEqual({ ok: false, reason: 'offline' });
    expect((await deleteBackup(...(Object.values(await backupIdentity(code)) as [string, string]))).ok).toBe(false);
  });
});

describe('the encrypted file, end to end', () => {
  it('saves the journal under the code and opens it again with the same code only', async () => {
    const code = generateRecoveryCode();
    const data = journal();
    const file = await sealToFile(code, data, NOW);
    expect(file).not.toContain('Notă privată');
    expect(file).not.toContain(code);

    const opened = await openFile(code, file, NOW_ISO);
    expect(opened.ok).toBe(true);
    expect(opened.ok && opened.data.logs[TODAY]?.note).toBe('Notă privată pentru copie');
    expect(opened.ok && opened.data.backup).toBeUndefined();

    expect(await openFile(generateRecoveryCode(), file, NOW_ISO)).toEqual({ ok: false, reason: 'wrong_key' });
    expect(await openFile(code, 'not a backup', NOW_ISO)).toEqual({ ok: false, reason: 'not_a_backup' });
    expect(await openFile(code, exportBackup(data, NOW), NOW_ISO)).toEqual({ ok: false, reason: 'not_a_backup' });
  });
});
