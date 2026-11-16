import { parts, toUTCDate } from '../domain/dates';
import type { ISODate } from '../domain/types';
import { ro } from './ro';

/**
 * Internationalisation.
 *
 * Every user-facing string lives in a locale dictionary (`ro.ts`). Entries are plain strings or
 * small functions, so plurals and interpolation stay type-checked. To add a language:
 *   1. copy `ro.ts` to e.g. `en.ts` and translate it — `satisfies Dictionary` flags anything missing;
 *   2. translate the content files in `src/content/<locale>/`;
 *   3. register both below. The language picker in Settings lists every registered locale.
 */
export type Dictionary = typeof ro;

export const dictionaries = { ro } satisfies Record<string, Dictionary>;
export type Locale = keyof typeof dictionaries;
export const DEFAULT_LOCALE: Locale = 'ro';

let active: Locale = DEFAULT_LOCALE;

export function setLocale(locale: Locale): void {
  active = locale;
  formatters.clear();
  if (typeof document !== 'undefined') document.documentElement.lang = dictionaries[locale].meta.htmlLang;
}

export function getLocale(): Locale {
  return active;
}

/** The active dictionary. */
export function strings(): Dictionary {
  return dictionaries[active];
}

export type DateStyle =
  | 'full' // duminică, 15 noiembrie 2026
  | 'long' // 15 noiembrie 2026
  | 'weekdayDayMonth' // duminică, 15 noiembrie
  | 'dayMonthLong' // 15 noiembrie
  | 'dayMonth' // 15 nov.
  | 'monthYear' // noiembrie 2026
  | 'monthShort' // nov.
  | 'weekdayLong' // duminică
  | 'numeric'; // 15.11.2026

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  weekdayDayMonth: { weekday: 'long', day: 'numeric', month: 'long' },
  dayMonthLong: { day: 'numeric', month: 'long' },
  dayMonth: { day: 'numeric', month: 'short' },
  monthYear: { month: 'long', year: 'numeric' },
  monthShort: { month: 'short' },
  weekdayLong: { weekday: 'long' },
  numeric: { day: '2-digit', month: '2-digit', year: 'numeric' },
};

const formatters = new Map<string, Intl.DateTimeFormat>();

export function formatDate(iso: ISODate, style: DateStyle): string {
  let f = formatters.get(style);
  if (!f) {
    f = new Intl.DateTimeFormat(dictionaries[active].meta.intl, { ...DATE_OPTIONS[style], timeZone: 'UTC' });
    formatters.set(style, f);
  }
  return f.format(toUTCDate(iso));
}

/** "12–18 nov." inside one month, "30 nov. – 6 dec." across months. */
export function formatRange(from: ISODate, to: ISODate): string {
  if (from === to) return formatDate(from, 'dayMonth');
  const a = parts(from);
  const b = parts(to);
  if (a.year === b.year && a.month === b.month) return `${a.day}–${formatDate(to, 'dayMonth')}`;
  return `${formatDate(from, 'dayMonth')} – ${formatDate(to, 'dayMonth')}`;
}

export function formatMonthKey(month: string, style: 'monthYear' | 'monthShort' = 'monthYear'): string {
  return formatDate(`${month}-01`, style);
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(dictionaries[active].meta.intl, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
