import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays } from '../src/domain/dates';
import { buildPartnerSnapshot, readPartnerSnapshot, type PartnerSnapshot } from '../src/domain/partner';
import { buildTimeline } from '../src/domain/prediction';
import { emptyAppData, type AppData, type PartnerPermissions, type PartnerShare } from '../src/domain/types';
import {
  derivePairingKey,
  fromB64Url,
  generateEcdhPair,
  generatePairingCode,
  importDataKey,
  isPairingCode,
  newChannelSecrets,
  normalizePairingCode,
  openJSON,
  sealJSON,
  snapshotContext,
  toB64Url,
  verificationDigits,
} from '../src/partner/crypto';
import {
  approvePairing,
  checkPairing,
  closePairing,
  collectCredentials,
  deleteShare,
  fetchSnapshot,
  joinPairing,
  openPairing,
  pushSnapshot,
} from '../src/partner/flows';
import { handleRelay, memoryRelayStore } from '../server/relay';
import { sampleJournal } from './fixtures/sampleJournal';
import { NOW } from './helpers';

const TODAY = '2026-11-15';

describe('partner cryptography', () => {
  it('encodes bytes as URL-safe base64 and back', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(toB64Url(bytes)).not.toMatch(/[+/=]/);
    expect([...fromB64Url(toB64Url(bytes))]).toEqual([...bytes]);
  });

  it('makes 6-character codes without look-alike characters, and reads what people type', () => {
    for (let i = 0; i < 200; i++) expect(isPairingCode(generatePairingCode())).toBe(true);
    expect(normalizePairingCode(' k7q-2mx ')).toBe('K7Q2MX');
    expect(isPairingCode('K7Q2M0')).toBe(false); // 0 is never used
  });

  it('gives both devices the same key and the same digits; another key gives other digits', async () => {
    const owner = await generateEcdhPair();
    const partner = await generateEcdhPair();
    const intruder = await generateEcdhPair();
    const a = await derivePairingKey(owner.privateKey, partner.publicKey, 'K7Q2MX');
    const b = await derivePairingKey(partner.privateKey, owner.publicKey, 'K7Q2MX');
    const sealed = await sealJSON(a, { hello: 'partener' }, 'ctx');
    expect(await openJSON(b, sealed, 'ctx')).toEqual({ hello: 'partener' });

    const digits = await verificationDigits('K7Q2MX', owner.publicKey, partner.publicKey);
    expect(digits).toMatch(/^\d{3} \d{3}$/);
    expect(await verificationDigits('K7Q2MX', owner.publicKey, partner.publicKey)).toBe(digits);
    expect(await verificationDigits('K7Q2MX', owner.publicKey, intruder.publicKey)).not.toBe(digits);
  });

  it('binds a summary to its channel', async () => {
    const { channelId, dataKey } = newChannelSecrets();
    expect(channelId).toHaveLength(22);
    const key = await importDataKey(dataKey);
    const sealed = await sealJSON(key, { a: 1 }, snapshotContext(channelId));
    await expect(openJSON(key, sealed, snapshotContext('AAAAAAAAAAAAAAAAAAAAAA'))).rejects.toThrow();
  });
});

// ---- Summary ------------------------------------------------------------------------------

function ownerData(permissions: Partial<PartnerPermissions> = {}, showFertility = true): AppData {
  const { logs, profile } = sampleJournal(TODAY, NOW);
  const data = emptyAppData();
  data.logs = logs;
  data.profile = { ...profile, showFertility };
  data.user = { nickname: 'Ana', photo: 'data:image/jpeg;base64,AAAA' };
  data.partner.permissions = { ...data.partner.permissions, ...permissions };
  // Things that must never reach the partner.
  data.logs[TODAY] = {
    ...data.logs[TODAY]!,
    note: 'Notă privată',
    intimacy: { activities: ['vaginal'], protection: ['condom'] },
    bbt: { celsius: 36.4, source: 'manual' },
    mucus: 'creamy',
  };
  return data;
}
const snapshotOf = (data: AppData) => buildPartnerSnapshot(data, buildTimeline(data.logs, data.profile, TODAY), NOW);

describe('partner summary', () => {
  it('with everything allowed: phase, calendar, the last two weeks and the notes', () => {
    const s = snapshotOf(ownerData());
    expect(s).toMatchObject({ v: 1, today: TODAY, name: 'Ana', permissions: { phase: true, calendar: true, journal: true, notes: true } });
    expect(s.cycle).toMatchObject({ phase: 'follicular', cycleDay: 12, status: 'on_track' });
    expect(s.cycle!.daysUntil).toBeGreaterThan(10);
    expect(s.calendar).toHaveLength(42 + 84 + 1);
    expect(s.calendar!.some((d) => d.fertile)).toBe(true);
    expect(s.calendar!.some((d) => d.period === 'logged')).toBe(true);
    expect(s.journal![0]).toMatchObject({ date: TODAY, note: 'Notă privată' });
    expect(s.journal!.every((d) => d.date >= addDays(TODAY, -13))).toBe(true);
  });

  it('never carries intimate contacts, temperature, cervical mucus or the profile picture', () => {
    const text = JSON.stringify(snapshotOf(ownerData()));
    for (const word of ['intimacy', 'vaginal', 'condom', 'bbt', 'celsius', 'mucus', 'creamy', 'photo', 'base64']) expect(text).not.toContain(word);
  });

  it('leaves out each part that is switched off', () => {
    const none = snapshotOf(ownerData({ phase: false, calendar: false, journal: false }));
    expect(none.cycle).toBeUndefined();
    expect(none.calendar).toBeUndefined();
    expect(none.journal).toBeUndefined();
    expect(none.permissions.notes).toBe(false); // notes need the journal

    const noNotes = snapshotOf(ownerData({ notes: false }));
    expect(noNotes.journal!.some((d) => d.note)).toBe(false);
    expect(JSON.stringify(noNotes)).not.toContain('Notă privată');
  });

  it('with fertility estimates off, shows only periods: no fertile days, no other phases', () => {
    const s = snapshotOf(ownerData({}, false));
    expect(s.showFertility).toBe(false);
    expect(s.calendar!.some((d) => d.fertile || d.ovulation)).toBe(false);
    expect(new Set(s.calendar!.map((d) => d.phase).filter(Boolean))).toEqual(new Set(['menstruation']));
    expect(s.cycle!.phase).toBeUndefined();
  });

  it('is read back as sent, and anything unexpected or not allowed is dropped', () => {
    const s = snapshotOf(ownerData());
    expect(readPartnerSnapshot(JSON.parse(JSON.stringify(s)))).toEqual(s);
    const tampered = {
      ...s,
      permissions: { ...s.permissions, notes: false },
      journal: [...s.journal!, { date: 'yesterday', mood: 3 }, { date: TODAY, mood: 9, symptoms: { cramps: 7, hacking: 2 } }],
      cycle: { ...s.cycle, phase: 'party' },
      extra: 'ignored',
    };
    const read = readPartnerSnapshot(tampered)!;
    expect(read.journal!.some((d) => d.note)).toBe(false);
    expect(read.journal!.at(-1)).toEqual({ date: TODAY });
    expect(read.cycle!.phase).toBeUndefined();
    expect(read).not.toHaveProperty('extra');
    expect(readPartnerSnapshot({ v: 2 })).toBeUndefined();
    expect(readPartnerSnapshot('nonsense')).toBeUndefined();
  });
});

// ---- Two devices through the relay --------------------------------------------------------

describe('pairing and sharing through the relay', () => {
  let store: ReturnType<typeof memoryRelayStore>;
  beforeEach(() => {
    store = memoryRelayStore();
    vi.stubGlobal('fetch', (input: string, init?: RequestInit) => handleRelay(new Request(`http://relay.test${input}`, init), store));
  });
  afterEach(() => vi.unstubAllGlobals());

  async function pair() {
    const opened = await openPairing();
    if (!opened.ok) throw new Error(opened.reason);
    const owner = opened.value;
    const joined = await joinPairing(owner.code);
    if (!joined.ok) throw new Error(joined.reason);
    return { owner, partner: joined.value };
  }

  it('pairs two devices with matching digits and hands over the channel only after approval', async () => {
    const { owner, partner } = await pair();
    const seen = await checkPairing(owner);
    expect(seen.ok && seen.value?.digits).toBe(partner.digits);

    expect(await collectCredentials(partner)).toEqual({ ok: true, value: undefined }); // not approved yet
    const secrets = newChannelSecrets();
    expect((await approvePairing(owner, seen.ok ? seen.value!.partnerPub : '', secrets)).ok).toBe(true);
    expect(await collectCredentials(partner)).toEqual({ ok: true, value: { channelId: secrets.channelId, dataKey: secrets.dataKey } });

    await closePairing(owner);
    expect(await collectCredentials(partner)).toEqual({ ok: false, reason: 'not_found' });
  });

  it('a second device cannot take the place of the first, and a wrong code is not found', async () => {
    const { owner } = await pair();
    expect(await joinPairing(owner.code)).toEqual({ ok: false, reason: 'conflict' });
    expect(await joinPairing('ZZZZZZ')).toEqual({ ok: false, reason: 'not_found' });
  });

  it('credentials sealed for someone else cannot be opened', async () => {
    const { owner, partner } = await pair();
    const stranger = await generateEcdhPair();
    // The owner approves with a key that is not the partner's (what a relay in the middle would cause).
    await approvePairing(owner, stranger.publicKey, newChannelSecrets());
    expect(await collectCredentials(partner)).toEqual({ ok: false, reason: 'forbidden' });
  });

  it('the partner reads the latest summary, sees when nothing changed, and learns when access ends', async () => {
    const secrets = newChannelSecrets();
    const share: PartnerShare = { ...secrets, connectedAt: NOW };
    const view = { channelId: secrets.channelId, dataKey: secrets.dataKey };
    expect(await fetchSnapshot(view)).toEqual({ kind: 'revoked' }); // nothing shared yet

    const first: PartnerSnapshot = snapshotOf(ownerData());
    expect((await pushSnapshot(share, first)).ok).toBe(true);
    const got = await fetchSnapshot(view);
    expect(got.kind).toBe('updated');
    if (got.kind !== 'updated') return;
    expect(got.snapshot).toEqual(first);
    expect(await fetchSnapshot({ ...view, etag: got.etag })).toEqual({ kind: 'unchanged' });

    // What the relay holds is unreadable.
    const stored = JSON.stringify(await store.get(`channel:${secrets.channelId}`));
    // (Strings that cannot occur by chance in base64: quotes, diacritics, long words.)
    for (const word of ['"name"', '"Ana"', 'follicular', 'Notă privată', '"journal"']) expect(stored).not.toContain(word);

    // The wrong key reads nothing.
    expect(await fetchSnapshot({ ...view, dataKey: newChannelSecrets().dataKey })).toEqual({ kind: 'failed', reason: 'forbidden' });

    expect((await deleteShare(share)).ok).toBe(true);
    expect(await fetchSnapshot(view)).toEqual({ kind: 'revoked' });
  });

  it('reports being offline instead of throwing', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    expect(await openPairing()).toEqual({ ok: false, reason: 'offline' });
    expect(await fetchSnapshot({ channelId: 'AAAAAAAAAAAAAAAAAAAAAA', dataKey: newChannelSecrets().dataKey })).toEqual({
      kind: 'failed',
      reason: 'offline',
    });
  });
});

describe('backups and partner links', () => {
  it('a backup keeps the permissions but never the keys of a link', async () => {
    const { exportBackup, parseBackup } = await import('../src/storage/backup');
    const data = ownerData({ notes: false });
    data.partner.share = { ...newChannelSecrets(), connectedAt: NOW };
    const text = exportBackup(data, new Date(NOW));
    expect(text).not.toContain(data.partner.share.dataKey);
    expect(text).not.toContain(data.partner.share.writeToken);
    const restored = parseBackup(text, NOW);
    expect(restored.ok && restored.data.partner).toEqual({ permissions: { phase: true, calendar: true, journal: true, notes: false } });
  });
});
