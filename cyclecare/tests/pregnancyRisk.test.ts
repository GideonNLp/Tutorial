import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates';
import { buildTimeline } from '../src/domain/prediction';
import { assessContact, dayChance, protectionLevel, summarizePregnancyRisk } from '../src/domain/pregnancyRisk';
import type { DayLogs, IntimacyLog, ISODate } from '../src/domain/types';
import { NOW, periods, profile, startsFrom } from './helpers';

// Six regular 28-day cycles, then the current one. Ovulation is estimated on cycle day 14 (S+13),
// the fertile window on cycle days 9–15 (S+8 … S+14).
const starts = startsFrom('2026-05-01', [28, 28, 28, 28, 28, 28]);
const S = starts[starts.length - 1]!;
const day = (n: number) => addDays(S, n);

function withContacts(base: DayLogs, contacts: Record<ISODate, IntimacyLog>): DayLogs {
  const logs = { ...base };
  for (const [date, intimacy] of Object.entries(contacts)) logs[date] = { ...(logs[date] ?? { date, updatedAt: NOW }), intimacy };
  return logs;
}
const sex = (activities: IntimacyLog['activities'], protection: IntimacyLog['protection'], condomFailed?: boolean): IntimacyLog => ({
  activities,
  protection,
  ...(condomFailed ? { condomFailed } : {}),
});

describe('chance of pregnancy on a day', () => {
  const timeline = buildTimeline(periods(starts), profile(), day(11));

  it('is high inside the estimated fertile window', () => {
    for (const n of [8, 11, 13, 14]) expect(dayChance(timeline, day(n), true), `S+${n}`).toEqual({ level: 'high', reason: 'fertile' });
  });

  it('is medium a few days either side, because the estimate can be off', () => {
    for (const n of [5, 6, 7, 15, 16]) expect(dayChance(timeline, day(n), true).level, `S+${n}`).toBe('medium');
  });

  it('is low (never "safe") during the period and well after ovulation', () => {
    expect(dayChance(timeline, day(2), true)).toEqual({ level: 'low', reason: 'period' });
    expect(dayChance(timeline, day(20), true)).toEqual({ level: 'low', reason: 'outside' });
  });

  it('cannot be estimated with fertility estimates off, or before any period is logged', () => {
    expect(dayChance(timeline, day(11), false)).toEqual({ level: 'unknown', reason: 'hidden' });
    const empty = buildTimeline({}, profile(), day(11));
    expect(dayChance(empty, day(11), true)).toEqual({ level: 'unknown', reason: 'no_data' });
  });

  it('never calls a day low while the estimate is still shaky', () => {
    const first = buildTimeline(periods([S]), profile(), day(11));
    expect(first.prediction.confidence).toBe('low');
    expect(dayChance(first, day(22), true)).toEqual({ level: 'medium', reason: 'uncertain' });
  });

  it('cannot be estimated once the period is late', () => {
    const late = buildTimeline(periods(starts), profile(), day(34));
    expect(late.prediction.status).toBe('late');
    expect(dayChance(late, day(34), true)).toEqual({ level: 'unknown', reason: 'late' });
  });
});

describe('risk of a logged contact', () => {
  const timeline = buildTimeline(periods(starts), profile(), day(11));
  const risk = (date: ISODate, log: IntimacyLog, showFertility = true) => assessContact(timeline, date, log, showFertility).risk;

  it('combines the day with the protection used', () => {
    expect(risk(day(10), sex(['vaginal'], ['none']))).toBe('high');
    expect(risk(day(6), sex(['vaginal'], ['none']))).toBe('moderate');
    expect(risk(day(3), sex(['vaginal'], ['none']))).toBe('low');
    expect(risk(day(10), sex(['vaginal'], ['condom']))).toBe('low');
    expect(risk(day(20), sex(['vaginal'], ['condom']))).toBe('very_low');
    expect(risk(day(10), sex(['vaginal'], ['pill']))).toBe('very_low');
    expect(risk(day(10), sex(['vaginal'], ['iud']))).toBe('very_low');
  });

  it('treats withdrawal, a failed condom and missing details as unprotected', () => {
    expect(risk(day(10), sex(['vaginal'], ['withdrawal']))).toBe('high');
    expect(risk(day(10), sex(['vaginal'], ['condom'], true))).toBe('high');
    expect(risk(day(10), sex([], []))).toBe('high');
    expect(risk(day(10), sex([], ['emergency']))).toBe('high'); // taken afterwards: noted, not counted as protection
    expect(protectionLevel(sex([], []))).toBe('unspecified');
  });

  it('an explicit "no protection" outweighs other methods logged the same day', () => {
    expect(protectionLevel(sex(['vaginal'], ['condom', 'none']))).toBe('unprotected');
    expect(protectionLevel(sex(['vaginal'], ['condom', 'pill']))).toBe('ongoing');
  });

  it('oral sex and toys alone carry no pregnancy risk; anal sex very little', () => {
    expect(risk(day(10), sex(['oral', 'toys'], []))).toBe('none');
    expect(risk(day(10), sex(['anal'], ['none']))).toBe('very_low');
    expect(risk(day(10), sex(['oral', 'vaginal'], ['none']))).toBe('high');
  });

  it('is never "none" for vaginal sex, whatever the day', () => {
    expect(risk(day(10), sex(['vaginal'], ['none']), false)).toBe('moderate');
  });
});

describe('summary for the current cycle', () => {
  it('points to emergency contraception after a recent risky contact, and to a test from the due date', () => {
    const logs = withContacts(periods(starts), { [day(10)]: sex(['vaginal'], ['condom'], true), [day(4)]: sex(['oral'], []) });
    const timeline = buildTimeline(logs, profile(), day(11));
    const summary = summarizePregnancyRisk(timeline, logs, true);
    expect(summary.contacts.map((c) => c.date)).toEqual([day(10), day(4)]);
    expect(summary.highest?.risk).toBe('high');
    expect(summary.emergency).toEqual({ contact: day(10), until: day(15) });
    expect(summary.test).toEqual({ from: timeline.prediction.current!.expectedNext, now: false });
  });

  it('notes emergency contraception instead of suggesting it again', () => {
    const logs = withContacts(periods(starts), { [day(10)]: sex(['vaginal'], ['none', 'emergency']) });
    const summary = summarizePregnancyRisk(buildTimeline(logs, profile(), day(11)), logs, true);
    expect(summary.emergency).toBeUndefined();
    expect(summary.emergencyTaken).toBe(true);
  });

  it('suggests a test now when the period is late after a contact', () => {
    const logs = withContacts(periods(starts), { [day(12)]: sex(['vaginal'], ['condom']) });
    const summary = summarizePregnancyRisk(buildTimeline(logs, profile(), day(34)), logs, true);
    expect(summary.highest?.risk).toBe('low');
    expect(summary.test?.now).toBe(true);
  });

  it('says nothing about tests when only low-risk or no contacts were logged', () => {
    const logs = withContacts(periods(starts), { [day(20)]: sex(['vaginal'], ['pill']) });
    const summary = summarizePregnancyRisk(buildTimeline(logs, profile(), day(22)), logs, true);
    expect(summary.test).toBeUndefined();
    expect(summary.emergency).toBeUndefined();
    const none = summarizePregnancyRisk(buildTimeline(periods(starts), profile(), day(22)), periods(starts), true);
    expect(none.contacts).toEqual([]);
    expect(none.highest).toBeUndefined();
  });

  it('only looks at the current cycle', () => {
    const logs = withContacts(periods(starts), { [day(-10)]: sex(['vaginal'], ['none']) });
    const summary = summarizePregnancyRisk(buildTimeline(logs, profile(), day(11)), logs, true);
    expect(summary.contacts).toEqual([]);
  });

  it('without any period logged, a test is suggested three weeks after the contact', () => {
    const today = '2026-11-15';
    const logs = withContacts({}, { '2026-11-12': sex(['vaginal'], ['none']) });
    const summary = summarizePregnancyRisk(buildTimeline(logs, profile(), today), logs, true);
    expect(summary.highest?.risk).toBe('moderate');
    expect(summary.test).toEqual({ from: '2026-12-03', now: false });
  });
});
