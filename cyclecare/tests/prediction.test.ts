import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates';
import { buildTimeline, confidenceOf, currentPhase, estimateLength, intervalHalfWidth, ovulationOffset, phaseAt } from '../src/domain/prediction';
import type { DayLogs } from '../src/domain/types';
import { NOW, periods, profile, startsFrom } from './helpers';

describe('moving average and variability (steps 5–6)', () => {
  it('uses the declared length when nothing is recorded yet', () => {
    const e = estimateLength([], 28);
    expect(e).toMatchObject({ sampleSize: 0, effectiveSize: 3, mean: 28, sd: 3 });
    expect(intervalHalfWidth(e)).toBe(4);
  });

  it('fills missing observations with the declared length until three cycles exist', () => {
    expect(estimateLength([33], 28).mean).toBeCloseTo((33 + 28 + 28) / 3, 6);
    expect(estimateLength([33, 31], 28).mean).toBeCloseTo((33 + 31 + 28) / 3, 6);
    expect(estimateLength([33, 31, 32], 28).mean).toBeCloseTo(32, 6);
  });

  it('blends the measured variability with the assumed one', () => {
    const e = estimateLength([27, 28, 29], 28);
    expect(e.mean).toBe(28);
    expect(e.sd).toBeCloseTo(Math.sqrt((2 * 1 + 2 * 9) / 4), 6); // 2.236
    expect(intervalHalfWidth(e)).toBe(3);
  });

  it('narrows the interval for regular cycles and widens it for irregular ones', () => {
    const regular = estimateLength([28, 28, 28, 28, 28, 28], 28);
    const typical = estimateLength([28, 26, 31, 27, 29, 28], 28);
    const irregular = estimateLength([24, 36, 29, 40, 26, 33], 28);
    expect(intervalHalfWidth(regular)).toBe(2);
    expect(intervalHalfWidth(typical)).toBe(3);
    expect(intervalHalfWidth(irregular)).toBeGreaterThanOrEqual(6);
    expect(typical.mean).toBeCloseTo(169 / 6, 6);
  });

  it('grows the interval for cycles further ahead', () => {
    const e = estimateLength([28, 26, 31, 27, 29, 28], 28);
    const widths = [1, 2, 3].map((k) => intervalHalfWidth(e, k));
    expect(widths[1]!).toBeGreaterThan(widths[0]!);
    expect(widths[2]!).toBeGreaterThan(widths[1]!);
  });

  it('grades confidence from the number of cycles and the interval width', () => {
    expect(confidenceOf(0, 4)).toBe('low');
    expect(confidenceOf(2, 4)).toBe('medium');
    expect(confidenceOf(6, 3)).toBe('high');
    expect(confidenceOf(6, 7)).toBe('low');
  });
});

describe('phases (step 9)', () => {
  it('places ovulation 14 days before the next period', () => {
    expect(ovulationOffset(28)).toBe(13); // cycle day 14
    expect(ovulationOffset(32)).toBe(17); // cycle day 18
    expect(ovulationOffset(21)).toBe(6); // cycle day 7
  });

  it('splits a 28-day cycle with a 5-day period into the four phases', () => {
    const phases = Array.from({ length: 28 }, (_, d) => phaseAt(d, 28, 4));
    expect(phases.slice(0, 5).every((p) => p === 'menstruation')).toBe(true);
    expect(phases.slice(5, 12).every((p) => p === 'follicular')).toBe(true);
    expect(phases.slice(12, 15).every((p) => p === 'ovulation')).toBe(true);
    expect(phases.slice(15).every((p) => p === 'luteal')).toBe(true);
  });

  it('lets menstruation win when a short cycle makes phases overlap', () => {
    expect(phaseAt(5, 21, 6)).toBe('menstruation'); // would be the ovulation phase
    expect(phaseAt(7, 21, 6)).toBe('ovulation');
    expect(phaseAt(8, 21, 6)).toBe('luteal');
  });
});

describe('timeline', () => {
  const today = '2026-11-15';

  it('has nothing to predict without a recorded period', () => {
    const t = buildTimeline({}, profile(), today);
    expect(t.prediction).toMatchObject({ basis: 'none', status: 'no_data', forecasts: [] });
    expect(t.dayInfo(today).phase).toBeUndefined();
    expect(currentPhase(t)).toBeUndefined();
  });

  it('predicts from the declared values right after onboarding', () => {
    const start = '2026-11-04'; // cycle day 12 today
    const t = buildTimeline(periods([start], 5, 'unspecified'), profile({ typicalCycleLength: 30, typicalPeriodLength: 5 }), today);
    const p = t.prediction;
    expect(p).toMatchObject({ basis: 'declared', status: 'on_track', cycleLength: 30, periodLength: 5, halfWidth: 4, confidence: 'low' });
    expect(p.current).toMatchObject({
      cycleDay: 12,
      expectedNext: '2026-12-04',
      earliest: '2026-11-30',
      latest: '2026-12-08',
      daysUntil: 19,
      ovulation: '2026-11-19', // cycle day 16 = 30 − 14
      fertileStart: '2026-11-14',
      fertileEnd: '2026-11-20',
    });
    expect(currentPhase(t)).toBe('follicular');
    expect(t.dayInfo('2026-11-14')).toMatchObject({ fertile: true, ovulationDay: false, phase: 'follicular' });
    expect(t.dayInfo('2026-11-19')).toMatchObject({ fertile: true, ovulationDay: true, phase: 'ovulation' });
    expect(t.dayInfo('2026-11-22').phase).toBe('luteal');
  });

  it('falls back to 28/5 when the optional questions were skipped', () => {
    const t = buildTimeline(periods(['2026-11-10'], 1, 'unspecified'), profile(), today);
    expect(t.prediction).toMatchObject({ basis: 'default', cycleLength: 28, periodLength: 5 });
  });

  it('adjusts automatically as cycles are recorded (moving average of the last six)', () => {
    const lengths = [40, 40, 28, 26, 31, 27, 29, 28]; // the two 40s fall out of the window
    const starts = startsFrom('2026-03-01', lengths);
    const t = buildTimeline(periods(starts), profile({ typicalCycleLength: 35 }), addDays(starts.at(-1)!, 10));
    expect(t.stats.lengths).toEqual([28, 26, 31, 27, 29, 28]);
    expect(t.prediction).toMatchObject({ basis: 'history', sampleSize: 6, cycleLength: 28, halfWidth: 3, confidence: 'high' });
    expect(t.stats.shortest).toBe(26);
    expect(t.stats.longest).toBe(31);

    const withOneMore = buildTimeline(periods(startsFrom('2026-03-01', [...lengths, 34])), profile(), addDays(starts.at(-1)!, 40));
    expect(withOneMore.stats.lengths).toEqual([26, 31, 27, 29, 28, 34]);
    expect(withOneMore.prediction.cycleLength).toBe(29);
  });

  it('leaves out cycles longer than 90 days', () => {
    const starts = startsFrom('2026-01-01', [28, 120, 30]);
    const t = buildTimeline(periods(starts), profile(), addDays(starts.at(-1)!, 5));
    expect(t.stats.lengths).toEqual([28, 30]);
    // (28 + 30 + one declared/default 28) / 3
    expect(t.stats.cycle.mean).toBeCloseTo(86 / 3, 6);
  });

  it('gives an interval, not just a date, and marks the status around it', () => {
    const start = '2026-10-18';
    const logs = periods([start], 5, 'unspecified');
    const p = profile({ typicalCycleLength: 28 });
    // expected 15 Nov, interval 11–19 Nov
    expect(buildTimeline(logs, p, '2026-11-10').prediction.status).toBe('on_track');
    expect(buildTimeline(logs, p, '2026-11-11').prediction.status).toBe('due');
    expect(buildTimeline(logs, p, '2026-11-19').prediction.status).toBe('due');
    const late = buildTimeline(logs, p, '2026-11-22');
    expect(late.prediction.status).toBe('late');
    expect(late.prediction.current!.daysUntil).toBe(-7);
    // A late period is drawn from today, never in the past.
    expect(late.prediction.forecasts[0]).toMatchObject({ start: '2026-11-22', earliest: '2026-11-22', latest: '2026-11-22' });
    expect(late.dayInfo('2026-11-22')).toMatchObject({ periodPredicted: true, cycleDay: 36 });
    // Days after the expected start claim no phase, and no cycle is projected past "it may start any day".
    expect(late.dayInfo('2026-11-14')).toMatchObject({ phase: 'luteal', overdue: false });
    expect(late.dayInfo('2026-11-20')).toMatchObject({ periodPredicted: false, overdue: true });
    expect(late.dayInfo('2026-11-20').phase).toBeUndefined();
    expect(late.dayInfo('2026-11-26')).toMatchObject({ periodPredicted: true, phase: 'menstruation' });
    for (const day of ['2026-11-27', '2026-12-05', '2026-12-12']) {
      expect(late.dayInfo(day)).toMatchObject({ fertile: false, ovulationDay: false, periodPredicted: false });
      expect(late.dayInfo(day).phase).toBeUndefined();
    }
    expect(currentPhase(late)).toBe('luteal');
  });

  it('clips the interval to today while the period is due', () => {
    const t = buildTimeline(periods(['2026-10-18'], 5), profile({ typicalCycleLength: 28 }), '2026-11-13');
    expect(t.prediction.forecasts[0]).toMatchObject({ start: '2026-11-15', earliest: '2026-11-13', latest: '2026-11-19' });
  });

  it('projects three future cycles with widening intervals', () => {
    const t = buildTimeline(periods(['2026-11-04'], 5), profile({ typicalCycleLength: 28 }), today);
    const f = t.prediction.forecasts;
    expect(f.map((c) => c.start)).toEqual(['2026-12-02', '2026-12-30', '2027-01-27']);
    expect(f[0]).toMatchObject({
      periodEnd: '2026-12-06',
      ovulation: '2026-12-15',
      fertileStart: '2026-12-10',
      fertileEnd: '2026-12-16',
      end: '2026-12-29',
    });
    expect(t.dayInfo('2026-12-03')).toMatchObject({ periodPredicted: true, phase: 'menstruation', cycleDay: 2, forecast: true });
    expect(t.dayInfo('2027-02-23').phase).toBe('luteal');
    expect(t.dayInfo('2027-02-24').phase).toBeUndefined(); // beyond the forecast horizon
  });

  it('uses the real length of completed cycles when looking back', () => {
    const t = buildTimeline(periods(['2026-09-01', '2026-10-03'], 5), profile(), today); // 32-day cycle
    expect(t.dayInfo('2026-09-18')).toMatchObject({ ovulationDay: true, phase: 'ovulation', cycleDay: 18 });
    expect(t.dayInfo('2026-09-13').fertile).toBe(true);
    expect(t.dayInfo('2026-09-12').fertile).toBe(false);
    expect(t.dayInfo('2026-09-03')).toMatchObject({ periodLogged: true, phase: 'menstruation' });
  });

  it('assumes a period that just started will last its usual length', () => {
    const logs = periods(['2026-11-14'], 2); // logged 14 and 15 Nov
    const t = buildTimeline(logs, profile({ typicalPeriodLength: 5 }), today);
    expect(t.prediction.current).toMatchObject({ periodLikelyOngoing: true, periodEnd: '2026-11-18' });
    expect(t.dayInfo('2026-11-15')).toMatchObject({ periodLogged: true, periodPredicted: false });
    expect(t.dayInfo('2026-11-17')).toMatchObject({ periodLogged: false, periodPredicted: true, phase: 'menstruation' });
    expect(t.dayInfo('2026-11-19').phase).toBe('follicular');
    expect(currentPhase(t)).toBe('menstruation');
  });

  it('stops assuming once several days pass without bleeding', () => {
    const logs = periods(['2026-11-08'], 2); // 8–9 Nov, nothing since
    const t = buildTimeline(logs, profile({ typicalPeriodLength: 6 }), '2026-11-13');
    expect(t.prediction.current!.periodLikelyOngoing).toBe(false);
    expect(t.dayInfo('2026-11-11')).toMatchObject({ phase: 'follicular', periodPredicted: false });
    expect(t.dayInfo('2026-11-13').phase).toBe('follicular');
  });

  it('estimates period length from logged periods, ignoring single-day entries', () => {
    const starts = startsFrom('2026-06-01', [28, 28, 28, 28]);
    const logs: DayLogs = { ...periods(starts.slice(0, 4), 4), ...periods([starts[4]!], 1) };
    const t = buildTimeline(logs, profile({ typicalPeriodLength: 7 }), addDays(starts[4]!, 10));
    expect(t.stats.periodLengths).toEqual([4, 4, 4, 4]);
    expect(t.prediction.periodLength).toBe(4);
  });

  it('flags bleeding between periods on the day itself', () => {
    const logs: DayLogs = {
      ...periods(['2026-10-01', '2026-10-29']),
      '2026-10-14': { date: '2026-10-14', flow: 'light', updatedAt: NOW },
      '2026-10-20': { date: '2026-10-20', flow: 'spotting', updatedAt: NOW },
    };
    const t = buildTimeline(logs, profile(), today);
    expect(t.dayInfo('2026-10-14')).toMatchObject({ intermenstrualBleed: true, periodLogged: false });
    expect(t.dayInfo('2026-10-20')).toMatchObject({ spotting: true, periodLogged: false });
    expect(t.cycles[0]!.length).toBe(28);
  });
});

describe('worked examples in docs/03-algoritm-predictie.md', () => {
  const example = (lengths: number[], declared: number) => {
    const e = estimateLength(lengths, declared);
    return { L: Math.round(e.mean), sd: Math.round(e.sd * 10) / 10, h: intervalHalfWidth(e), N: e.effectiveSize };
  };

  it('4.1 six recorded cycles', () => {
    expect(example([28, 29, 26, 30, 27, 28], 28)).toEqual({ L: 28, sd: 2, h: 3, N: 6 });
    const t = buildTimeline(periods(startsFrom('2026-05-20', [28, 29, 26, 30, 27, 28])), profile(), '2026-11-15');
    expect(t.prediction.current).toMatchObject({ start: '2026-11-04', expectedNext: '2026-12-02', earliest: '2026-11-29', latest: '2026-12-05' });
    expect(t.prediction.current).toMatchObject({ ovulation: '2026-11-17', fertileStart: '2026-11-12', fertileEnd: '2026-11-18' });
    expect(t.prediction.confidence).toBe('high');
  });

  it('4.2 only the onboarding answers', () => {
    expect(example([], 30)).toEqual({ L: 30, sd: 3, h: 4, N: 3 });
  });

  it('4.3 one recorded cycle that differs from the declared length', () => {
    expect(example([33], 28)).toEqual({ L: 30, sd: 3, h: 4, N: 3 });
  });

  it('4.4 irregular cycles', () => {
    expect(example([24, 36, 29, 40, 26, 34], 28)).toEqual({ L: 32, sd: 5.5, h: 8, N: 6 });
    expect(confidenceOf(6, 8)).toBe('low');
  });

  it('phase layout quoted for a 28-day cycle with a 5-day period', () => {
    const days = (phase: string) => Array.from({ length: 28 }, (_, d) => d + 1).filter((d) => phaseAt(d - 1, 28, 4) === phase);
    expect(days('menstruation')).toEqual([1, 2, 3, 4, 5]);
    expect(days('follicular')).toEqual([6, 7, 8, 9, 10, 11, 12]);
    expect(days('ovulation')).toEqual([13, 14, 15]);
    expect(days('luteal').at(0)).toBe(16);
    expect(ovulationOffset(32) + 1).toBe(18); // "ziua 18 într-unul de 32"
  });
});
