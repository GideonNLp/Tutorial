import { describe, expect, it } from 'vitest';
import { buildCycles, cycleAt, extractEpisodes } from '../src/domain/cycles';
import type { DayLogs } from '../src/domain/types';
import { NOW, periods, startsFrom } from './helpers';

const day = (date: string, flow: DayLogs[string]['flow']): DayLogs => ({ [date]: { date, flow, updatedAt: NOW } });

describe('bleeding episodes', () => {
  it('merges bleeding days separated by up to two dry days', () => {
    const logs = { ...day('2026-09-01', 'medium'), ...day('2026-09-02', 'heavy'), ...day('2026-09-05', 'light') };
    const episodes = extractEpisodes(logs);
    expect(episodes).toHaveLength(1);
    expect(episodes[0]).toMatchObject({ start: '2026-09-01', end: '2026-09-05', length: 5 });
    expect(episodes[0]!.days).toEqual(['2026-09-01', '2026-09-02', '2026-09-05']);
  });

  it('starts a new episode after three dry days', () => {
    const logs = { ...day('2026-09-01', 'medium'), ...day('2026-09-02', 'medium'), ...day('2026-09-06', 'light') };
    expect(extractEpisodes(logs).map((e) => e.start)).toEqual(['2026-09-01', '2026-09-06']);
  });

  it('ignores spotting but counts days marked as period without an intensity', () => {
    const logs = { ...day('2026-08-30', 'spotting'), ...day('2026-09-01', 'unspecified'), ...day('2026-09-02', 'spotting') };
    const episodes = extractEpisodes(logs);
    expect(episodes).toHaveLength(1);
    expect(episodes[0]).toMatchObject({ start: '2026-09-01', end: '2026-09-01', length: 1 });
  });
});

describe('cycles', () => {
  it('measures a cycle from one period start to the next', () => {
    const cycles = buildCycles(periods(startsFrom('2026-08-01', [28, 31])));
    expect(cycles.map((c) => c.length)).toEqual([28, 31, undefined]);
    expect(cycles[0]).toMatchObject({ start: '2026-08-01', end: '2026-08-28', valid: true });
    expect(cycles[2]!.valid).toBe(false);
    expect(cycles[2]!.end).toBeUndefined();
  });

  it('treats bleeding that starts less than 15 days into a cycle as bleeding between periods', () => {
    const logs = { ...periods(['2026-08-01', '2026-08-29']), ...day('2026-08-12', 'light'), ...day('2026-08-13', 'light') };
    const cycles = buildCycles(logs);
    expect(cycles).toHaveLength(2);
    expect(cycles[0]!.length).toBe(28);
    expect(cycles[0]!.intermenstrual).toHaveLength(1);
    expect(cycles[0]!.intermenstrual[0]).toMatchObject({ start: '2026-08-12', end: '2026-08-13' });
  });

  it('accepts a 15-day cycle as a cycle', () => {
    const cycles = buildCycles(periods(['2026-08-01', '2026-08-16'], 3));
    expect(cycles.map((c) => c.length)).toEqual([15, undefined]);
  });

  it('keeps cycles longer than 90 days out of the statistics', () => {
    const cycles = buildCycles(periods(startsFrom('2026-01-01', [28, 120, 29])));
    expect(cycles.map((c) => c.valid)).toEqual([true, false, true, false]);
  });

  it('finds the cycle a date belongs to', () => {
    const cycles = buildCycles(periods(startsFrom('2026-08-01', [28, 31])));
    expect(cycleAt(cycles, '2026-07-31')).toBeUndefined();
    expect(cycleAt(cycles, '2026-08-01')!.index).toBe(0);
    expect(cycleAt(cycles, '2026-08-28')!.index).toBe(0);
    expect(cycleAt(cycles, '2026-08-29')!.index).toBe(1);
    expect(cycleAt(cycles, '2027-01-01')!.index).toBe(2);
  });

  it('returns nothing for an empty journal', () => {
    expect(buildCycles({})).toEqual([]);
  });
});
