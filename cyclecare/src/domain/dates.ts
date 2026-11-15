import type { ISODate } from './types';

/**
 * Calendar-day arithmetic on `YYYY-MM-DD` strings.
 * Days are converted to an integer "day number" through UTC, so daylight-saving changes
 * and the device time zone can never add or drop a day.
 */

const MS_PER_DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDayNumber(iso: ISODate): number {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Invalid date: ${iso}`);
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY);
}

export function fromDayNumber(n: number): ISODate {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false;
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

export function makeISO(year: number, month1: number, day: number): ISODate {
  return `${String(year).padStart(4, '0')}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromDayNumber(toDayNumber(iso) + days);
}

/** `a − b` in whole days. */
export function diffDays(a: ISODate, b: ISODate): number {
  return toDayNumber(a) - toDayNumber(b);
}

/** The local calendar day of `now`. */
export function todayISO(now: Date = new Date()): ISODate {
  return makeISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function parts(iso: ISODate): { year: number; month: number; day: number } {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)), day: Number(iso.slice(8, 10)) };
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** 0 = Monday … 6 = Sunday (weeks start on Monday in Romania). */
export function weekdayMondayFirst(iso: ISODate): number {
  const js = new Date(toDayNumber(iso) * MS_PER_DAY).getUTCDay();
  return (js + 6) % 7;
}

export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -weekdayMondayFirst(iso));
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7);
}

export function addMonths(year: number, month1: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month1 - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

/** Six-week (or shorter) grid for a month, Monday-first, padded with neighbouring months' days. */
export function monthGrid(year: number, month1: number): ISODate[][] {
  const first = makeISO(year, month1, 1);
  const last = makeISO(year, month1, daysInMonth(year, month1));
  let cursor = startOfWeek(first);
  const weeks: ISODate[][] = [];
  while (cursor <= last) {
    const week: ISODate[] = [];
    for (let i = 0; i < 7; i++) week.push(addDays(cursor, i));
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let n = toDayNumber(from), end = toDayNumber(to); n <= end; n++) out.push(fromDayNumber(n));
  return out;
}

export function clampDate(iso: ISODate, min: ISODate, max: ISODate): ISODate {
  return iso < min ? min : iso > max ? max : iso;
}

/** A `Date` at UTC midnight for the given day; format it with `timeZone: 'UTC'`. */
export function toUTCDate(iso: ISODate): Date {
  return new Date(toDayNumber(iso) * MS_PER_DAY);
}

/** Local `Date` for a calendar day and an `HH:MM` wall-clock time. */
export function atLocalTime(iso: ISODate, time: string): Date {
  const { year, month, day } = parts(iso);
  const [h, min] = time.split(':').map(Number);
  return new Date(year, month - 1, day, h ?? 0, min ?? 0, 0, 0);
}
