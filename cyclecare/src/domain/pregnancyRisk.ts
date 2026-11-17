import { addDays } from './dates';
import type { Timeline } from './prediction';
import type { DayLogs, IntimacyLog, ISODate } from './types';

/**
 * Pregnancy risk, as an informed estimate from what the person logged. It is never a
 * contraceptive method and never says a day is "safe": the lowest level is "low, but not zero".
 *
 * Two questions are answered separately and then combined:
 *  1. How likely is pregnancy on a given day? From the estimated fertile window (the five days
 *     before ovulation and the day after it, because sperm can survive up to five days).
 *  2. How exposed was a logged contact? From the kind of contact and the protection used.
 * The rules are written out step by step in docs/03-algoritm-predictie.md, section 8.
 */

export type DayChance = 'high' | 'medium' | 'low' | 'unknown';
export type ChanceReason =
  | 'fertile' // inside the estimated fertile window
  | 'near_fertile' // a few days either side of it: the estimate can be off by that much
  | 'uncertain' // too few or too irregular cycles to call any day low
  | 'period' // during menstruation
  | 'outside' // well away from the fertile window
  | 'late' // the period is late, so ovulation can no longer be placed
  | 'no_data' // no period logged yet (or a cycle too long to place phases)
  | 'hidden'; // fertility estimates are switched off

export interface DayChanceResult {
  level: DayChance;
  reason: ChanceReason;
}

/** Days before the fertile window, and after it, that count as "near" (medium). */
const MARGIN_BEFORE = 3;
const MARGIN_AFTER = 2;

export function dayChance(timeline: Timeline, date: ISODate, showFertility: boolean): DayChanceResult {
  if (!showFertility) return { level: 'unknown', reason: 'hidden' };
  const info = timeline.dayInfo(date);
  const { prediction } = timeline;
  if (info.overdue || (info.forecast && prediction.status === 'late' && !info.periodLogged)) return { level: 'unknown', reason: 'late' };
  if (!info.phase) return { level: 'unknown', reason: 'no_data' };
  if (info.fertile) return { level: 'high', reason: 'fertile' };

  const near = [-MARGIN_AFTER, -1, 1, 2, MARGIN_BEFORE].some((d) => d !== 0 && timeline.dayInfo(addDays(date, d)).fertile);
  if (near) return { level: 'medium', reason: 'near_fertile' };
  if (info.phase === 'menstruation') return { level: 'low', reason: 'period' };

  // In the running cycle and the forecast ones, a shaky estimate means no day can be called low.
  const current = prediction.current;
  if (prediction.confidence === 'low' && current && date >= current.start) return { level: 'medium', reason: 'uncertain' };
  return { level: 'low', reason: 'outside' };
}

/** How exposed one day's contacts were. `none`: no contact that can lead to pregnancy. */
export type ContactRisk = 'none' | 'very_low' | 'low' | 'moderate' | 'high';
export const CONTACT_RISK_ORDER: ContactRisk[] = ['none', 'very_low', 'low', 'moderate', 'high'];

/** The protection that counts for the estimate, after combining what was logged. */
export type ProtectionLevel = 'unprotected' | 'unspecified' | 'withdrawal' | 'condom_failed' | 'condom' | 'ongoing' | 'not_relevant';

export interface ContactAssessment {
  date: ISODate;
  risk: ContactRisk;
  chance: DayChanceResult;
  protection: ProtectionLevel;
  /** Only non-vaginal contact was logged. */
  nonVaginal: boolean;
  emergencyTaken: boolean;
}

/**
 * The protection behind a day's contacts. "No protection" logged explicitly wins (one of the
 * contacts was unprotected); otherwise the most reliable method present counts, since methods
 * used together add up.
 */
export function protectionLevel(log: IntimacyLog): ProtectionLevel {
  const p = log.protection;
  if (p.includes('none')) return 'unprotected';
  if (p.includes('iud') || p.includes('pill') || p.includes('hormonal_other')) return 'ongoing';
  if (p.includes('condom')) return log.condomFailed ? 'condom_failed' : 'condom';
  if (p.includes('withdrawal')) return 'withdrawal';
  // Only emergency contraception (taken afterwards) or nothing logged at all.
  return p.includes('emergency') ? 'unprotected' : 'unspecified';
}

const STEP_DOWN: Record<ContactRisk, ContactRisk> = { high: 'low', moderate: 'low', low: 'very_low', very_low: 'very_low', none: 'none' };

export function assessContact(timeline: Timeline, date: ISODate, log: IntimacyLog, showFertility: boolean): ContactAssessment {
  const chance = dayChance(timeline, date, showFertility);
  const emergencyTaken = log.protection.includes('emergency');
  const vaginal = log.activities.length === 0 || log.activities.includes('vaginal'); // not said: assume it may have been
  const base = { date, chance, emergencyTaken };

  if (!vaginal) {
    // Oral sex and toys cannot lead to pregnancy on their own; with anal sex, semen near the vagina rarely can.
    const anal = log.activities.includes('anal');
    return { ...base, risk: anal ? 'very_low' : 'none', protection: 'not_relevant', nonVaginal: true };
  }

  const protection = protectionLevel(log);
  const exposed: Record<DayChance, ContactRisk> = { high: 'high', medium: 'moderate', unknown: 'moderate', low: 'low' };
  let risk: ContactRisk;
  if (protection === 'ongoing') risk = 'very_low';
  else if (protection === 'condom') risk = STEP_DOWN[exposed[chance.level]];
  else risk = exposed[chance.level]; // unprotected, unspecified, withdrawal, a failed condom
  return { ...base, risk, protection, nonVaginal: false };
}

export interface PregnancyRiskSummary {
  today: DayChanceResult;
  /** Logged contacts since the current cycle began (or in the last 35 days without one), newest first. */
  contacts: ContactAssessment[];
  highest?: ContactAssessment;
  /** A moderate or high contact in the last five days with no emergency contraception logged. */
  emergency?: { contact: ISODate; until: ISODate };
  /** Emergency contraception was logged after a contact this cycle. */
  emergencyTaken: boolean;
  /** When a home pregnancy test gives a reliable answer, if this cycle had a moderate or high contact. */
  test?: { from: ISODate; now: boolean };
}

/** Emergency contraception works best as early as possible, within five days (120 hours). */
const EMERGENCY_DAYS = 5;
/** Without an expected period date, a test is reliable about three weeks after the contact. */
const TEST_AFTER_DAYS = 21;
const LOOKBACK_DAYS = 35;

export function summarizePregnancyRisk(timeline: Timeline, logs: DayLogs, showFertility: boolean): PregnancyRiskSummary {
  const { today, prediction } = timeline;
  const current = prediction.current;
  const from = current?.start ?? addDays(today, -LOOKBACK_DAYS);

  const contacts = Object.values(logs)
    .filter((log) => log.intimacy && log.date >= from && log.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((log) => assessContact(timeline, log.date, log.intimacy!, showFertility));

  const rank = (c: ContactAssessment) => CONTACT_RISK_ORDER.indexOf(c.risk);
  const highest = contacts.reduce<ContactAssessment | undefined>((best, c) => (!best || rank(c) > rank(best) ? c : best), undefined);
  const risky = contacts.filter((c) => c.risk === 'moderate' || c.risk === 'high');
  const emergencyTaken = contacts.some((c) => c.emergencyTaken);

  const summary: PregnancyRiskSummary = { today: dayChance(timeline, today, showFertility), contacts, highest, emergencyTaken };

  const recent = risky.find((c) => c.date >= addDays(today, -EMERGENCY_DAYS));
  if (recent && !emergencyTaken) summary.emergency = { contact: recent.date, until: addDays(recent.date, EMERGENCY_DAYS) };

  const late = prediction.status === 'late';
  const latest = risky[0];
  if (latest || (late && highest && highest.risk !== 'none')) {
    // From the day the period is due; without one, three weeks after the latest risky contact.
    const testFrom = current ? current.expectedNext : addDays((latest ?? highest!).date, TEST_AFTER_DAYS);
    summary.test = { from: testFrom, now: late || today >= testFrom };
  }
  return summary;
}
