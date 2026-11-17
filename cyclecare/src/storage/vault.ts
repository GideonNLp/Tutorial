import type { AppData } from '../domain/types';
import {
  PBKDF2_ITERATIONS,
  decryptJSON,
  deriveKeyFromPin,
  deriveKeyFromSecret,
  encryptJSON,
  generateDataKey,
  generateDeviceKey,
  randomBytes,
  unwrapDataKey,
  wrapDataKey,
  type Bytes,
  type Sealed,
} from './crypto';
import type { KVStore } from './kv';

/**
 * The encrypted vault. On disk there are only three things:
 *   meta      — which key slots exist (salts, wrapped data key) and the failed-PIN counter; no health data
 *   deviceKey — a non-extractable CryptoKey, present only while no PIN is set
 *   vault     — the journal, AES-256-GCM encrypted with the data key
 * The data key exists unwrapped only in memory, between unlock and lock.
 */

const META = 'meta';
const DATA = 'vault';
const DEVICE_KEY = 'deviceKey';
const CONTEXT = 'cyclecare/vault/v1';

export type KeySlot =
  | ({ type: 'device' } & Sealed)
  | ({ type: 'pin'; salt: Bytes; iterations: number } & Sealed)
  | ({ type: 'biometric'; credentialId: Bytes; prfSalt: Bytes } & Sealed);

export interface VaultMeta {
  version: 1;
  createdAt: string;
  slots: KeySlot[];
  failedAttempts: number;
  /** Epoch milliseconds until which PIN entry is paused. */
  retryAfter: number;
}

export type UnlockResult =
  | { ok: true; data: AppData }
  | { ok: false; reason: 'wrong_pin'; attemptsLeft: number }
  | { ok: false; reason: 'paused'; retryAfter: number }
  | { ok: false; reason: 'unavailable' };

/** Wrong PINs allowed before entry is paused. */
export const FREE_ATTEMPTS = 5;
const PAUSES_MS = [30_000, 60_000, 120_000, 300_000, 900_000];

/**
 * Pause after the n-th consecutive wrong PIN. This only slows down someone holding the unlocked
 * phone; it is enforced by the app itself. A native build should let the secure hardware
 * (Secure Enclave / StrongBox) enforce attempt limits.
 */
export function pauseAfter(failures: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  return PAUSES_MS[Math.min(failures - FREE_ATTEMPTS, PAUSES_MS.length - 1)]!;
}

export interface VaultOptions {
  /** Lowered in tests only. */
  pinIterations?: number;
}

export class Vault {
  private meta: VaultMeta | undefined;
  private dataKey: CryptoKey | undefined;

  private constructor(
    private readonly store: KVStore,
    private readonly options: VaultOptions,
  ) {}

  static async open(store: KVStore, options: VaultOptions = {}): Promise<Vault> {
    const vault = new Vault(store, options);
    vault.meta = await store.get<VaultMeta>(META);
    return vault;
  }

  get exists(): boolean {
    return this.meta !== undefined;
  }
  get unlocked(): boolean {
    return this.dataKey !== undefined;
  }
  get persistent(): boolean {
    return this.store.persistent;
  }
  get hasPin(): boolean {
    return this.slot('pin') !== undefined;
  }
  get biometric(): Extract<KeySlot, { type: 'biometric' }> | undefined {
    return this.slot('biometric');
  }
  get retryAfter(): number {
    return this.meta?.retryAfter ?? 0;
  }

  private slot<T extends KeySlot['type']>(type: T): Extract<KeySlot, { type: T }> | undefined {
    return this.meta?.slots.find((s) => s.type === type) as Extract<KeySlot, { type: T }> | undefined;
  }

  private requireKey(): CryptoKey {
    if (!this.dataKey) throw new Error('Vault is locked');
    return this.dataKey;
  }

  private async persistMeta(): Promise<void> {
    await this.store.set(META, this.meta);
  }

  /** Creates a new vault protected by a device-bound key (no PIN yet). */
  async create(data: AppData): Promise<void> {
    const dataKey = await generateDataKey();
    const deviceKey = await generateDeviceKey();
    const sealed = await wrapDataKey(dataKey, deviceKey);
    this.dataKey = dataKey;
    this.meta = {
      version: 1,
      createdAt: new Date().toISOString(),
      slots: [{ type: 'device', ...sealed }],
      failedAttempts: 0,
      retryAfter: 0,
    };
    await this.store.set(DEVICE_KEY, deviceKey);
    await this.save(data);
    await this.persistMeta(); // last, so an interrupted creation never leaves a half-made vault
  }

  private async openWith(kek: CryptoKey, slot: Sealed): Promise<AppData> {
    const dataKey = await unwrapDataKey(slot, kek);
    const sealed = await this.store.get<Sealed>(DATA);
    if (!sealed) throw new Error('Vault data missing');
    const data = await decryptJSON<AppData>(dataKey, sealed, CONTEXT);
    this.dataKey = dataKey;
    return data;
  }

  /** Unlocks without interaction. Only possible while no PIN is set. */
  async unlockWithDevice(): Promise<UnlockResult> {
    const slot = this.slot('device');
    const deviceKey = await this.store.get<CryptoKey>(DEVICE_KEY);
    if (!slot || !deviceKey) return { ok: false, reason: 'unavailable' };
    try {
      return { ok: true, data: await this.openWith(deviceKey, slot) };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  }

  async unlockWithPin(pin: string, now = Date.now()): Promise<UnlockResult> {
    const slot = this.slot('pin');
    if (!slot || !this.meta) return { ok: false, reason: 'unavailable' };
    if (now < this.meta.retryAfter) return { ok: false, reason: 'paused', retryAfter: this.meta.retryAfter };

    const kek = await deriveKeyFromPin(pin, slot.salt, slot.iterations);
    let data: AppData;
    try {
      data = await this.openWith(kek, slot);
    } catch {
      this.meta.failedAttempts += 1;
      const pause = pauseAfter(this.meta.failedAttempts);
      this.meta.retryAfter = pause ? now + pause : 0;
      await this.persistMeta();
      return pause
        ? { ok: false, reason: 'paused', retryAfter: this.meta.retryAfter }
        : { ok: false, reason: 'wrong_pin', attemptsLeft: FREE_ATTEMPTS - this.meta.failedAttempts };
    }
    if (this.meta.failedAttempts !== 0 || this.meta.retryAfter !== 0) {
      this.meta.failedAttempts = 0;
      this.meta.retryAfter = 0;
      await this.persistMeta();
    }
    return { ok: true, data };
  }

  /** `secret` is the WebAuthn PRF output for the stored credential and salt. */
  async unlockWithBiometricSecret(secret: BufferSource): Promise<UnlockResult> {
    const slot = this.slot('biometric');
    if (!slot) return { ok: false, reason: 'unavailable' };
    try {
      const kek = await deriveKeyFromSecret(secret, slot.prfSalt);
      return { ok: true, data: await this.openWith(kek, slot) };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  }

  /** Forgets the data key. The decrypted journal must be dropped by the caller as well. */
  lock(): void {
    this.dataKey = undefined;
  }

  async save(data: AppData): Promise<void> {
    await this.store.set(DATA, await encryptJSON(this.requireKey(), data, CONTEXT));
  }

  /** Checks a PIN without changing the lock state or the failed-attempt counter. */
  async verifyPin(pin: string): Promise<boolean> {
    const slot = this.slot('pin');
    if (!slot) return false;
    try {
      await unwrapDataKey(slot, await deriveKeyFromPin(pin, slot.salt, slot.iterations));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sets or changes the PIN. From then on the data key can only be recovered with the PIN
   * (or biometrics): the device-bound key is deleted.
   */
  async setPin(pin: string): Promise<void> {
    const dataKey = this.requireKey();
    const salt = randomBytes(16);
    const iterations = this.options.pinIterations ?? PBKDF2_ITERATIONS;
    const sealed = await wrapDataKey(dataKey, await deriveKeyFromPin(pin, salt, iterations));
    const meta = this.meta!;
    meta.slots = [...meta.slots.filter((s) => s.type === 'biometric'), { type: 'pin', salt, iterations, ...sealed }];
    meta.failedAttempts = 0;
    meta.retryAfter = 0;
    await this.persistMeta();
    await this.store.delete(DEVICE_KEY);
  }

  /** Removes the PIN and biometrics; the vault goes back to a device-bound key. */
  async removePin(): Promise<void> {
    const dataKey = this.requireKey();
    const deviceKey = await generateDeviceKey();
    const sealed = await wrapDataKey(dataKey, deviceKey);
    await this.store.set(DEVICE_KEY, deviceKey);
    this.meta!.slots = [{ type: 'device', ...sealed }];
    await this.persistMeta();
  }

  async addBiometric(credentialId: Bytes, prfSalt: Bytes, secret: BufferSource): Promise<void> {
    const dataKey = this.requireKey();
    if (!this.hasPin) throw new Error('A PIN is required before enabling biometrics');
    const sealed = await wrapDataKey(dataKey, await deriveKeyFromSecret(secret, prfSalt));
    const meta = this.meta!;
    meta.slots = [...meta.slots.filter((s) => s.type !== 'biometric'), { type: 'biometric', credentialId, prfSalt, ...sealed }];
    await this.persistMeta();
  }

  async removeBiometric(): Promise<void> {
    if (!this.meta) return;
    this.meta.slots = this.meta.slots.filter((s) => s.type !== 'biometric');
    await this.persistMeta();
  }

  /** Deletes everything this app stored: keys, journal, counters. Cannot be undone. */
  async destroy(): Promise<void> {
    await this.store.clear();
    this.meta = undefined;
    this.dataKey = undefined;
  }
}
