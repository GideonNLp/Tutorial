import { addDays, eachDay, isValidISODate } from './dates';
import { currentPhase, type PredictionStatus, type Timeline } from './prediction';
import {
  FLOWS,
  PHASES,
  SYMPTOM_IDS,
  type AppData,
  type Flow,
  type Intensity,
  type ISODate,
  type ISOTimestamp,
  type PartnerPermissions,
  type Phase,
  type Scale5,
  type SymptomId,
} from './types';

/**
 * What the partner's device receives: a summary computed on the owner's device, limited by the
 * permissions she chose. The raw journal never leaves the phone, and some things are never shared
 * whatever the switches say: intimate contacts, temperature, cervical mucus, profile picture.
 */
export const SNAPSHOT_VERSION = 1;
/** Days of history in the calendar and the journal summary. */
export const CALENDAR_PAST_DAYS = 42;
export const CALENDAR_FUTURE_DAYS = 84;
export const JOURNAL_DAYS = 14;

export interface PartnerCycle {
  phase?: Phase;
  cycleDay?: number;
  status: PredictionStatus;
  /** Days until the most likely start of the next period; negative when late. */
  daysUntil?: number;
  next?: { likely: ISODate; earliest: ISODate; latest: ISODate };
}

export interface PartnerCalendarDay {
  date: ISODate;
  phase?: Phase;
  period?: 'logged' | 'predicted';
  fertile?: boolean;
  ovulation?: boolean;
}

export interface PartnerJournalDay {
  date: ISODate;
  flow?: Flow;
  symptoms?: Partial<Record<SymptomId, Intensity>>;
  mood?: Scale5;
  energy?: Scale5;
  note?: string;
}

export interface PartnerSnapshot {
  v: typeof SNAPSHOT_VERSION;
  generatedAt: ISOTimestamp;
  today: ISODate;
  /** The owner's nickname, when she set one. */
  name?: string;
  permissions: PartnerPermissions;
  /** False when she switched fertility estimates off: the partner then sees no fertile days or phases other than the period. */
  showFertility: boolean;
  cycle?: PartnerCycle;
  calendar?: PartnerCalendarDay[];
  journal?: PartnerJournalDay[];
}

const visible = (phase: Phase | undefined, showFertility: boolean) => (showFertility || phase === 'menstruation' ? phase : undefined);

export function buildPartnerSnapshot(data: AppData, timeline: Timeline, generatedAt: ISOTimestamp): PartnerSnapshot {
  const p = data.partner.permissions;
  const { today, prediction } = timeline;
  const showFertility = data.profile.showFertility;
  const snapshot: PartnerSnapshot = {
    v: SNAPSHOT_VERSION,
    generatedAt,
    today,
    permissions: { ...p, notes: p.journal && p.notes },
    showFertility,
  };
  if (data.user.nickname) snapshot.name = data.user.nickname;

  if (p.phase) {
    const current = prediction.current;
    const forecast = prediction.forecasts[0];
    const cycle: PartnerCycle = { status: prediction.status };
    const phase = visible(currentPhase(timeline), showFertility);
    if (phase) cycle.phase = phase;
    if (current) {
      cycle.cycleDay = current.cycleDay;
      cycle.daysUntil = current.daysUntil;
    }
    if (forecast) cycle.next = { likely: forecast.start, earliest: forecast.earliest, latest: forecast.latest };
    snapshot.cycle = cycle;
  }

  if (p.calendar) {
    snapshot.calendar = eachDay(addDays(today, -CALENDAR_PAST_DAYS), addDays(today, CALENDAR_FUTURE_DAYS)).map((date) => {
      const info = timeline.dayInfo(date);
      const day: PartnerCalendarDay = { date };
      const phase = visible(info.phase, showFertility);
      if (phase) day.phase = phase;
      if (info.periodLogged) day.period = 'logged';
      else if (info.periodPredicted) day.period = 'predicted';
      if (showFertility && info.fertile) day.fertile = true;
      if (showFertility && info.ovulationDay) day.ovulation = true;
      return day;
    });
  }

  if (p.journal) {
    const days: PartnerJournalDay[] = [];
    for (const date of eachDay(addDays(today, -(JOURNAL_DAYS - 1)), today).reverse()) {
      const log = data.logs[date];
      if (!log) continue;
      const day: PartnerJournalDay = { date };
      if (log.flow) day.flow = log.flow;
      if (log.symptoms && Object.keys(log.symptoms).length) day.symptoms = { ...log.symptoms };
      if (log.mood) day.mood = log.mood;
      if (log.energy) day.energy = log.energy;
      if (snapshot.permissions.notes && log.note) day.note = log.note;
      if (Object.keys(day).length > 1) days.push(day);
    }
    snapshot.journal = days;
  }
  return snapshot;
}

// ---- Reading a summary on the partner's device --------------------------------------------
// The summary is authenticated (AES-GCM with a key only the two devices hold), but it is still
// checked field by field: whatever is unexpected is dropped rather than shown.

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPhase = (v: unknown): v is Phase => typeof v === 'string' && (PHASES as readonly string[]).includes(v);
const intIn = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined;
const STATUSES: PredictionStatus[] = ['no_data', 'on_track', 'due', 'late'];

function readCycle(raw: unknown): PartnerCycle | undefined {
  if (!isObject(raw) || !STATUSES.includes(raw.status as PredictionStatus)) return undefined;
  const cycle: PartnerCycle = { status: raw.status as PredictionStatus };
  if (isPhase(raw.phase)) cycle.phase = raw.phase;
  const cycleDay = intIn(raw.cycleDay, 1, 400);
  if (cycleDay) cycle.cycleDay = cycleDay;
  const daysUntil = intIn(raw.daysUntil, -400, 400);
  if (daysUntil !== undefined) cycle.daysUntil = daysUntil;
  const n = raw.next;
  if (isObject(n) && isValidISODate(n.likely) && isValidISODate(n.earliest) && isValidISODate(n.latest)) {
    cycle.next = { likely: n.likely, earliest: n.earliest, latest: n.latest };
  }
  return cycle;
}

function readDay(raw: unknown): PartnerCalendarDay | undefined {
  if (!isObject(raw) || !isValidISODate(raw.date)) return undefined;
  const day: PartnerCalendarDay = { date: raw.date };
  if (isPhase(raw.phase)) day.phase = raw.phase;
  if (raw.period === 'logged' || raw.period === 'predicted') day.period = raw.period;
  if (raw.fertile === true) day.fertile = true;
  if (raw.ovulation === true) day.ovulation = true;
  return day;
}

function readJournalDay(raw: unknown, notes: boolean): PartnerJournalDay | undefined {
  if (!isObject(raw) || !isValidISODate(raw.date)) return undefined;
  const day: PartnerJournalDay = { date: raw.date };
  if (typeof raw.flow === 'string' && ([...FLOWS, 'unspecified'] as string[]).includes(raw.flow)) day.flow = raw.flow as Flow;
  if (isObject(raw.symptoms)) {
    const symptoms: Partial<Record<SymptomId, Intensity>> = {};
    for (const id of SYMPTOM_IDS) {
      const intensity = intIn(raw.symptoms[id], 1, 3);
      if (intensity) symptoms[id] = intensity as Intensity;
    }
    if (Object.keys(symptoms).length) day.symptoms = symptoms;
  }
  const mood = intIn(raw.mood, 1, 5);
  if (mood) day.mood = mood as Scale5;
  const energy = intIn(raw.energy, 1, 5);
  if (energy) day.energy = energy as Scale5;
  if (notes && typeof raw.note === 'string' && raw.note.trim()) day.note = raw.note.slice(0, 2000);
  return day;
}

/** A valid summary from anything, or `undefined`. What the permissions do not cover is dropped as well. */
export function readPartnerSnapshot(raw: unknown): PartnerSnapshot | undefined {
  if (!isObject(raw) || raw.v !== SNAPSHOT_VERSION || !isValidISODate(raw.today) || typeof raw.generatedAt !== 'string') return undefined;
  const perms = raw.permissions;
  if (!isObject(perms)) return undefined;
  const permissions: PartnerPermissions = {
    phase: perms.phase === true,
    calendar: perms.calendar === true,
    journal: perms.journal === true,
    notes: perms.journal === true && perms.notes === true,
  };
  const snapshot: PartnerSnapshot = {
    v: SNAPSHOT_VERSION,
    generatedAt: raw.generatedAt.slice(0, 40),
    today: raw.today,
    permissions,
    showFertility: raw.showFertility !== false,
  };
  if (typeof raw.name === 'string' && raw.name.trim()) snapshot.name = raw.name.trim().slice(0, 30);
  if (permissions.phase) snapshot.cycle = readCycle(raw.cycle);
  if (permissions.calendar && Array.isArray(raw.calendar)) {
    snapshot.calendar = raw.calendar
      .slice(0, 400)
      .map(readDay)
      .filter((d): d is PartnerCalendarDay => d !== undefined);
  }
  if (permissions.journal && Array.isArray(raw.journal)) {
    snapshot.journal = raw.journal
      .slice(0, 60)
      .map((d) => readJournalDay(d, permissions.notes))
      .filter((d): d is PartnerJournalDay => d !== undefined);
  }
  return snapshot;
}
