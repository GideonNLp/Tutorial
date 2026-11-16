import { addDays, addMonths, diffDays, eachDay, makeISO, monthKey, parts, startOfWeek } from './dates';
import type { Timeline } from './prediction';
import { PHASES, SYMPTOM_IDS, type DayLogs, type ISODate, type Phase, type SymptomId } from './types';

/** Aggregations behind the statistics screen and the PDF report. */

export interface CycleRow {
  start: ISODate;
  /** Undefined for the cycle that is still running. */
  length?: number;
  periodLength: number;
  heavyDays: number;
  /** Counts towards the averages. */
  valid: boolean;
  current: boolean;
}

export function cycleRows(timeline: Timeline, logs: DayLogs, max = 12): CycleRow[] {
  return timeline.cycles.slice(-max).map((c) => ({
    start: c.start,
    length: c.length,
    periodLength: c.period.length,
    heavyDays: c.period.days.filter((d) => logs[d]?.flow === 'heavy').length,
    valid: c.valid,
    current: c.length === undefined,
  }));
}

/** The last `count` calendar months, oldest first, as `YYYY-MM` keys. */
export function lastMonths(today: ISODate, count: number): string[] {
  const { year, month } = parts(today);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = addMonths(year, month, -i);
    keys.push(makeISO(m.year, m.month, 1).slice(0, 7));
  }
  return keys;
}

export interface SymptomRow {
  symptom: SymptomId;
  /** Days logged per month, aligned with `months`. */
  counts: number[];
  /** Days logged as severe per month. */
  severe: number[];
  total: number;
}

export interface SymptomMatrix {
  months: string[];
  rows: SymptomRow[];
  /** Highest single cell, for scaling a heatmap. */
  max: number;
}

export function symptomMatrix(logs: DayLogs, today: ISODate, monthCount = 6): SymptomMatrix {
  const months = lastMonths(today, monthCount);
  const index = new Map(months.map((m, i) => [m, i]));
  const rows = new Map<SymptomId, SymptomRow>();
  for (const [date, log] of Object.entries(logs)) {
    const i = index.get(monthKey(date));
    if (i === undefined || !log.symptoms || date > today) continue;
    for (const symptom of SYMPTOM_IDS) {
      const intensity = log.symptoms[symptom];
      if (intensity === undefined) continue;
      let row = rows.get(symptom);
      if (!row) {
        row = { symptom, counts: months.map(() => 0), severe: months.map(() => 0), total: 0 };
        rows.set(symptom, row);
      }
      row.counts[i]! += 1;
      if (intensity === 3) row.severe[i]! += 1;
      row.total += 1;
    }
  }
  const sorted = [...rows.values()].sort((a, b) => b.total - a.total);
  return { months, rows: sorted, max: Math.max(0, ...sorted.flatMap((r) => r.counts)) };
}

export interface WeekPoint {
  weekStart: ISODate;
  mood?: number;
  energy?: number;
  /** Days with a mood or energy entry in that week. */
  days: number;
}

function mean(values: number[]): number | undefined {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
}

/** Weekly averages of mood and energy (both on the same 1–5 scale), oldest first. */
export function moodSeries(logs: DayLogs, today: ISODate, weeks = 26): WeekPoint[] {
  const lastWeek = startOfWeek(today);
  const points: WeekPoint[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = addDays(lastWeek, -7 * w);
    const moods: number[] = [];
    const energies: number[] = [];
    let days = 0;
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      if (date > today) break;
      const log = logs[date];
      if (!log) continue;
      if (log.mood !== undefined) moods.push(log.mood);
      if (log.energy !== undefined) energies.push(log.energy);
      if (log.mood !== undefined || log.energy !== undefined) days++;
    }
    points.push({ weekStart, mood: mean(moods), energy: mean(energies), days });
  }
  return points;
}

export interface MonthMood {
  month: string;
  mood?: number;
  energy?: number;
  days: number;
}

export function monthlyMood(logs: DayLogs, today: ISODate, monthCount = 6): MonthMood[] {
  return lastMonths(today, monthCount).map((month) => {
    const moods: number[] = [];
    const energies: number[] = [];
    let days = 0;
    for (const [date, log] of Object.entries(logs)) {
      if (monthKey(date) !== month || date > today) continue;
      if (log.mood !== undefined) moods.push(log.mood);
      if (log.energy !== undefined) energies.push(log.energy);
      if (log.mood !== undefined || log.energy !== undefined) days++;
    }
    return { month, mood: mean(moods), energy: mean(energies), days };
  });
}

export interface PhaseMood {
  phase: Phase;
  mood?: number;
  energy?: number;
  days: number;
}

/** Average mood and energy by cycle phase, over the last `lookbackDays`. */
export function moodByPhase(logs: DayLogs, timeline: Timeline, lookbackDays = 183): PhaseMood[] {
  const from = addDays(timeline.today, -lookbackDays);
  const buckets = new Map<Phase, { moods: number[]; energies: number[]; days: number }>(PHASES.map((p) => [p, { moods: [], energies: [], days: 0 }]));
  for (const [date, log] of Object.entries(logs)) {
    if (date < from || date > timeline.today) continue;
    if (log.mood === undefined && log.energy === undefined) continue;
    const phase = timeline.dayInfo(date).phase;
    if (!phase) continue;
    const b = buckets.get(phase)!;
    if (log.mood !== undefined) b.moods.push(log.mood);
    if (log.energy !== undefined) b.energies.push(log.energy);
    b.days++;
  }
  return PHASES.map((phase) => {
    const b = buckets.get(phase)!;
    return { phase, mood: mean(b.moods), energy: mean(b.energies), days: b.days };
  });
}

export interface BbtPoint {
  date: ISODate;
  celsius: number;
  /** 1-based day in its cycle, when known. */
  cycleDay?: number;
}

export function bbtSeries(logs: DayLogs, timeline: Timeline, from: ISODate, to: ISODate): BbtPoint[] {
  const points: BbtPoint[] = [];
  for (const date of eachDay(from, to)) {
    const bbt = logs[date]?.bbt;
    if (bbt) points.push({ date, celsius: bbt.celsius, cycleDay: timeline.dayInfo(date).cycleDay });
  }
  return points;
}

/** Period-flow days inside a date range, as `[start, end]` runs — used to shade charts. */
export function periodRuns(timeline: Timeline, from: ISODate, to: ISODate): Array<[ISODate, ISODate]> {
  const runs: Array<[ISODate, ISODate]> = [];
  for (const c of timeline.cycles) {
    if (c.period.end < from || c.period.start > to) continue;
    runs.push([c.period.start < from ? from : c.period.start, c.period.end > to ? to : c.period.end]);
  }
  return runs;
}

export function journalSpanDays(logs: DayLogs, today: ISODate): number {
  const first = Object.keys(logs).sort()[0];
  return first ? diffDays(today, first) + 1 : 0;
}
