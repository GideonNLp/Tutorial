import { readPartnerSnapshot, type PartnerSnapshot } from '../domain/partner';
import type { PartnerShare, PartnerView } from '../domain/types';
import { relay, type RelayFailure, type RelayResult } from './api';
import {
  derivePairingKey,
  generateEcdhPair,
  generatePairingCode,
  hashToken,
  importDataKey,
  newToken,
  openJSON,
  pairingContext,
  sealJSON,
  snapshotContext,
  verificationDigits,
  type EcdhPair,
} from './crypto';

/** What the owner's device shares through the sealed pairing message. */
export interface ChannelCredentials {
  channelId: string;
  dataKey: string;
}

// ---- Owner: invite, wait, verify, approve ---------------------------------------------------

export interface OwnerPairing {
  code: string;
  /** Proves to the relay that this device opened the pairing (approve, cancel). */
  token: string;
  keys: EcdhPair;
  expiresAt: number;
}

export async function openPairing(): Promise<RelayResult<OwnerPairing>> {
  // A code already in use elsewhere is simply replaced by another one.
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = generatePairingCode();
    const token = newToken();
    const keys = await generateEcdhPair();
    const res = await relay.createPairing(code, keys.publicKey, await hashToken(token));
    if (res.ok) return { ok: true, value: { code, token, keys, expiresAt: res.value.expiresAt } };
    if (res.reason !== 'conflict') return res;
  }
  return { ok: false, reason: 'server' };
}

/** Has someone entered the code? Then the digits to compare with their screen. */
export async function checkPairing(p: OwnerPairing): Promise<RelayResult<{ partnerPub: string; digits: string } | undefined>> {
  const res = await relay.getPairing(p.code);
  if (!res.ok) return res;
  const partnerPub = res.value.partnerPub;
  if (!partnerPub) return { ok: true, value: undefined };
  return { ok: true, value: { partnerPub, digits: await verificationDigits(p.code, p.keys.publicKey, partnerPub) } };
}

export async function approvePairing(p: OwnerPairing, partnerPub: string, credentials: ChannelCredentials): Promise<RelayResult<unknown>> {
  const key = await derivePairingKey(p.keys.privateKey, partnerPub, p.code);
  const payload = await sealJSON(key, credentials, pairingContext(p.code));
  return relay.approvePairing(p.code, p.token, payload);
}

export const closePairing = (p: OwnerPairing) => relay.deletePairing(p.code, p.token);

// ---- Partner: enter the code, show the digits, receive the credentials ----------------------

export interface PartnerJoin {
  code: string;
  keys: EcdhPair;
  ownerPub: string;
  digits: string;
}

export async function joinPairing(code: string): Promise<RelayResult<PartnerJoin>> {
  const record = await relay.getPairing(code);
  if (!record.ok) return record;
  if (record.value.partnerPub) return { ok: false, reason: 'conflict' };
  const keys = await generateEcdhPair();
  const joined = await relay.joinPairing(code, keys.publicKey);
  if (!joined.ok) return joined;
  const digits = await verificationDigits(code, record.value.ownerPub, keys.publicKey);
  return { ok: true, value: { code, keys, ownerPub: record.value.ownerPub, digits } };
}

/** `undefined` while the owner has not approved yet. `not_found`: cancelled or expired. */
export async function collectCredentials(join: PartnerJoin): Promise<RelayResult<ChannelCredentials | undefined>> {
  const record = await relay.getPairing(join.code);
  if (!record.ok) return record;
  if (record.value.partnerPub !== join.keys.publicKey) return { ok: false, reason: 'conflict' };
  if (!record.value.payload) return { ok: true, value: undefined };
  try {
    const key = await derivePairingKey(join.keys.privateKey, join.ownerPub, join.code);
    const credentials = await openJSON<ChannelCredentials>(key, record.value.payload, pairingContext(join.code));
    if (!/^[A-Za-z0-9_-]{22}$/.test(credentials.channelId) || !/^[A-Za-z0-9_-]{43}$/.test(credentials.dataKey)) {
      return { ok: false, reason: 'server' };
    }
    return { ok: true, value: { channelId: credentials.channelId, dataKey: credentials.dataKey } };
  } catch {
    // Sealed with another key: someone in between, or a corrupted message.
    return { ok: false, reason: 'forbidden' };
  }
}

// ---- Sharing --------------------------------------------------------------------------------

export async function pushSnapshot(share: PartnerShare, snapshot: PartnerSnapshot): Promise<RelayResult<unknown>> {
  const key = await importDataKey(share.dataKey);
  const sealed = await sealJSON(key, snapshot, snapshotContext(share.channelId));
  return relay.putChannel(share.channelId, share.writeToken, sealed);
}

export const deleteShare = (share: PartnerShare) => relay.deleteChannel(share.channelId, share.writeToken);

export type FetchOutcome =
  | { kind: 'unchanged' }
  | { kind: 'updated'; snapshot: PartnerSnapshot; etag: string }
  | { kind: 'revoked' }
  | { kind: 'failed'; reason: RelayFailure };

export async function fetchSnapshot(view: Pick<PartnerView, 'channelId' | 'dataKey' | 'etag'>): Promise<FetchOutcome> {
  const res = await relay.getChannel(view.channelId, view.etag);
  if (!res.ok) return res.reason === 'not_found' ? { kind: 'revoked' } : { kind: 'failed', reason: res.reason };
  if (!res.value) return { kind: 'unchanged' };
  try {
    const key = await importDataKey(view.dataKey);
    const snapshot = readPartnerSnapshot(await openJSON<unknown>(key, res.value, snapshotContext(view.channelId)));
    return snapshot ? { kind: 'updated', snapshot, etag: res.value.etag } : { kind: 'failed', reason: 'server' };
  } catch {
    return { kind: 'failed', reason: 'forbidden' };
  }
}
