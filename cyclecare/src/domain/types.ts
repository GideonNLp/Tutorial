/**
 * Domain types. Everything here is plain data so it can be serialised into the encrypted vault
 * and reused unchanged in a native (React Native / Capacitor) build.
 */

/** Local calendar day, `YYYY-MM-DD`. Days are never stored as timestamps, so time zones cannot shift them. */
export type ISODate = string;

/** ISO-8601 timestamp (UTC), used only for audit fields such as `updatedAt`. */
export type ISOTimestamp = string;

export const FLOWS = ['spotting', 'light', 'medium', 'heavy'] as const;
/**
 * `unspecified` marks a day as a period day without an intensity (onboarding, "edit period days").
 * `spotting` never counts as a period day.
 */
export type Flow = (typeof FLOWS)[number] | 'unspecified';

export const PHASES = ['menstruation', 'follicular', 'ovulation', 'luteal'] as const;
export type Phase = (typeof PHASES)[number];

export const GOALS = ['contraception', 'conception', 'general', 'symptoms'] as const;
export type Goal = (typeof GOALS)[number];

export const SYMPTOM_GROUPS = {
  pain: ['cramps', 'headache', 'backache', 'breast_tenderness'],
  digestive: ['bloating', 'nausea', 'constipation', 'diarrhea', 'cravings'],
  skin: ['acne'],
  general: ['fatigue', 'insomnia', 'dizziness'],
  emotional: ['irritability', 'anxiety', 'sadness', 'mood_swings'],
} as const;
export type SymptomGroup = keyof typeof SYMPTOM_GROUPS;
export type SymptomId = (typeof SYMPTOM_GROUPS)[SymptomGroup][number];
export const SYMPTOM_IDS: SymptomId[] = Object.values(SYMPTOM_GROUPS).flat();

/** 1 = mild, 2 = moderate, 3 = severe. */
export type Intensity = 1 | 2 | 3;
/** 1 = very low … 5 = very good / very high. */
export type Scale5 = 1 | 2 | 3 | 4 | 5;

export const MUCUS_TYPES = ['dry', 'sticky', 'creamy', 'watery', 'eggwhite'] as const;
export type CervicalMucus = (typeof MUCUS_TYPES)[number];

export interface BbtReading {
  /** Basal body temperature in °C, two decimals at most. */
  celsius: number;
  source: 'manual' | 'import';
  /** Free-text device / file label for imported readings. */
  device?: string;
}

export interface DayLog {
  date: ISODate;
  flow?: Flow;
  symptoms?: Partial<Record<SymptomId, Intensity>>;
  mood?: Scale5;
  energy?: Scale5;
  bbt?: BbtReading;
  mucus?: CervicalMucus;
  note?: string;
  updatedAt: ISOTimestamp;
}

export type DayLogs = Record<ISODate, DayLog>;

export interface Profile {
  goals: Goal[];
  /** Declared at onboarding, 21–45. Used as a prior until enough cycles are recorded. */
  typicalCycleLength?: number;
  /** Declared at onboarding, 2–10. */
  typicalPeriodLength?: number;
  /** Lets the person hide ovulation / fertile-day estimates (e.g. on hormonal contraception). */
  showFertility: boolean;
}

export const CONSENT_TYPES = ['health_data_processing', 'age_confirmation'] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export interface ConsentRecord {
  type: ConsentType;
  /** Version of the consent text the person agreed to. */
  textVersion: string;
  grantedAt: ISOTimestamp;
}

export interface MedicationReminder {
  id: string;
  name: string;
  /** `HH:MM`, 24h local time. */
  time: string;
  /** 0 = Monday … 6 = Sunday. Empty = every day. */
  weekdays: number[];
  enabled: boolean;
}

export interface ReminderSettings {
  /** Neutral wording in system notifications, so nothing sensitive shows on a lock screen. */
  discreet: boolean;
  period: { enabled: boolean; daysBefore: number; time: string; repeatDaily: boolean };
  fertile: { enabled: boolean; daysBefore: number; time: string; repeatDaily: boolean };
  medications: MedicationReminder[];
}

export interface ImportBatch {
  id: string;
  importedAt: ISOTimestamp;
  device: string;
  count: number;
  from: ISODate;
  to: ISODate;
}

/** Everything that lives inside the encrypted vault. */
export interface AppData {
  schemaVersion: 1;
  onboardedAt?: ISOTimestamp;
  consents: ConsentRecord[];
  profile: Profile;
  logs: DayLogs;
  reminders: ReminderSettings;
  /** occurrence id → when it was shown, so a reminder is never delivered twice. */
  firedReminders: Record<string, ISOTimestamp>;
  /** flag id → day it was dismissed. */
  dismissedFlags: Record<string, ISODate>;
  importBatches: ImportBatch[];
}

export function isPeriodFlow(flow: Flow | undefined): boolean {
  return flow !== undefined && flow !== 'spotting';
}

export function emptyAppData(): AppData {
  return {
    schemaVersion: 1,
    consents: [],
    profile: { goals: [], showFertility: true },
    logs: {},
    reminders: {
      discreet: true,
      period: { enabled: false, daysBefore: 2, time: '09:00', repeatDaily: false },
      fertile: { enabled: false, daysBefore: 0, time: '09:00', repeatDaily: false },
      medications: [],
    },
    firedReminders: {},
    dismissedFlags: {},
    importBatches: [],
  };
}
