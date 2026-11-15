/**
 * Thin wrappers over WebCrypto. No third-party cryptography.
 *
 * Key hierarchy:
 *   data key (AES-256-GCM)  — encrypts the journal; lives only in memory while unlocked
 *     └─ wrapped by one or more "key slots":
 *          device slot    — a non-extractable key kept by the browser (no PIN set)
 *          PIN slot       — key derived from the PIN with PBKDF2-HMAC-SHA-256
 *          biometric slot — key derived from a WebAuthn PRF secret (platform authenticator)
 */

/** OWASP recommendation for PBKDF2-HMAC-SHA-256 (2023). */
export const PBKDF2_ITERATIONS = 600_000;

const AES = { name: 'AES-GCM', length: 256 } as const;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type Bytes = Uint8Array<ArrayBuffer>;

export function cryptoAvailable(): boolean {
  return typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.subtle !== 'undefined';
}

export function randomBytes(length: number): Bytes {
  return crypto.getRandomValues(new Uint8Array(length));
}

export interface Sealed {
  iv: Bytes;
  ciphertext: Bytes;
}

/** The key that encrypts the data. Extractable only so that it can be wrapped into key slots. */
export function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(AES, true, ['encrypt', 'decrypt']);
}

/** Key-encryption key that never leaves the browser's key store (cannot be exported by scripts). */
export function generateDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(AES, false, ['wrapKey', 'unwrapKey']);
}

export async function deriveKeyFromPin(pin: string, salt: Bytes, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(pin.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, AES, false, [
    'wrapKey',
    'unwrapKey',
  ]);
}

/** Turns a high-entropy secret (WebAuthn PRF output) into a key-encryption key. */
export async function deriveKeyFromSecret(secret: BufferSource, salt: Bytes): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: encoder.encode('cyclecare/biometric-slot/v1') },
    material,
    AES,
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

export async function wrapDataKey(dataKey: CryptoKey, kek: CryptoKey): Promise<Sealed> {
  const iv = randomBytes(12);
  const wrapped = await crypto.subtle.wrapKey('raw', dataKey, kek, { name: 'AES-GCM', iv });
  return { iv, ciphertext: new Uint8Array(wrapped) };
}

/** Rejects (OperationError) when the key-encryption key is wrong — that is how a wrong PIN is detected. */
export function unwrapDataKey(sealed: Sealed, kek: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey('raw', sealed.ciphertext, kek, { name: 'AES-GCM', iv: sealed.iv }, AES, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptJSON(key: CryptoKey, value: unknown, context: string): Promise<Sealed> {
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(context) },
    key,
    encoder.encode(JSON.stringify(value)),
  );
  return { iv, ciphertext: new Uint8Array(ciphertext) };
}

export async function decryptJSON<T>(key: CryptoKey, sealed: Sealed, context: string): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: sealed.iv, additionalData: encoder.encode(context) },
    key,
    sealed.ciphertext,
  );
  return JSON.parse(decoder.decode(plain)) as T;
}
