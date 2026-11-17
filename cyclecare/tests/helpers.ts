import { addDays } from '../src/domain/dates';
import type { DayLogs, Flow, ISODate, Profile } from '../src/domain/types';

export const NOW = '2026-11-15T08:00:00.000Z';

/** Journal with one period per start date; each period lasts `days` days with the given flow. */
export function periods(starts: ISODate[], days = 5, flow: Flow = 'medium'): DayLogs {
  const logs: DayLogs = {};
  for (const start of starts) {
    for (let d = 0; d < days; d++) {
      const date = addDays(start, d);
      logs[date] = { date, flow, updatedAt: NOW };
    }
  }
  return logs;
}

/** Period start dates produced by walking forward from `first` with the given cycle lengths. */
export function startsFrom(first: ISODate, lengths: number[]): ISODate[] {
  const out = [first];
  for (const l of lengths) out.push(addDays(out[out.length - 1]!, l));
  return out;
}

export const profile = (over: Partial<Profile> = {}): Profile => ({ goals: [], showFertility: true, showIntimacy: true, ...over });
