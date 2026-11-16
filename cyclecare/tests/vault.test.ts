import { describe, expect, it } from 'vitest';
import { randomBytes } from '../src/storage/crypto';
import { memoryStore } from '../src/storage/kv';
import { FREE_ATTEMPTS, Vault, pauseAfter } from '../src/storage/vault';
import { exportBackup, parseBackup, sanitizeAppData } from '../src/storage/backup';
import { emptyAppData, type AppData } from '../src/domain/types';
import { updateDay } from '../src/domain/journal';
import { NOW } from './helpers';

const FAST = { pinIterations: 1000 };

function sample(): AppData {
  const data = emptyAppData();
  data.profile.typicalCycleLength = 29;
  data.logs = updateDay({}, '2026-11-01', { flow: 'heavy', symptoms: { cramps: 3 }, note: 'Crampe puternice dimineața' }, NOW);
  return data;
}
const bytesOf = (value: unknown) => new TextDecoder('latin1').decode(value as Uint8Array);

describe('vault', () => {
  it('encrypts the journal at rest and reopens it with the device key', async () => {
    const store = memoryStore();
    const vault = await Vault.open(store, FAST);
    expect(vault.exists).toBe(false);
    await vault.create(sample());
    expect(vault.unlocked).toBe(true);

    const onDisk = await store.get<{ iv: Uint8Array; ciphertext: Uint8Array }>('vault');
    expect(onDisk!.iv).toHaveLength(12);
    expect(bytesOf(onDisk!.ciphertext)).not.toContain('Crampe');
    expect(bytesOf(onDisk!.ciphertext)).not.toContain('cramps');
    expect(JSON.stringify(await store.get('meta'))).not.toContain('cramps');
    const deviceKey = await store.get<CryptoKey>('deviceKey');
    expect(deviceKey!.extractable).toBe(false);

    const reopened = await Vault.open(store, FAST);
    expect(reopened.exists).toBe(true);
    expect(reopened.unlocked).toBe(false);
    const result = await reopened.unlockWithDevice();
    expect(result).toEqual({ ok: true, data: sample() });
  });

  it('uses a fresh nonce for every save', async () => {
    const store = memoryStore();
    const vault = await Vault.open(store, FAST);
    await vault.create(sample());
    const first = await store.get<{ iv: Uint8Array }>('vault');
    await vault.save(sample());
    const second = await store.get<{ iv: Uint8Array }>('vault');
    expect([...first!.iv]).not.toEqual([...second!.iv]);
  });

  it('requires the PIN once one is set, and deletes the device key', async () => {
    const store = memoryStore();
    const vault = await Vault.open(store, FAST);
    await vault.create(sample());
    await vault.setPin('271828');
    expect(vault.hasPin).toBe(true);
    expect(await store.get('deviceKey')).toBeUndefined();

    const reopened = await Vault.open(store, FAST);
    expect(await reopened.unlockWithDevice()).toEqual({ ok: false, reason: 'unavailable' });
    expect(await reopened.unlockWithPin('000000')).toEqual({ ok: false, reason: 'wrong_pin', attemptsLeft: FREE_ATTEMPTS - 1 });
    expect(reopened.unlocked).toBe(false);
    const ok = await reopened.unlockWithPin('271828');
    expect(ok).toEqual({ ok: true, data: sample() });
    expect(await reopened.verifyPin('271828')).toBe(true);
    expect(await reopened.verifyPin('111111')).toBe(false);
  });

  it('pauses PIN entry after repeated wrong attempts, across restarts', async () => {
    const store = memoryStore();
    const vault = await Vault.open(store, FAST);
    await vault.create(sample());
    await vault.setPin('1234');
    vault.lock();
    const t0 = 1_000_000;
    for (let i = 1; i < FREE_ATTEMPTS; i++) {
      expect(await vault.unlockWithPin('0000', t0)).toMatchObject({ ok: false, reason: 'wrong_pin', attemptsLeft: FREE_ATTEMPTS - i });
    }
    expect(await vault.unlockWithPin('0000', t0)).toEqual({ ok: false, reason: 'paused', retryAfter: t0 + 30_000 });

    const restarted = await Vault.open(store, FAST);
    // Even the right PIN has to wait.
    expect(await restarted.unlockWithPin('1234', t0 + 10_000)).toEqual({ ok: false, reason: 'paused', retryAfter: t0 + 30_000 });
    expect(await restarted.unlockWithPin('0000', t0 + 31_000)).toEqual({ ok: false, reason: 'paused', retryAfter: t0 + 31_000 + 60_000 });
    expect((await restarted.unlockWithPin('1234', t0 + 200_000)).ok).toBe(true);
    restarted.lock();
    // The counter is reset by a successful unlock.
    expect(await restarted.unlockWithPin('0000', t0 + 300_000)).toMatchObject({ reason: 'wrong_pin', attemptsLeft: FREE_ATTEMPTS - 1 });
    expect(pauseAfter(4)).toBe(0);
    expect(pauseAfter(50)).toBe(900_000);
  });

  it('changes and removes the PIN', async () => {
    const store = memoryStore();
    const vault = await Vault.open(store, FAST);
    await vault.create(sample());
    await vault.setPin('1111');
    await vault.setPin('2222');
    vault.lock();
    expect((await vault.unlockWithPin('1111')).ok).toBe(false);
    expect((await vault.unlockWithPin('2222')).ok).toBe(true);
    await vault.removePin();
    expect(vault.hasPin).toBe(false);
    const reopened = await Vault.open(store, FAST);
    expect((await reopened.unlockWithDevice()).ok).toBe(true);
  });

  it('adds a biometric slot next to the PIN and unlocks with its secret', async () => {
    const store = memoryStore();
    const vault = await Vault.open(store, FAST);
    await vault.create(sample());
    const secret = randomBytes(32);
    await expect(vault.addBiometric(randomBytes(16), randomBytes(32), secret)).rejects.toThrow(/PIN/);
    await vault.setPin('1234');
    await vault.addBiometric(randomBytes(16), randomBytes(32), secret);
    expect(vault.biometric).toBeDefined();

    const reopened = await Vault.open(store, FAST);
    expect(await reopened.unlockWithBiometricSecret(randomBytes(32))).toEqual({ ok: false, reason: 'unavailable' });
    expect(await reopened.unlockWithBiometricSecret(secret)).toEqual({ ok: true, data: sample() });
    // Changing the PIN keeps biometrics; removing the PIN removes both.
    await reopened.setPin('9999');
    expect(reopened.biometric).toBeDefined();
    await reopened.removePin();
    expect(reopened.biometric).toBeUndefined();
  });

  it('refuses to save while locked', async () => {
    const vault = await Vault.open(memoryStore(), FAST);
    await vault.create(sample());
    vault.lock();
    await expect(vault.save(sample())).rejects.toThrow(/locked/);
  });

  it('deletes everything on request', async () => {
    const store = memoryStore();
    const vault = await Vault.open(store, FAST);
    await vault.create(sample());
    await vault.setPin('1234');
    await vault.destroy();
    expect(vault.exists).toBe(false);
    expect(await store.get('vault')).toBeUndefined();
    expect(await store.get('meta')).toBeUndefined();
    expect((await Vault.open(store, FAST)).exists).toBe(false);
  });
});

describe('journal edits', () => {
  it('removes cleared fields and deletes days left empty', () => {
    let logs = updateDay({}, '2026-11-01', { flow: 'light', note: '  ceva  ' }, NOW);
    expect(logs['2026-11-01']).toEqual({ date: '2026-11-01', flow: 'light', note: 'ceva', updatedAt: NOW });
    logs = updateDay(logs, '2026-11-01', { note: '' }, NOW);
    expect(logs['2026-11-01']).toEqual({ date: '2026-11-01', flow: 'light', updatedAt: NOW });
    logs = updateDay(logs, '2026-11-01', { flow: undefined, symptoms: {} }, NOW);
    expect(logs).toEqual({});
  });
});

describe('backup', () => {
  it('round-trips the data', () => {
    const data = sample();
    const result = parseBackup(exportBackup(data, new Date(NOW)), NOW);
    expect(result).toEqual({ ok: true, data });
  });

  it('rejects files that are not CycleCare backups', () => {
    expect(parseBackup('nope', NOW)).toEqual({ ok: false, error: 'not_json' });
    expect(parseBackup('{"hello":1}', NOW)).toEqual({ ok: false, error: 'not_cyclecare' });
    expect(parseBackup('{"app":"CycleCare","format":99,"data":{}}', NOW)).toEqual({ ok: false, error: 'unsupported_version' });
  });

  it('drops anything invalid or unknown from an imported file', () => {
    const data = sanitizeAppData(
      {
        profile: { goals: ['conception', 'world-domination'], typicalCycleLength: 400, typicalPeriodLength: 4, showFertility: false },
        logs: {
          '2026-11-01': {
            flow: 'heavy',
            symptoms: { cramps: 9, headache: 2, hacking: 3 },
            mood: 7,
            energy: 3,
            note: 'x'.repeat(5000),
            __proto__: { polluted: true },
          },
          '2026-13-45': { flow: 'light' },
          '2026-11-02': { flow: 'tsunami', bbt: { celsius: 99 } },
          '2026-11-03': { bbt: { celsius: 36.456, source: 'import', device: 'Ring' }, mucus: 'creamy' },
        },
        reminders: {
          discreet: false,
          period: { enabled: true, daysBefore: 99, time: '25:00' },
          medications: [{ id: 'a', name: 'Pilula', time: '21:00', weekdays: [0, 0, 9] }, { name: 'fără id' }],
        },
        dismissedFlags: { low_mood: '2026-11-01', bad: 'yesterday' },
        extra: 'ignored',
      },
      NOW,
    );
    expect(data.profile).toEqual({ goals: ['conception'], typicalCycleLength: undefined, typicalPeriodLength: 4, showFertility: false });
    expect(Object.keys(data.logs)).toEqual(['2026-11-01', '2026-11-03']);
    expect(data.logs['2026-11-01']).toMatchObject({ flow: 'heavy', symptoms: { headache: 2 }, energy: 3 });
    expect(data.logs['2026-11-01']!.mood).toBeUndefined();
    expect(data.logs['2026-11-01']!.note).toHaveLength(2000);
    expect(data.logs['2026-11-03']).toMatchObject({ bbt: { celsius: 36.46, source: 'import', device: 'Ring' }, mucus: 'creamy' });
    expect(data.reminders.period).toEqual({ enabled: true, daysBefore: 2, time: '09:00', repeatDaily: false });
    expect(data.reminders.medications).toEqual([{ id: 'a', name: 'Pilula', time: '21:00', weekdays: [0], enabled: true }]);
    expect(data.dismissedFlags).toEqual({ low_mood: '2026-11-01' });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(sanitizeAppData('garbage', NOW)).toEqual(emptyAppData());
  });
});
