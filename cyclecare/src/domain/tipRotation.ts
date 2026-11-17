import { addDays } from './dates';
import type { ISODate } from './types';

/**
 * Which tips are shown, out of a longer list: `count` consecutive ones (wrapping around),
 * starting at a position that moves by `count` for every step of `seed`. With 7 tips shown 3 at
 * a time, seven consecutive seeds start at seven different places, so the same set comes back
 * only after a week of cycle days. "Alte idei" adds one to `shift`, which shows the next set.
 */
export function rotate<T>(items: readonly T[], seed: number, count: number, shift = 0): T[] {
  if (items.length <= count) return [...items];
  const n = items.length;
  const start = ((((seed + shift) * count) % n) + n) % n;
  return Array.from({ length: count }, (_, i) => items[(start + i) % n]!);
}

/** Tips marked "Am aplicat" more than this long ago are forgotten. */
export const APPLIED_KEEP_DAYS = 60;

/** Marks or unmarks a tip as applied today; drops marks older than `APPLIED_KEEP_DAYS`. */
export function toggleApplied(applied: Record<string, ISODate>, id: string, today: ISODate): Record<string, ISODate> {
  const oldest = addDays(today, -APPLIED_KEEP_DAYS);
  const next: Record<string, ISODate> = {};
  for (const [key, date] of Object.entries(applied)) if (date >= oldest && key !== id) next[key] = date;
  if (applied[id] !== today) next[id] = today;
  return next;
}
