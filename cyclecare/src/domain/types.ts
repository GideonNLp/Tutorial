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

/** What happened, as far as the person chooses to say. Only vaginal intercourse can lead to pregnancy directly. */
export const SEX_ACTIVITIES = ['vaginal', 'oral', 'anal', 'toys'] as const;
export type SexActivity = (typeof SEX_ACTIVITIES)[number];

/**
 * Contraception in use for that day's contact(s). `none` is an explicit "no protection";
 * `emergency` is emergency contraception taken afterwards.
 */
export const PROTECTIONS = ['condom', 'pill', 'iud', 'hormonal_other', 'withdrawal', 'none', 'emergency'] as const;
export type Protection = (typeof PROTECTIONS)[number];

/**
 * Sexual activity on a day (shown as a heart in the calendar). Both lists may be empty:
 * "something happened" is enough, and details are optional.
 */
export interface IntimacyLog {
  activities: SexActivity[];
  protection: Protection[];
  /** The condom broke or slipped off. */
  condomFailed?: boolean;
}

export interface DayLog {
  date: ISODate;
  flow?: Flow;
  symptoms?: Partial<Record<SymptomId, Intensity>>;
  mood?: Scale5;
  energy?: Scale5;
  bbt?: BbtReading;
  mucus?: CervicalMucus;
  intimacy?: IntimacyLog;
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
  /** Hearts for intimate contacts in the calendar; off keeps the calendar discreet. */
  showIntimacy: boolean;
}

/**
 * How the person appears inside the app. Both fields are optional and live in the encrypted
 * vault with the journal; they never appear on the lock screen, in notifications or in the PDF report.
 */
export interface UserProfile {
  /** First name or nickname, as typed (trimmed, at most `NICKNAME_MAX` characters). */
  nickname?: string;
  /** Profile picture as a small square JPEG `data:` URL (256 × 256 px). */
  photo?: string;
}

export const NICKNAME_MAX = 30;

/** What the partner may see. Each switch is the person's choice; all on until changed. */
export interface PartnerPermissions {
  /** Current phase, cycle day, days until the next period. */
  phase: boolean;
  /** The calendar: phases, fertile days, estimated periods. */
  calendar: boolean;
  /** Symptoms, mood, energy and flow from the journal. */
  journal: boolean;
  /** Personal notes (only together with `journal`). */
  notes: boolean;
}
export const DEFAULT_PARTNER_PERMISSIONS: PartnerPermissions = { phase: true, calendar: true, journal: true, notes: true };

/** The owner's side of an active link. Secrets stay in the vault and never go into a backup file. */
export interface PartnerShare {
  /** 128-bit random id of the relay channel (base64url). */
  channelId: string;
  /** AES-256-GCM key for the shared summary (base64url); the relay never sees it. */
  dataKey: string;
  /** Proves to the relay that this device may update or delete the channel (base64url). */
  writeToken: string;
  connectedAt: ISOTimestamp;
}

export interface OwnerPartnerSettings {
  permissions: PartnerPermissions;
  share?: PartnerShare;
  /** A stopped link whose server copy could not be deleted yet (offline); retried until it is. */
  pendingRevoke?: { channelId: string; writeToken: string };
}

/** The partner's side: where to read, the key, and the last summary received (for offline use). */
export interface PartnerView {
  channelId: string;
  dataKey: string;
  connectedAt: ISOTimestamp;
  /** Last summary received, already validated (see domain/partner.ts). */
  snapshot?: unknown;
  etag?: string;
  /** When the relay was last reached. */
  checkedAt?: ISOTimestamp;
  /** The owner stopped sharing. */
  revoked?: boolean;
}

export const CONSENT_TYPES = ['health_data_processing', 'age_confirmation', 'partner_sharing', 'partner_view'] as const;
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
  /** `partner`: this device only views what someone shares with it (Partner mode). */
  role: 'owner' | 'partner';
  onboardedAt?: ISOTimestamp;
  consents: ConsentRecord[];
  profile: Profile;
  user: UserProfile;
  logs: DayLogs;
  reminders: ReminderSettings;
  /** occurrence id → when it was shown, so a reminder is never delivered twice. */
  firedReminders: Record<string, ISOTimestamp>;
  /** flag id → day it was dismissed. */
  dismissedFlags: Record<string, ISODate>;
  /** tip id → the day it was last marked "Am aplicat". */
  appliedTips: Record<string, ISODate>;
  /** Owner side of Partner mode. */
  partner: OwnerPartnerSettings;
  /** Partner side of Partner mode (only when `role` is `partner`). */
  partnerView?: PartnerView;
  importBatches: ImportBatch[];
}

export function isPeriodFlow(flow: Flow | undefined): boolean {
  return flow !== undefined && flow !== 'spotting';
}

export function emptyAppData(): AppData {
  return {
    schemaVersion: 1,
    role: 'owner',
    consents: [],
    profile: { goals: [], showFertility: true, showIntimacy: true },
    user: {},
    logs: {},
    reminders: {
      discreet: true,
      period: { enabled: false, daysBefore: 2, time: '09:00', repeatDaily: false },
      fertile: { enabled: false, daysBefore: 0, time: '09:00', repeatDaily: false },
      medications: [],
    },
    firedReminders: {},
    dismissedFlags: {},
    appliedTips: {},
    partner: { permissions: { ...DEFAULT_PARTNER_PERMISSIONS } },
    importBatches: [],
  };
}
