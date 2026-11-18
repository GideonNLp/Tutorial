import { useMemo } from 'react';
import { content } from '../content';
import { addDays, diffDays, todayISO } from '../domain/dates';
import { buildTimeline, DEFAULT_PERIOD_LENGTH, type Timeline } from '../domain/prediction';
import {
  emptyAppData,
  type AppData,
  type Goal,
  type ISODate,
  type PartnerPermissions,
  type PartnerShare,
  type PartnerView,
  type UserProfile,
} from '../domain/types';
import { deviceLocale } from '../i18n';
import { generateRecoveryCode } from '../backup/crypto';
import { backupIdentity, deleteBackup } from '../backup/flows';
import { deleteShare } from '../partner/flows';
import { cryptoAvailable } from '../storage/crypto';
import { openBestStore } from '../storage/kv';
import { Vault, type UnlockResult } from '../storage/vault';
import { biometricSecret, registerBiometric } from '../storage/webauthn';
import { reportError } from './errors';
import { createStore, useStore } from './miniStore';
import { applyPrefs, clearPrefs, DEFAULT_PREFS, hasSavedLocale, loadPrefs, savePrefs, type Prefs } from './prefs';
import { resetRoute } from './router';
import { resetUi } from './ui';

/**
 * The running session: what is on screen (`status`), the decrypted journal while unlocked,
 * and the vault it is saved to. Screens read it through the hooks at the bottom and change it
 * only through the functions exported here.
 */
export type Status = 'loading' | 'onboarding' | 'locked' | 'ready' | 'broken';
/** `encrypted`: on this device, encrypted. `session`: encrypted but memory only. `plain`: no WebCrypto. */
export type StorageMode = 'encrypted' | 'session' | 'plain';

export interface AppState {
  status: Status;
  data: AppData | null;
  storage: StorageMode;
  hasPin: boolean;
  hasBiometric: boolean;
  today: ISODate;
  prefs: Prefs;
}

const store = createStore<AppState>({
  status: 'loading',
  data: null,
  storage: 'encrypted',
  hasPin: false,
  hasBiometric: false,
  today: todayISO(),
  // loadPrefs() never throws: in a sandboxed frame even *reading* `localStorage` raises a SecurityError.
  prefs: loadPrefs(),
});

let vault: Vault | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saveQueue: Promise<void> = Promise.resolve();

const patch = (partial: Partial<AppState>) => store.set((s) => ({ ...s, ...partial }));
const lockInfo = () => ({ hasPin: vault?.hasPin ?? false, hasBiometric: vault?.biometric !== undefined });

function withDefaults(data: AppData): AppData {
  const base = emptyAppData();
  return {
    ...base,
    ...data,
    profile: { ...base.profile, ...data.profile },
    partner: { ...base.partner, ...data.partner, permissions: { ...base.partner.permissions, ...data.partner?.permissions } },
    user: { ...base.user, ...data.user },
    reminders: { ...base.reminders, ...data.reminders },
  };
}

export async function initApp(): Promise<void> {
  applyPrefs(store.get().prefs);
  if (!cryptoAvailable()) {
    adoptDeviceLanguage();
    patch({ status: 'onboarding', storage: 'plain' });
    return;
  }
  const kv = await openBestStore();
  vault = await Vault.open(kv);
  const storage: StorageMode = kv.persistent ? 'encrypted' : 'session';
  if (!vault.exists) {
    adoptDeviceLanguage();
    patch({ status: 'onboarding', storage });
  } else if (vault.hasPin) {
    patch({ status: 'locked', storage, ...lockInfo() });
  } else {
    const result = await vault.unlockWithDevice();
    if (result.ok) patch({ status: 'ready', storage, data: withDefaults(result.data), ...lockInfo() });
    else patch({ status: 'broken', storage });
  }
}

/**
 * A first run speaks the device's language, if the app has it, and remembers it. Journals started
 * before English existed have no saved language and stay in Romanian (DEFAULT_LOCALE).
 */
function adoptDeviceLanguage(): void {
  if (!hasSavedLocale()) setPrefs({ locale: deviceLocale() });
}

// ---- Saving -----------------------------------------------------------------------------------

function persist(data: AppData): void {
  if (!vault) return;
  const target = vault;
  saveQueue = saveQueue.then(() => (target.unlocked ? target.save(data) : undefined)).catch((error) => reportError('save', error));
}

/** Writes pending changes now. Called before locking and when the page goes to the background. */
export function flush(): Promise<void> {
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    const data = store.get().data;
    if (data) persist(data);
  }
  return saveQueue;
}

/** Applies a change to the journal and saves it shortly after. `recipe` must not mutate its argument. */
export function update(recipe: (data: AppData) => AppData): void {
  const current = store.get().data;
  if (!current) return;
  const next = recipe(current);
  if (next === current) return;
  patch({ data: next });
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    persist(next);
  }, 250);
}

// ---- Onboarding -------------------------------------------------------------------------------

export interface OnboardingAnswers {
  nickname?: string;
  lastPeriodStart?: ISODate;
  cycleLength?: number;
  periodLength?: number;
  goals: Goal[];
  pin?: string;
  periodReminder: boolean;
}

export async function completeOnboarding(answers: OnboardingAnswers): Promise<void> {
  const now = new Date();
  const nowISO = now.toISOString();
  const today = todayISO(now);
  const data = emptyAppData();
  const legalVersion = content().legal.LEGAL_VERSION;
  data.onboardedAt = nowISO;
  data.consents = [
    { type: 'health_data_processing', textVersion: legalVersion, grantedAt: nowISO },
    { type: 'age_confirmation', textVersion: legalVersion, grantedAt: nowISO },
  ];

  if (answers.nickname) data.user = { nickname: answers.nickname };
  data.profile = {
    goals: answers.goals,
    typicalCycleLength: answers.cycleLength,
    typicalPeriodLength: answers.periodLength,
    showFertility: true,
    showIntimacy: true,
  };
  if (answers.lastPeriodStart) {
    // The declared period becomes journal entries without an intensity, up to today at most.
    const length = answers.periodLength ?? DEFAULT_PERIOD_LENGTH;
    const last = Math.min(length - 1, diffDays(today, answers.lastPeriodStart));
    for (let d = 0; d <= last; d++) {
      const date = addDays(answers.lastPeriodStart, d);
      data.logs[date] = { date, flow: 'unspecified', updatedAt: nowISO };
    }
  }
  if (answers.periodReminder) data.reminders.period.enabled = true;

  if (vault) {
    await vault.create(data);
    if (answers.pin) await vault.setPin(answers.pin);
  }
  resetUi();
  resetRoute();
  patch({ status: 'ready', data, today, ...lockInfo() });
}

// ---- Lock -------------------------------------------------------------------------------------

export async function lock(): Promise<void> {
  if (!vault?.hasPin || store.get().status !== 'ready') return;
  await flush();
  vault.lock();
  patch({ status: 'locked', data: null });
}

function afterUnlock(result: UnlockResult): UnlockResult {
  if (result.ok) patch({ status: 'ready', data: withDefaults(result.data), today: todayISO(), ...lockInfo() });
  return result;
}

export async function unlockWithPin(pin: string): Promise<UnlockResult> {
  if (!vault) return { ok: false, reason: 'unavailable' };
  return afterUnlock(await vault.unlockWithPin(pin));
}

export async function unlockWithBiometrics(): Promise<UnlockResult> {
  const slot = vault?.biometric;
  if (!vault || !slot) return { ok: false, reason: 'unavailable' };
  try {
    const secret = await biometricSecret(slot.credentialId, slot.prfSalt);
    return afterUnlock(await vault.unlockWithBiometricSecret(secret));
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export function pinRetryAfter(): number {
  return vault?.retryAfter ?? 0;
}

export async function setPin(pin: string): Promise<void> {
  if (!vault) throw new Error('Encrypted storage is not available');
  await flush();
  await vault.setPin(pin);
  patch(lockInfo());
}

export function verifyPin(pin: string): Promise<boolean> {
  return vault ? vault.verifyPin(pin) : Promise.resolve(false);
}

export async function removePin(): Promise<void> {
  if (!vault) return;
  await vault.removePin();
  patch(lockInfo());
}

export async function enableBiometrics(): Promise<boolean> {
  if (!vault?.hasPin) return false;
  try {
    const registration = await registerBiometric();
    await vault.addBiometric(registration.credentialId, registration.prfSalt, registration.secret);
    patch(lockInfo());
    return true;
  } catch {
    return false;
  }
}

export async function disableBiometrics(): Promise<void> {
  await vault?.removeBiometric();
  patch(lockInfo());
}

// ---- Whole-journal operations -----------------------------------------------------------------

/** Deletes keys, journal and preferences from this device and returns to the first screen. */
/**
 * Erases this device. `keepServerCopy`: leave the encrypted backup on the server. A forgotten PIN is
 * what the backup is for, so that path keeps it (the journal is locked then, so the code is out of
 * reach anyway); deleting everything, withdrawing consent and turning the backup off delete it.
 */
export async function wipeEverything(options: { keepServerCopy?: boolean } = {}): Promise<void> {
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = undefined;
  await saveQueue;
  const brief = (work: Promise<unknown>) => Promise.race([work, new Promise((r) => setTimeout(r, 3000))]);
  // A shared summary goes with the journal: ask the relay to delete it (briefly; offline it simply stays unreadable).
  const share = store.get().data?.partner.share ?? store.get().data?.partner.pendingRevoke;
  if (share) await brief(deleteShare({ ...share, dataKey: '', connectedAt: '' }));
  // So does the copy of the journal, unless the person is erasing the phone because they cannot open it.
  const backup = store.get().data?.backup;
  if (backup && !options.keepServerCopy) {
    const doomed = [...(backup.pendingDelete ?? [])];
    if (backup.auto) doomed.push(await backupIdentity(backup.code));
    await brief(Promise.all(doomed.map((c) => deleteBackup(c.id, c.token))));
  }
  await vault?.destroy();
  clearPrefs();
  applyPrefs(DEFAULT_PREFS);
  resetUi();
  resetRoute();
  patch({ status: 'onboarding', data: null, hasPin: false, hasBiometric: false, prefs: DEFAULT_PREFS, today: todayISO() });
}

/**
 * Replaces the journal (restore from a backup) but keeps this device's consent records.
 * A backup without a name or picture (an older one, for example) keeps the ones on this device.
 */
export function replaceJournal(incoming: AppData): void {
  update((current) => ({
    ...incoming,
    user: incoming.user.nickname || incoming.user.photo ? incoming.user : current.user,
    // A partner link belongs to this device: a restored file neither breaks nor replaces it.
    role: current.role,
    partner: { ...incoming.partner, share: current.partner.share },
    partnerView: current.partnerView,
    // The code and the state of the copy belong to this device and to no file.
    backup: current.backup,
    consents: current.consents,
    onboardedAt: current.onboardedAt,
  }));
}

/** Changes the name or picture; `undefined` removes that field. */
export function setUser(patch: Partial<Record<keyof UserProfile, string | undefined>>): void {
  update((d) => {
    const user: UserProfile = { ...d.user, ...patch };
    for (const key of Object.keys(user) as Array<keyof UserProfile>) if (!user[key]) delete user[key];
    return { ...d, user };
  });
}

// ---- Backup ----------------------------------------------------------------------------------

/** The recovery code of this journal: made the first time it is needed, and kept in the encrypted journal. */
export function ensureRecoveryCode(): string {
  const existing = store.get().data?.backup?.code;
  if (existing) return existing;
  const code = generateRecoveryCode();
  update((d) => ({ ...d, backup: { code, createdAt: new Date().toISOString() } }));
  // The person is about to write it down: it is on disk before they have finished.
  void flush();
  return code;
}

/** The person typed back a group of the code: it was written down. */
export function confirmRecoveryCode(): void {
  update((d) => (d.backup ? { ...d, backup: { ...d.backup, confirmed: true } } : d));
  void flush();
}

/**
 * A new code in place of the old one. If the copy on the server was on, a new copy is made under the new
 * code and the old one is deleted only once that exists, so there is never a moment with no copy.
 */
export async function replaceRecoveryCode(): Promise<string> {
  const old = store.get().data?.backup;
  const code = generateRecoveryCode();
  const stale = old?.auto ? await backupIdentity(old.code) : undefined;
  const now = new Date().toISOString();
  update((d) => ({
    ...d,
    backup: {
      code,
      createdAt: now,
      ...(old?.auto ? { auto: { since: old.auto.since } } : {}),
      ...(old?.pendingDelete || stale ? { pendingDelete: [...(old?.pendingDelete ?? []), ...(stale ? [stale] : [])] } : {}),
    },
  }));
  void flush();
  return code;
}

/** The person agreed to the encrypted copy on the server: from now on it is kept up to date (see backup/BackupSync). */
export function startAutoBackup(): void {
  const now = new Date().toISOString();
  update((d) =>
    d.backup
      ? {
          ...d,
          backup: { ...d.backup, auto: { since: now } },
          consents: [
            ...d.consents.filter((c) => c.type !== 'cloud_backup'),
            { type: 'cloud_backup', textVersion: content().legal.LEGAL_VERSION, grantedAt: now },
          ],
        }
      : d,
  );
}

/**
 * Turns the copy off and deletes what the server holds for this code: now, or as soon as the device is
 * back online. The code stays. Also for a phone that never turned the copy on but restored one: it
 * still has the code, so it can still delete what the code opens.
 */
export async function stopAutoBackup(): Promise<'deleted' | 'pending'> {
  const backup = store.get().data?.backup;
  if (!backup) return 'deleted';
  const identity = await backupIdentity(backup.code);
  update((d) => {
    if (!d.backup) return d;
    const { auto: _auto, ...rest } = d.backup;
    return {
      ...d,
      backup: { ...rest, pendingDelete: [...(rest.pendingDelete ?? []), identity] },
      consents: d.consents.filter((c) => c.type !== 'cloud_backup'),
    };
  });
  return (await retryPendingBackupDelete()) ? 'deleted' : 'pending';
}

/** What the last copy left on this device: the version it was, what it held, when. `undefined` fields are left as they were. */
export function updateAutoBackup(changes: Partial<NonNullable<NonNullable<AppData['backup']>['auto']>>): void {
  update((d) => (d.backup?.auto ? { ...d, backup: { ...d.backup, auto: { ...d.backup.auto, ...changes } } } : d));
}

/**
 * True once nothing is left to delete on the server. A copy replaced by a new code waits for the new
 * one to exist first, so a failed upload never leaves the person with no copy at all.
 */
export async function retryPendingBackupDelete(): Promise<boolean> {
  const backup = store.get().data?.backup;
  const pending = backup?.pendingDelete;
  if (!backup || !pending?.length) return true;
  if (backup.auto && !backup.auto.etag) return false;
  const gone: string[] = [];
  for (const copy of pending) {
    const res = await deleteBackup(copy.id, copy.token);
    if (res.ok || res.reason === 'not_found' || res.reason === 'forbidden') gone.push(copy.id);
  }
  update((d) => {
    if (!d.backup) return d;
    const left = (d.backup.pendingDelete ?? []).filter((c) => !gone.includes(c.id));
    const { pendingDelete: _p, ...rest } = d.backup;
    return { ...d, backup: left.length ? { ...rest, pendingDelete: left } : rest };
  });
  return gone.length === pending.length;
}

/**
 * Restores a journal from a copy (the server's or a file) onto a device that already has one.
 * A device without a code takes the one that opened the copy; a device that has one keeps it. When it
 * is the same code and the copy is the server's latest, the device now has that version, so its next
 * write is not taken for another phone's.
 */
export function restoreFromBackup(incoming: AppData, code: string, etag?: string): void {
  replaceJournal(incoming);
  update((d) => {
    if (!d.backup) return { ...d, backup: { code, createdAt: new Date().toISOString(), confirmed: true } };
    if (d.backup.code === code && d.backup.auto && etag) {
      const { taken: _t, ...auto } = d.backup.auto;
      return { ...d, backup: { ...d.backup, auto: { ...auto, etag } } };
    }
    return d;
  });
}

/** A new phone: a journal made from a copy, with the code that opened it, behind the usual consent. */
export async function completeRestore(incoming: AppData, code: string): Promise<void> {
  const now = new Date();
  const nowISO = now.toISOString();
  const legalVersion = content().legal.LEGAL_VERSION;
  const data: AppData = {
    ...incoming,
    role: 'owner',
    onboardedAt: nowISO,
    consents: [
      { type: 'health_data_processing', textVersion: legalVersion, grantedAt: nowISO },
      { type: 'age_confirmation', textVersion: legalVersion, grantedAt: nowISO },
    ],
    backup: { code, createdAt: nowISO, confirmed: true },
  };
  if (vault) await vault.create(data);
  resetUi();
  resetRoute();
  patch({ status: 'ready', data, today: todayISO(now), ...lockInfo() });
}

// ---- Partner mode ---------------------------------------------------------------------------

export function setPartnerPermissions(permissions: PartnerPermissions): void {
  update((d) => ({ ...d, partner: { ...d.partner, permissions } }));
}

/** The partner approved and paired: from now on the summary is kept up to date (see partner/OwnerSync). */
export function startShare(share: PartnerShare): void {
  const now = new Date().toISOString();
  update((d) => ({
    ...d,
    partner: { ...d.partner, share },
    consents: [
      ...d.consents.filter((c) => c.type !== 'partner_sharing'),
      { type: 'partner_sharing', textVersion: content().legal.LEGAL_VERSION, grantedAt: now },
    ],
  }));
}

/** Stops sharing at once. The server copy is deleted now, or as soon as the device is back online. */
export async function stopShare(): Promise<'deleted' | 'pending'> {
  const share = store.get().data?.partner.share;
  if (!share) return 'deleted';
  update((d) => ({
    ...d,
    partner: { permissions: d.partner.permissions, pendingRevoke: { channelId: share.channelId, writeToken: share.writeToken } },
    consents: d.consents.filter((c) => c.type !== 'partner_sharing'),
  }));
  return (await retryPendingRevoke()) ? 'deleted' : 'pending';
}

/** True once nothing is left on the server. */
export async function retryPendingRevoke(): Promise<boolean> {
  const pending = store.get().data?.partner.pendingRevoke;
  if (!pending) return true;
  const res = await deleteShare({ ...pending, dataKey: '', connectedAt: '' });
  if (!res.ok && res.reason !== 'not_found' && res.reason !== 'forbidden') return false;
  update((d) => ({ ...d, partner: { permissions: d.partner.permissions, share: d.partner.share } }));
  return true;
}

/** This device becomes a partner's viewer: a vault holding only the link and the summaries it receives. */
export async function startPartnerDevice(credentials: { channelId: string; dataKey: string }): Promise<void> {
  const nowISO = new Date().toISOString();
  const data = emptyAppData();
  data.role = 'partner';
  data.onboardedAt = nowISO;
  data.consents = [{ type: 'partner_view', textVersion: content().legal.LEGAL_VERSION, grantedAt: nowISO }];
  data.partnerView = { ...credentials, connectedAt: nowISO };
  if (vault) await vault.create(data);
  resetUi();
  resetRoute();
  patch({ status: 'ready', data, today: todayISO(), ...lockInfo() });
}

/** What the partner's device received last; `undefined` fields are left as they were. */
export function updatePartnerView(changes: Partial<PartnerView>): void {
  update((d) => (d.partnerView ? { ...d, partnerView: { ...d.partnerView, ...changes } } : d));
}

// ---- Preferences and clock --------------------------------------------------------------------

export function setPrefs(partial: Partial<Prefs>): void {
  const prefs = { ...store.get().prefs, ...partial };
  savePrefs(prefs);
  applyPrefs(prefs);
  patch({ prefs });
}

/** Keeps "today" right when the app stays open past midnight or comes back from the background. */
export function refreshToday(): void {
  const today = todayISO();
  if (today !== store.get().today) patch({ today });
}

export const getState = store.get;

// ---- Hooks ------------------------------------------------------------------------------------

export const useStatus = () => useStore(store, (s) => s.status);
export const useStorageMode = () => useStore(store, (s) => s.storage);
export const useHasPin = () => useStore(store, (s) => s.hasPin);
export const useHasBiometric = () => useStore(store, (s) => s.hasBiometric);
export const useToday = () => useStore(store, (s) => s.today);
export const usePrefs = () => useStore(store, (s) => s.prefs);

/** The journal. Only call inside screens shown while the app is unlocked. */
export function useData(): AppData {
  const data = useStore(store, (s) => s.data);
  if (!data) throw new Error('Journal requested while locked');
  return data;
}

/** The name and picture, or `undefined` while locked (the avatar then shows nothing personal). */
export const useUser = (): UserProfile | undefined => useStore(store, (s) => s.data?.user);
/** `partner` on a device that only views what someone shares with it. */
export const useRole = () => useStore(store, (s) => s.data?.role ?? 'owner');

export function useTimeline(): Timeline {
  const data = useData();
  const today = useToday();
  return useMemo(() => buildTimeline(data.logs, data.profile, today), [data.logs, data.profile, today]);
}
