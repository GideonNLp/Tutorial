import { addDays, diffDays } from './dates';
import { isPeriodFlow, type DayLogs, type ISODate } from './types';

/**
 * Cycles are never stored: they are derived from the daily flow entries every time.
 * That keeps one source of truth (the journal) and makes predictions adjust automatically
 * whenever a day is added, corrected or removed.
 */

/** Bleeding days separated by at most this many non-bleeding days belong to the same period. */
export const PERIOD_MERGE_GAP = 2;
/** A bleed that starts sooner than this after the previous cycle start is not a new cycle. */
export const MIN_CYCLE_LENGTH = 15;
/** Cycles longer than this are treated as a gap in the records and left out of the statistics. */
export const MAX_CYCLE_LENGTH = 90;

export interface BleedEpisode {
  /** First bleeding day. */
  start: ISODate;
  /** Last bleeding day. */
  end: ISODate;
  /** Days with a period flow logged (gap days inside the episode are not listed). */
  days: ISODate[];
  /** `end − start + 1`: gap days inside the episode count towards the length. */
  length: number;
}

export interface Cycle {
  /** 0-based position, oldest first. */
  index: number;
  /** Day 1: first day of the period that opens the cycle. */
  start: ISODate;
  period: BleedEpisode;
  /** Other bleeding episodes inside the cycle (bleeding between periods). */
  intermenstrual: BleedEpisode[];
  /** Last day of the cycle (the day before the next cycle starts). Undefined for the current cycle. */
  end?: ISODate;
  /** Completed cycles only. */
  length?: number;
  /** Completed and within the range used for statistics. */
  valid: boolean;
}

/** Step 1 — group period-flow days into bleeding episodes. Spotting is ignored. */
export function extractEpisodes(logs: DayLogs): BleedEpisode[] {
  const days = Object.keys(logs)
    .filter((date) => isPeriodFlow(logs[date]?.flow))
    .sort();
  const episodes: BleedEpisode[] = [];
  for (const day of days) {
    const last = episodes[episodes.length - 1];
    if (last && diffDays(day, last.end) <= PERIOD_MERGE_GAP + 1) {
      last.end = day;
      last.days.push(day);
      last.length = diffDays(last.end, last.start) + 1;
    } else {
      episodes.push({ start: day, end: day, days: [day], length: 1 });
    }
  }
  return episodes;
}

/** Steps 2–4 — decide which episodes open a cycle, measure completed cycles, mark outliers. */
export function buildCycles(logs: DayLogs): Cycle[] {
  const cycles: Cycle[] = [];
  for (const episode of extractEpisodes(logs)) {
    const current = cycles[cycles.length - 1];
    if (current && diffDays(episode.start, current.start) < MIN_CYCLE_LENGTH) {
      current.intermenstrual.push(episode);
      continue;
    }
    if (current) {
      current.end = addDays(episode.start, -1);
      current.length = diffDays(episode.start, current.start);
      current.valid = current.length <= MAX_CYCLE_LENGTH;
    }
    cycles.push({ index: cycles.length, start: episode.start, period: episode, intermenstrual: [], valid: false });
  }
  return cycles;
}

/** The cycle that contains `date`, if any (the open cycle contains every later day). */
export function cycleAt(cycles: Cycle[], date: ISODate): Cycle | undefined {
  let lo = 0;
  let hi = cycles.length - 1;
  let found: Cycle | undefined;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cycles[mid]!;
    if (c.start <= date) {
      found = c;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}
