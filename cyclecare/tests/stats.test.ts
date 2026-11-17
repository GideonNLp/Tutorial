import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates';
import { sampleJournal } from './fixtures/sampleJournal';
import { computeFlags, recentSymptoms } from '../src/domain/insights';
import { buildTimeline, currentPhase } from '../src/domain/prediction';
import { bbtSeries, cycleRows, lastMonths, moodByPhase, moodSeries, monthlyMood, periodRuns, symptomMatrix } from '../src/domain/stats';
import type { DayLogs } from '../src/domain/types';
import { NOW, periods, profile } from './helpers';

const today = '2026-11-15';

describe('statistics', () => {
  it('lists the last months, oldest first, across a year boundary', () => {
    expect(lastMonths('2027-02-10', 4)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('counts symptom days per month and sorts by how often they occur', () => {
    const logs: DayLogs = {
      '2026-10-03': { date: '2026-10-03', symptoms: { cramps: 3, headache: 1 }, updatedAt: NOW },
      '2026-10-04': { date: '2026-10-04', symptoms: { cramps: 2 }, updatedAt: NOW },
      '2026-11-02': { date: '2026-11-02', symptoms: { cramps: 3 }, updatedAt: NOW },
      '2026-03-02': { date: '2026-03-02', symptoms: { nausea: 1 }, updatedAt: NOW }, // outside the range
    };
    const m = symptomMatrix(logs, today, 3);
    expect(m.months).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(m.rows).toEqual([
      { symptom: 'cramps', counts: [0, 2, 1], severe: [0, 1, 1], total: 3 },
      { symptom: 'headache', counts: [0, 1, 0], severe: [0, 0, 0], total: 1 },
    ]);
    expect(m.max).toBe(2);
  });

  it('averages mood and energy per week and per month', () => {
    const logs: DayLogs = {
      '2026-11-09': { date: '2026-11-09', mood: 2, energy: 4, updatedAt: NOW },
      '2026-11-11': { date: '2026-11-11', mood: 4, updatedAt: NOW },
      '2026-11-03': { date: '2026-11-03', mood: 5, energy: 5, updatedAt: NOW },
    };
    const weeks = moodSeries(logs, today, 3);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
    expect(weeks[2]).toMatchObject({ mood: 3, energy: 4, days: 2 });
    expect(weeks[0]).toMatchObject({ mood: undefined, energy: undefined, days: 0 });
    expect(monthlyMood(logs, today, 1)[0]).toMatchObject({ month: '2026-11', mood: 11 / 3, energy: 4.5, days: 3 });
  });

  it('groups mood by cycle phase', () => {
    const logs = periods(['2026-10-18']);
    logs['2026-10-18']!.mood = 2;
    logs['2026-10-25'] = { date: '2026-10-25', mood: 4, energy: 5, updatedAt: NOW };
    const byPhase = moodByPhase(logs, buildTimeline(logs, profile(), today));
    expect(byPhase.find((p) => p.phase === 'menstruation')).toMatchObject({ mood: 2, days: 1 });
    expect(byPhase.find((p) => p.phase === 'follicular')).toMatchObject({ mood: 4, energy: 5, days: 1 });
    expect(byPhase.find((p) => p.phase === 'luteal')).toMatchObject({ mood: undefined, days: 0 });
  });

  it('describes cycles for the history chart', () => {
    const logs = periods(['2026-09-20', '2026-10-18'], 4, 'heavy');
    const rows = cycleRows(buildTimeline(logs, profile(), today), logs);
    expect(rows).toEqual([
      { start: '2026-09-20', length: 28, periodLength: 4, heavyDays: 4, valid: true, current: false },
      { start: '2026-10-18', length: undefined, periodLength: 4, heavyDays: 4, valid: false, current: true },
    ]);
  });

  it('returns temperature points and period runs for charts', () => {
    const logs = periods(['2026-11-01']);
    logs['2026-11-03']!.bbt = { celsius: 36.4, source: 'manual' };
    logs['2026-11-10'] = { date: '2026-11-10', bbt: { celsius: 36.7, source: 'import', device: 'x' }, updatedAt: NOW };
    const t = buildTimeline(logs, profile(), today);
    expect(bbtSeries(logs, t, '2026-11-01', today)).toEqual([
      { date: '2026-11-03', celsius: 36.4, cycleDay: 3 },
      { date: '2026-11-10', celsius: 36.7, cycleDay: 10 },
    ]);
    expect(periodRuns(t, '2026-11-03', today)).toEqual([['2026-11-03', '2026-11-05']]);
  });
});

describe('demo data', () => {
  const { logs, profile: demoProfile } = sampleJournal(today, NOW);
  const t = buildTimeline(logs, demoProfile, today);

  it('is deterministic and never dated in the future', () => {
    expect(sampleJournal(today, NOW).logs).toEqual(logs);
    expect(Object.keys(logs).every((d) => d <= today)).toBe(true);
  });

  it('contains seven completed cycles and one in progress on day 12', () => {
    expect(t.cycles.map((c) => c.length)).toEqual([27, 28, 29, 26, 30, 27, 28, undefined]);
    expect(t.prediction.current).toMatchObject({ cycleDay: 12, start: addDays(today, -11) });
    expect(t.prediction).toMatchObject({ basis: 'history', sampleSize: 6, cycleLength: 28, confidence: 'high' });
    expect(currentPhase(t)).toBe('follicular');
  });

  it('shows off the tips and the flags', () => {
    expect(computeFlags(t, logs).map((f) => f.id)).toContain('symptom_severe:cramps');
    expect(recentSymptoms(logs, today).map((s) => s.symptom)).toEqual(expect.arrayContaining(['cramps', 'headache']));
    expect(symptomMatrix(logs, today, 6).rows.length).toBeGreaterThan(4);
    expect(bbtSeries(logs, t, addDays(today, -60), today).length).toBeGreaterThan(30);
  });
});
