import { isValidISODate } from '../domain/dates';
import {
  CONSENT_TYPES,
  FLOWS,
  GOALS,
  MUCUS_TYPES,
  PROTECTIONS,
  SEX_ACTIVITIES,
  SYMPTOM_IDS,
  emptyAppData,
  type AppData,
  type ConsentRecord,
  type DayLog,
  type Goal,
  type ImportBatch,
  type MedicationReminder,
  type SymptomId,
  type UserProfile,
  NICKNAME_MAX,
} from '../domain/types';
import { isEmptyLog } from '../domain/journal';

/**
 * Plain-JSON export / import of everything in the vault (data portability).
 * The file is NOT encrypted: the app says so before saving it.
 * Imported files are untrusted input, so every field is validated and anything unknown is dropped.
 */
export const BACKUP_FORMAT = 1;
/** Identifies the file format. It stays the same if the product is renamed, so older backups keep working. */
const APP_ID = 'CycleCare';
const MAX_NOTE = 2000;
const MAX_TEXT = 60;
/** A 256 × 256 JPEG is about 20–40 kB; anything far larger was not made by the app. */
const MAX_PHOTO = 400_000;
const PHOTO_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function sanitizeUser(raw: unknown): UserProfile {
  if (!isObject(raw)) return {};
  const user: UserProfile = {};
  const nickname = typeof raw.nickname === 'string' ? raw.nickname.replace(/\s+/g, ' ').trim().slice(0, NICKNAME_MAX) : '';
  if (nickname) user.nickname = nickname;
  if (typeof raw.photo === 'string' && raw.photo.length <= MAX_PHOTO && PHOTO_URL.test(raw.photo)) user.photo = raw.photo;
  return user;
}

export interface BackupFile {
  app: typeof APP_ID;
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  data: AppData;
}

export function exportBackup(data: AppData, now: Date): string {
  const file: BackupFile = { app: APP_ID, format: BACKUP_FORMAT, exportedAt: now.toISOString(), data };
  return JSON.stringify(file, null, 2);
}

export type BackupError = 'not_json' | 'not_cyclecare' | 'unsupported_version';
export type BackupResult = { ok: true; data: AppData } | { ok: false; error: BackupError };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const text = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const intIn = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined;

function sanitizeLog(date: string, raw: unknown, fallbackTime: string): DayLog | undefined {
  if (!isObject(raw)) return undefined;
  const log: DayLog = { date, updatedAt: text(raw.updatedAt, 40) ?? fallbackTime };
  if (typeof raw.flow === 'string' && ([...FLOWS, 'unspecified'] as string[]).includes(raw.flow)) {
    log.flow = raw.flow as DayLog['flow'];
  }
  if (isObject(raw.symptoms)) {
    const symptoms: NonNullable<DayLog['symptoms']> = {};
    for (const id of SYMPTOM_IDS) {
      const intensity = intIn(raw.symptoms[id], 1, 3);
      if (intensity) symptoms[id as SymptomId] = intensity as 1 | 2 | 3;
    }
    if (Object.keys(symptoms).length) log.symptoms = symptoms;
  }
  const mood = intIn(raw.mood, 1, 5);
  if (mood) log.mood = mood as DayLog['mood'];
  const energy = intIn(raw.energy, 1, 5);
  if (energy) log.energy = energy as DayLog['energy'];
  if (isObject(raw.bbt) && typeof raw.bbt.celsius === 'number' && raw.bbt.celsius >= 34 && raw.bbt.celsius <= 42) {
    log.bbt = {
      celsius: Math.round(raw.bbt.celsius * 100) / 100,
      source: raw.bbt.source === 'import' ? 'import' : 'manual',
    };
    const device = text(raw.bbt.device, MAX_TEXT);
    if (device) log.bbt.device = device;
  }
  if (typeof raw.mucus === 'string' && (MUCUS_TYPES as readonly string[]).includes(raw.mucus)) {
    log.mucus = raw.mucus as DayLog['mucus'];
  }
  if (isObject(raw.intimacy)) {
    const i = raw.intimacy;
    const pick = <T extends string>(values: unknown, allowed: readonly T[]): T[] =>
      Array.isArray(values) ? allowed.filter((v) => (values as unknown[]).includes(v)) : [];
    log.intimacy = { activities: pick(i.activities, SEX_ACTIVITIES), protection: pick(i.protection, PROTECTIONS) };
    if (i.condomFailed === true && log.intimacy.protection.includes('condom')) log.intimacy.condomFailed = true;
  }
  const note = text(raw.note, MAX_NOTE);
  if (note) log.note = note;
  return isEmptyLog(log) ? undefined : log;
}

/** Builds a valid `AppData` from anything; unknown or out-of-range values fall back to defaults. */
export function sanitizeAppData(raw: unknown, nowISO: string): AppData {
  const data = emptyAppData();
  if (!isObject(raw)) return data;

  const onboardedAt = text(raw.onboardedAt, 40);
  if (onboardedAt) data.onboardedAt = onboardedAt;

  if (Array.isArray(raw.consents)) {
    data.consents = raw.consents.flatMap((c): ConsentRecord[] => {
      if (!isObject(c) || !(CONSENT_TYPES as readonly unknown[]).includes(c.type)) return [];
      const textVersion = text(c.textVersion, 20);
      const grantedAt = text(c.grantedAt, 40);
      return textVersion && grantedAt ? [{ type: c.type as ConsentRecord['type'], textVersion, grantedAt }] : [];
    });
  }

  if (isObject(raw.profile)) {
    const p = raw.profile;
    if (Array.isArray(p.goals)) data.profile.goals = GOALS.filter((g) => (p.goals as unknown[]).includes(g)) as Goal[];
    data.profile.typicalCycleLength = intIn(p.typicalCycleLength, 21, 45);
    data.profile.typicalPeriodLength = intIn(p.typicalPeriodLength, 2, 10);
    data.profile.showFertility = p.showFertility !== false;
    data.profile.showIntimacy = p.showIntimacy !== false;
  }

  data.user = sanitizeUser(raw.user);

  if (isObject(raw.logs)) {
    for (const [date, value] of Object.entries(raw.logs)) {
      if (!isValidISODate(date)) continue;
      const log = sanitizeLog(date, value, nowISO);
      if (log) data.logs[date] = log;
    }
  }

  if (isObject(raw.reminders)) {
    const r = raw.reminders;
    data.reminders.discreet = r.discreet !== false;
    for (const key of ['period', 'fertile'] as const) {
      const src = r[key];
      if (!isObject(src)) continue;
      data.reminders[key] = {
        enabled: src.enabled === true,
        daysBefore: intIn(src.daysBefore, 0, 7) ?? data.reminders[key].daysBefore,
        time: isTime(src.time) ? src.time : data.reminders[key].time,
        repeatDaily: src.repeatDaily === true,
      };
    }
    if (Array.isArray(r.medications)) {
      data.reminders.medications = r.medications.slice(0, 20).flatMap((m): MedicationReminder[] => {
        if (!isObject(m)) return [];
        const id = text(m.id, 40);
        const name = text(m.name, MAX_TEXT);
        if (!id || !name || !isTime(m.time)) return [];
        const weekdays = Array.isArray(m.weekdays) ? [...new Set(m.weekdays.filter((d): d is number => intIn(d, 0, 6) !== undefined))].sort() : [];
        return [{ id, name, time: m.time, weekdays, enabled: m.enabled !== false }];
      });
    }
  }

  if (isObject(raw.dismissedFlags)) {
    for (const [id, date] of Object.entries(raw.dismissedFlags)) {
      if (id.length <= 80 && isValidISODate(date)) data.dismissedFlags[id] = date;
    }
  }

  if (isObject(raw.appliedTips)) {
    for (const [id, date] of Object.entries(raw.appliedTips)) {
      if (/^[a-z]{3}-[a-z]{3}-\d{1,2}$/.test(id) && isValidISODate(date)) data.appliedTips[id] = date;
    }
  }

  if (Array.isArray(raw.importBatches)) {
    data.importBatches = raw.importBatches.slice(-50).flatMap((b): ImportBatch[] => {
      if (!isObject(b)) return [];
      const id = text(b.id, 40);
      const importedAt = text(b.importedAt, 40);
      const device = text(b.device, MAX_TEXT);
      const count = intIn(b.count, 0, 100_000);
      if (!id || !importedAt || !device || count === undefined || !isValidISODate(b.from) || !isValidISODate(b.to)) return [];
      return [{ id, importedAt, device, count, from: b.from, to: b.to }];
    });
  }

  return data;
}

export function parseBackup(fileText: string, nowISO: string): BackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    return { ok: false, error: 'not_json' };
  }
  if (!isObject(parsed) || parsed.app !== APP_ID || !isObject(parsed.data)) return { ok: false, error: 'not_cyclecare' };
  if (parsed.format !== BACKUP_FORMAT) return { ok: false, error: 'unsupported_version' };
  return { ok: true, data: sanitizeAppData(parsed.data, nowISO) };
}
