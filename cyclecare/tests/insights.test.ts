import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates';
import { computeFlags, recentSymptoms, visibleFlags } from '../src/domain/insights';
import { buildTimeline } from '../src/domain/prediction';
import type { DayLogs, Intensity, Scale5, SymptomId } from '../src/domain/types';
import { NOW, periods, profile, startsFrom } from './helpers';

const today = '2026-11-15';

function flagsFor(logs: DayLogs, at = today) {
  return computeFlags(buildTimeline(logs, profile(), at), logs);
}
function withSymptom(logs: DayLogs, date: string, id: SymptomId, intensity: Intensity = 2): DayLogs {
  const log = logs[date] ?? { date, updatedAt: NOW };
  logs[date] = { ...log, symptoms: { ...log.symptoms, [id]: intensity } };
  return logs;
}
const kinds = (logs: DayLogs, at = today) => flagsFor(logs, at).map((f) => f.id);

describe('cycle flags', () => {
  it('stays quiet for regular cycles', () => {
    const starts = startsFrom('2026-05-01', [28, 27, 29, 28, 28, 27]);
    expect(kinds(periods(starts), addDays(starts.at(-1)!, 8))).toEqual([]);
  });

  it('flags cycles shorter than 24 days when it happens at least twice', () => {
    const once = startsFrom('2026-05-01', [28, 22, 28, 28]);
    const twice = startsFrom('2026-05-01', [28, 22, 28, 21]);
    expect(kinds(periods(once), addDays(once.at(-1)!, 5))).not.toContain('cycle_short');
    const flags = flagsFor(periods(twice), addDays(twice.at(-1)!, 5));
    expect(flags.find((f) => f.kind === 'cycle_short')).toMatchObject({ severity: 'attention', values: { count: 2, days: 24 } });
  });

  it('flags cycles longer than 38 days when it happens at least twice', () => {
    const starts = startsFrom('2026-03-01', [40, 30, 41]);
    expect(kinds(periods(starts), addDays(starts.at(-1)!, 5))).toContain('cycle_long');
  });

  it('flags cycles that vary by more than nine days', () => {
    const steady = startsFrom('2026-05-01', [26, 30, 35]);
    const varied = startsFrom('2026-05-01', [26, 30, 36]);
    expect(kinds(periods(steady), addDays(steady.at(-1)!, 5))).not.toContain('cycle_irregular');
    const flag = flagsFor(periods(varied), addDays(varied.at(-1)!, 5)).find((f) => f.kind === 'cycle_irregular');
    expect(flag?.values).toEqual({ shortest: 26, longest: 36, range: 10 });
  });

  it('flags periods longer than eight days when it happens at least twice', () => {
    const starts = startsFrom('2026-06-01', [28, 28, 28]);
    expect(kinds(periods(starts, 9), addDays(starts.at(-1)!, 15))).toContain('period_long');
    expect(kinds(periods(starts, 8), addDays(starts.at(-1)!, 15))).not.toContain('period_long');
  });

  it('flags heavy flow on three or more days in two periods in a row', () => {
    const starts = startsFrom('2026-08-01', [28, 28]);
    expect(kinds(periods(starts, 4, 'heavy'), addDays(starts.at(-1)!, 10))).toContain('period_heavy');
    expect(kinds(periods(starts, 2, 'heavy'), addDays(starts.at(-1)!, 10))).not.toContain('period_heavy');
  });

  it('flags bleeding between periods seen in two recent cycles', () => {
    const starts = startsFrom('2026-08-01', [28, 28]);
    const logs = periods(starts);
    for (const start of starts.slice(0, 2)) {
      const d = addDays(start, 16);
      logs[d] = { date: d, flow: 'spotting', updatedAt: NOW };
    }
    expect(kinds(logs, addDays(starts.at(-1)!, 5))).toContain('bleeding_between');
    // Spotting right after a period is not counted.
    const edge = periods(starts);
    for (const start of starts) {
      const d = addDays(start, 6);
      edge[d] = { date: d, flow: 'spotting', updatedAt: NOW };
    }
    expect(kinds(edge, addDays(starts.at(-1)!, 8))).not.toContain('bleeding_between');
  });

  it('mentions a late period, and suggests a check after 90 days without one', () => {
    const logs = periods(['2026-10-01']);
    const late = flagsFor(logs, '2026-11-08'); // expected 29 Oct ± 4
    expect(late.find((f) => f.kind === 'period_late')).toMatchObject({ severity: 'info', values: { days: 10 }, id: 'period_late:2026-10-01' });
    const missing = flagsFor(logs, '2027-01-05');
    expect(missing.map((f) => f.kind)).toContain('no_period');
    expect(missing.map((f) => f.kind)).not.toContain('period_late');
  });
});

describe('symptom flags', () => {
  it('flags a symptom logged as severe on two days in the last 30', () => {
    const logs = periods(['2026-11-01']);
    withSymptom(logs, '2026-11-01', 'cramps', 3);
    expect(kinds(logs)).not.toContain('symptom_severe:cramps');
    withSymptom(logs, '2026-11-02', 'cramps', 3);
    const flag = flagsFor(logs).find((f) => f.id === 'symptom_severe:cramps');
    expect(flag).toMatchObject({ kind: 'symptom_severe', symptom: 'cramps', severity: 'attention', values: { days: 2, window: 30 } });
  });

  it('flags a symptom present on at least 7 of the last 14 days', () => {
    const logs = periods(['2026-11-01']);
    for (let d = 0; d < 6; d++) withSymptom(logs, addDays(today, -d), 'headache', 1);
    expect(kinds(logs)).not.toContain('symptom_persistent:headache');
    withSymptom(logs, addDays(today, -8), 'headache', 1);
    expect(kinds(logs)).toContain('symptom_persistent:headache');
  });

  it('notices a symptom that is new for this person', () => {
    const starts = startsFrom('2026-07-01', [28, 28, 28, 28]);
    const logs = periods(starts);
    for (let d = 0; d < 3; d++) withSymptom(logs, addDays(today, -d), 'dizziness', 1);
    const flag = flagsFor(logs).find((f) => f.id === 'symptom_new:dizziness');
    expect(flag).toMatchObject({ severity: 'info' });
    // Not new if it was logged before…
    withSymptom(logs, addDays(today, -40), 'dizziness', 1);
    expect(kinds(logs)).not.toContain('symptom_new:dizziness');
    // …and not flagged at all while the journal is still young.
    const young = periods(['2026-11-01']);
    for (let d = 0; d < 3; d++) withSymptom(young, addDays(today, -d), 'dizziness', 1);
    expect(kinds(young)).not.toContain('symptom_new:dizziness');
  });

  it('flags a low mood on at least 7 of the last 14 days', () => {
    const logs = periods(['2026-11-01']);
    for (let d = 0; d < 7; d++) {
      const date = addDays(today, -2 * d);
      logs[date] = { ...(logs[date] ?? { date, updatedAt: NOW }), mood: 2 as Scale5 };
    }
    expect(kinds(logs)).toContain('low_mood');
  });

  it('hides a dismissed flag for 30 days, then shows it again if it still applies', () => {
    const logs = periods(['2026-11-01']);
    withSymptom(logs, '2026-11-01', 'cramps', 3);
    withSymptom(logs, '2026-11-02', 'cramps', 3);
    const flags = flagsFor(logs);
    expect(visibleFlags(flags, {}, today)).toHaveLength(1);
    expect(visibleFlags(flags, { 'symptom_severe:cramps': '2026-11-10' }, today)).toHaveLength(0);
    expect(visibleFlags(flags, { 'symptom_severe:cramps': '2026-10-16' }, today)).toHaveLength(1);
  });

  it('puts flags worth a medical conversation before informational ones', () => {
    const starts = startsFrom('2026-07-01', [28, 28, 28, 28]);
    const logs = periods(starts);
    for (let d = 0; d < 3; d++) withSymptom(logs, addDays(today, -d), 'dizziness', 1);
    withSymptom(logs, addDays(today, -1), 'cramps', 3);
    withSymptom(logs, addDays(today, -2), 'cramps', 3);
    expect(flagsFor(logs).map((f) => f.severity)).toEqual(['attention', 'info']);
  });
});

describe('recent symptoms (tips)', () => {
  it('lists symptoms logged in the last three days or repeatedly in two weeks', () => {
    const logs: DayLogs = {};
    withSymptom(logs, addDays(today, -1), 'headache', 2);
    withSymptom(logs, addDays(today, -9), 'cramps', 3);
    withSymptom(logs, addDays(today, -10), 'cramps', 2);
    withSymptom(logs, addDays(today, -11), 'cramps', 1);
    withSymptom(logs, addDays(today, -8), 'acne', 1); // once, a week ago: not recent enough
    withSymptom(logs, addDays(today, -20), 'nausea', 1); // outside the window
    expect(recentSymptoms(logs, today)).toEqual([
      { symptom: 'cramps', days: 3, lastLogged: addDays(today, -9), maxIntensity: 3 },
      { symptom: 'headache', days: 1, lastLogged: addDays(today, -1), maxIntensity: 2 },
    ]);
  });
});
