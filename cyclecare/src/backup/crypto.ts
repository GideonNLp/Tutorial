import { fromB64Url, toB64Url } from '../partner/crypto';
import { randomBytes, type Bytes } from '../storage/crypto';

/**
 * Cryptography of the backup ("Copie de siguranță"), WebCrypto only.
 *
 * Everything starts from a recovery code the app generates: 24 characters, 23 random ones and a check
 * character, about 115 bits. Because it is that random, no slow password hashing is needed; three
 * unrelated values are derived from it with HKDF-SHA-256 (a different label for each):
 *
 *   id     — 128 bits, public: where the copy lives on the server
 *   token  — 256 bits: proves the right to read, write and delete it (the server keeps only its hash)
 *   key    — AES-256-GCM: encrypts the copy on the device before anything leaves it
 *
 * The server never sees the code or the key, so a copy it holds cannot be read by it, by whoever
 * reads its storage, or by someone who learns the id. The id cannot be turned back into the code.
 *
 * The copy is the portable JSON of the journal, compressed with gzip when the browser can, then
 * sealed with AES-GCM; the id is bound into the encryption, so a copy cannot be passed off as another's.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** The same 32 characters as the pairing codes: no I, O, 0 or 1. 256 is a multiple of 32, so there is no bias. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const RECOVERY_CODE_LENGTH = 24;
const SALT = encoder.encode('cyclecare/backup/v1');
export const ENVELOPE_VERSION = 1;
/** What a copy may unpack to: far more than the journal of a lifetime, and far less than a bomb. */
const MAX_UNPACKED = 30_000_000;

// ---- The recovery code -----------------------------------------------------------------------

/** Weights are odd, so they are coprime with 32: any single wrong character changes the check. */
function checkChar(first23: string): string {
  let sum = 0;
  for (let i = 0; i < first23.length; i++) sum += ALPHABET.indexOf(first23[i]!) * (2 * i + 1);
  return ALPHABET[sum % 32]!;
}

export function generateRecoveryCode(): string {
  const body = Array.from(randomBytes(RECOVERY_CODE_LENGTH - 1), (byte) => ALPHABET[byte % 32]).join('');
  return body + checkChar(body);
}

/** What people type: lower case, spaces and dashes are fine. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

/** Whether this is a code the app could have made: the right length and characters, and the check matches. */
export function isRecoveryCode(code: string): boolean {
  if (code.length !== RECOVERY_CODE_LENGTH) return false;
  for (const c of code) if (!ALPHABET.includes(c)) return false;
  return checkChar(code.slice(0, -1)) === code.at(-1);
}

/** "ABCD-EFGH-JKLM-NPQR-STUV-WXYZ": six groups of four, for reading aloud and copying by hand. */
export function formatRecoveryCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') ?? code;
}

/** The group number `n` (0-based) of a code, for asking the person to type it back. */
export const recoveryGroup = (code: string, n: number): string => code.slice(n * 4, n * 4 + 4);

// ---- What the code opens ---------------------------------------------------------------------

export interface BackupKeys {
  /** 22 characters, base64url. */
  id: string;
  /** 43 characters, base64url. */
  token: string;
  key: CryptoKey;
}

export async function deriveBackupKeys(code: string): Promise<BackupKeys> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(code), 'HKDF', false, ['deriveBits', 'deriveKey']);
  const params = (label: string) => ({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: encoder.encode(`cyclecare/backup/v1/${label}`) }) as const;
  const [id, token] = await Promise.all([
    crypto.subtle.deriveBits(params('id'), material, 128),
    crypto.subtle.deriveBits(params('token'), material, 256),
  ]);
  const key = await crypto.subtle.deriveKey(params('key'), material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { id: toB64Url(new Uint8Array(id)), token: toB64Url(new Uint8Array(token)), key };
}

// ---- The sealed copy -------------------------------------------------------------------------

/** What is stored, on the server and in a file: nothing in it can be read without the key. */
export interface BackupEnvelope {
  v: typeof ENVELOPE_VERSION;
  /** Whether the content was gzipped before it was sealed. */
  z: 'gzip' | 'none';
  iv: string;
  ct: string;
}

/** The id and the way the content was packed are part of what the encryption vouches for. */
const context = (id: string, z: BackupEnvelope['z']) => `cyclecare/backup/v1|${id}|${z}`;

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function gzip(bytes: Uint8Array): Promise<Bytes> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Reads the whole stream, but gives up past `limit` bytes. */
async function gunzip(bytes: Uint8Array, limit: number): Promise<Bytes> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new Error('too_large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/** Seals the JSON text of the journal. */
export async function sealBackup(keys: BackupKeys, json: string): Promise<BackupEnvelope> {
  const raw = encoder.encode(json);
  const compress = canCompress();
  const plain = compress ? await gzip(raw) : raw;
  const iv = randomBytes(12);
  const z = compress ? 'gzip' : 'none';
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(context(keys.id, z)) }, keys.key, plain);
  return { v: ENVELOPE_VERSION, z, iv: toB64Url(iv), ct: toB64Url(new Uint8Array(sealed)) };
}

export type OpenFailure = 'wrong_key' | 'unsupported' | 'corrupt';

/**
 * The JSON text inside a sealed copy. Fails with `wrong_key` for a wrong code or a copy that was changed
 * (AES-GCM cannot tell the two apart, and should not), `unsupported` for a newer format or a browser that
 * cannot unpack it, and `corrupt` for something that opens but is not a copy.
 */
export async function openBackup(
  keys: BackupKeys,
  envelope: BackupEnvelope,
): Promise<{ ok: true; json: string } | { ok: false; error: OpenFailure }> {
  if (envelope.v !== ENVELOPE_VERSION || (envelope.z !== 'gzip' && envelope.z !== 'none')) return { ok: false, error: 'unsupported' };
  let plain: Bytes;
  try {
    plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64Url(envelope.iv), additionalData: encoder.encode(context(keys.id, envelope.z)) },
        keys.key,
        fromB64Url(envelope.ct),
      ),
    );
  } catch {
    return { ok: false, error: 'wrong_key' };
  }
  try {
    if (envelope.z === 'none') return { ok: true, json: decoder.decode(plain) };
    if (!canCompress()) return { ok: false, error: 'unsupported' };
    return { ok: true, json: decoder.decode(await gunzip(plain, MAX_UNPACKED)) };
  } catch {
    return { ok: false, error: 'corrupt' };
  }
}

/** SHA-256 of a text, hex: tells whether the journal changed since the last copy without keeping it. */
export async function digest(text: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---- The file --------------------------------------------------------------------------------

const FILE_APP = 'CycleCare';
const FILE_KIND = 'encrypted-backup';
export const BACKUP_FILE_EXTENSION = 'cyclecare';

export function serializeBackupFile(envelope: BackupEnvelope, now: Date): string {
  return JSON.stringify({ app: FILE_APP, kind: FILE_KIND, savedAt: now.toISOString(), ...envelope });
}

/** A file picked by the person is untrusted input: it must be exactly what the app writes. */
export function parseBackupFile(text: string): BackupEnvelope | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;
  const f = parsed as Record<string, unknown>;
  const b64 = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_-]+$/.test(v);
  if (f.app !== FILE_APP || f.kind !== FILE_KIND || typeof f.v !== 'number' || (f.z !== 'gzip' && f.z !== 'none')) return undefined;
  if (!b64(f.iv) || !b64(f.ct) || (f.ct as string).length > 4_000_000) return undefined;
  return { v: f.v as typeof ENVELOPE_VERSION, z: f.z, iv: f.iv as string, ct: f.ct as string };
}
