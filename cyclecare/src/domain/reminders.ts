import { addDays, atLocalTime, eachDay, weekdayMondayFirst } from './dates';
import type { Prediction } from './prediction';
import type { ISODate, ReminderSettings } from './types';

/**
 * Reminders are computed, not stored: from the settings and the current prediction we derive
 * the list of occurrences in a time range. A native build hands the same list to the OS scheduler
 * (UNUserNotificationCenter / AlarmManager); the web prototype shows them while the app is open.
 */

export type ReminderKind = 'period' | 'fertile' | 'medication';

export interface ReminderOccurrence {
  /** Unique and stable, so an occurrence is delivered once: `kind:date:time[:ref]`. */
  id: string;
  kind: ReminderKind;
  date: ISODate;
  /** `HH:MM`. */
  time: string;
  at: Date;
  /** Period / fertile reminders: days from this reminder to the estimated event (0 = that day). */
  daysBefore?: number;
  medicationId?: string;
  medicationName?: string;
}

function push(
  out: ReminderOccurrence[],
  kind: ReminderKind,
  date: ISODate,
  time: string,
  from: ISODate,
  to: ISODate,
  extra: Partial<ReminderOccurrence> = {},
  ref = '',
): void {
  if (date < from || date > to) return;
  const id = `${kind}:${date}:${time}${ref ? `:${ref}` : ''}`;
  if (out.some((o) => o.id === id)) return;
  out.push({ id, kind, date, time, at: atLocalTime(date, time), ...extra });
}

export function reminderOccurrences(
  settings: ReminderSettings,
  prediction: Prediction,
  showFertility: boolean,
  from: ISODate,
  to: ISODate,
): ReminderOccurrence[] {
  const out: ReminderOccurrence[] = [];

  if (settings.period.enabled && prediction.status !== 'late') {
    const { daysBefore, time, repeatDaily } = settings.period;
    for (const f of prediction.forecasts) {
      // Once, `daysBefore` days ahead — or every day from then until the estimated start.
      const last = repeatDaily ? 0 : daysBefore;
      for (let d = daysBefore; d >= last; d--) {
        push(out, 'period', addDays(f.start, -d), time, from, to, { daysBefore: d });
      }
    }
  }

  // While a period is late the fertile-day estimates are suspended (see buildTimeline), and so are their reminders.
  if (settings.fertile.enabled && showFertility && prediction.status !== 'late') {
    const { daysBefore, time, repeatDaily } = settings.fertile;
    const windows: Array<{ start: ISODate; end: ISODate }> = [];
    if (prediction.current) windows.push({ start: prediction.current.fertileStart, end: prediction.current.fertileEnd });
    for (const f of prediction.forecasts) windows.push({ start: f.fertileStart, end: f.fertileEnd });
    for (const w of windows) {
      push(out, 'fertile', addDays(w.start, -daysBefore), time, from, to, { daysBefore });
      if (repeatDaily) {
        for (const day of eachDay(w.start, w.end)) push(out, 'fertile', day, time, from, to, { daysBefore: 0 });
      }
    }
  }

  for (const med of settings.medications) {
    if (!med.enabled || !med.name.trim()) continue;
    for (const day of eachDay(from, to)) {
      if (med.weekdays.length > 0 && !med.weekdays.includes(weekdayMondayFirst(day))) continue;
      push(out, 'medication', day, med.time, from, to, { medicationId: med.id, medicationName: med.name }, med.id);
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Occurrences that should be shown now: already due, not older than `graceHours`, not delivered yet. */
export function dueReminders(occurrences: ReminderOccurrence[], fired: Record<string, string>, now: Date, graceHours = 12): ReminderOccurrence[] {
  const oldest = now.getTime() - graceHours * 3_600_000;
  return occurrences.filter((o) => o.at.getTime() <= now.getTime() && o.at.getTime() >= oldest && !fired[o.id]);
}

/** Drop delivery records older than `keepDays` so the vault does not grow forever. */
export function pruneFired(fired: Record<string, string>, now: Date, keepDays = 60): Record<string, string> {
  const cutoff = now.getTime() - keepDays * 86_400_000;
  const kept: Record<string, string> = {};
  for (const [id, at] of Object.entries(fired)) if (new Date(at).getTime() >= cutoff) kept[id] = at;
  return kept;
}
