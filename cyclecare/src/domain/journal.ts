import type { DayLog, DayLogs, ISODate } from './types';

export type DayPatch = Partial<Omit<DayLog, 'date' | 'updatedAt'>>;

export function isEmptyLog(log: DayLog): boolean {
  return (
    log.flow === undefined &&
    log.mood === undefined &&
    log.energy === undefined &&
    log.bbt === undefined &&
    log.mucus === undefined &&
    log.intimacy === undefined &&
    !log.note &&
    (!log.symptoms || Object.keys(log.symptoms).length === 0)
  );
}

/**
 * Returns a new journal with `patch` applied to one day. A field set to `undefined` is removed,
 * and a day left with nothing in it is deleted, so the journal never holds empty entries.
 */
export function updateDay(logs: DayLogs, date: ISODate, patch: DayPatch, nowISO: string): DayLogs {
  const next: DayLog = { ...(logs[date] ?? { date, updatedAt: nowISO }), ...patch, date, updatedAt: nowISO };
  for (const key of Object.keys(next) as (keyof DayLog)[]) {
    if (next[key] === undefined) delete next[key];
  }
  if (next.symptoms && Object.keys(next.symptoms).length === 0) delete next.symptoms;
  if (typeof next.note === 'string') {
    next.note = next.note.trim();
    if (!next.note) delete next.note;
  }
  const result = { ...logs };
  if (isEmptyLog(next)) delete result[date];
  else result[date] = next;
  return result;
}
