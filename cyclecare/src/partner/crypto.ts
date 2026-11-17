import { decryptJSON, encryptJSON, randomBytes, type Bytes } from '../storage/crypto';

/**
 * Cryptography of Partner mode (WebCrypto only).
 *
 * Pairing. The owner's device shows a 6-character code. Both devices create an ECDH (P-256) key
 * pair and exchange public keys through the relay under that code; each derives the same AES key
 * with HKDF. The owner's device sends the channel credentials sealed with that key. Since the relay
 * passes the public keys along, both screens show 6 verification digits computed from the two keys:
 * if they match, nobody sat in between. The owner approves only then.
 *
 * Sharing. The summary is sealed with AES-256-GCM under a 256-bit key that only the two devices
 * have, bound to the channel id. The relay stores ciphertext and nothing else.
 */

const encoder = new TextEncoder();
/** 32 characters without the look-alikes I, O, 0 and 1; 256 is a multiple of 32, so there is no bias. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAIRING_INFO = 'cyclecare/partner-pairing/v1';

export function toB64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64Url(text: string): Bytes {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function generatePairingCode(): string {
  return Array.from(randomBytes(6), (byte) => CODE_ALPHABET[byte % 32]).join('');
}

/** What people type: spaces, dashes and lower case are fine. (The code never contains I, O, 0 or 1.) */
export function normalizePairingCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

export const isPairingCode = (code: string): boolean => /^[A-HJ-NP-Z2-9]{6}$/.test(code);

/** Credentials of a new channel: 128-bit id, 256-bit data key, 256-bit write token. */
export function newChannelSecrets(): { channelId: string; dataKey: string; writeToken: string } {
  return { channelId: toB64Url(randomBytes(16)), dataKey: toB64Url(randomBytes(32)), writeToken: toB64Url(randomBytes(32)) };
}

export interface EcdhPair {
  privateKey: CryptoKey;
  /** Raw public key, base64url. */
  publicKey: string;
}

export async function generateEcdhPair(): Promise<EcdhPair> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { privateKey: pair.privateKey, publicKey: toB64Url(raw) };
}

/** The AES key both devices arrive at from their own private key and the other's public key. */
export async function derivePairingKey(own: CryptoKey, peerPublicKey: string, code: string): Promise<CryptoKey> {
  const peer = await crypto.subtle.importKey('raw', fromB64Url(peerPublicKey), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: peer }, own, 256);
  const material = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode(code), info: encoder.encode(PAIRING_INFO) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Six digits both screens show, e.g. "482 913". Different keys give different digits. */
export async function verificationDigits(code: string, ownerPub: string, partnerPub: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(`${PAIRING_INFO}|${code}|${ownerPub}|${partnerPub}`)));
  const n = ((digest[0]! << 24) | (digest[1]! << 16) | (digest[2]! << 8) | digest[3]!) >>> 0;
  const digits = String(n % 1_000_000).padStart(6, '0');
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export interface SealedText {
  iv: string;
  ct: string;
}

export async function sealJSON(key: CryptoKey, value: unknown, context: string): Promise<SealedText> {
  const sealed = await encryptJSON(key, value, context);
  return { iv: toB64Url(sealed.iv), ct: toB64Url(sealed.ciphertext) };
}

/** Rejects when the key is wrong or the ciphertext was changed. */
export function openJSON<T>(key: CryptoKey, sealed: SealedText, context: string): Promise<T> {
  return decryptJSON<T>(key, { iv: fromB64Url(sealed.iv), ciphertext: fromB64Url(sealed.ct) }, context);
}

export function importDataKey(dataKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromB64Url(dataKey), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Binds a summary to its channel, so it cannot be replayed into another one. */
export const snapshotContext = (channelId: string) => `cyclecare/partner-snapshot/v1|${channelId}`;
export const pairingContext = (code: string) => `${PAIRING_INFO}|credentials|${code}`;

/** SHA-256 of a token, hex: the relay keeps this, never the token itself. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const newToken = (): string => toB64Url(randomBytes(24));
