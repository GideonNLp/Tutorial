import { strings } from '../i18n';
import { addDays } from '../domain/dates';
import { buildTimeline } from '../domain/prediction';
import { dueReminders, pruneFired, reminderOccurrences, type ReminderOccurrence } from '../domain/reminders';
import { showSystemNotification } from './platform';
import { flush, getState, lock, refreshToday, update } from './store';
import { toast } from './ui';

/**
 * Background behaviour while the app is open: auto-lock, keeping "today" current,
 * saving before the page is hidden, and delivering due reminders.
 */

/** What the person reads inside the unlocked app: always the full text. */
export function reminderText(o: ReminderOccurrence): { title: string; body: string } {
  const n = strings().notification;
  if (o.kind === 'period') return { title: n.periodTitle, body: n.period(o.daysBefore ?? 0) };
  if (o.kind === 'fertile') return { title: n.fertileTitle, body: n.fertile(o.daysBefore ?? 0) };
  return { title: n.medicationTitle, body: n.medication(o.medicationName ?? '') };
}

function deliverReminders(): void {
  const { status, data, today } = getState();
  if (status !== 'ready' || !data) return;
  const r = data.reminders;
  if (!r.period.enabled && !r.fertile.enabled && r.medications.length === 0) return;

  const now = new Date();
  const prediction = buildTimeline(data.logs, data.profile, today).prediction;
  const occurrences = reminderOccurrences(r, prediction, data.profile.showFertility, addDays(today, -1), today);
  const due = dueReminders(occurrences, data.firedReminders, now);
  if (due.length === 0) return;

  const n = strings().notification;
  for (const o of due) {
    const full = reminderText(o);
    toast(full.body);
    // On a lock screen the wording stays neutral unless the person chose otherwise.
    const shown = r.discreet ? { title: n.discreetTitle, body: n.discreetBody } : full;
    void showSystemNotification(shown.title, shown.body, o.id);
  }
  const firedAt = now.toISOString();
  update((d) => ({
    ...d,
    firedReminders: { ...pruneFired(d.firedReminders, now), ...Object.fromEntries(due.map((o) => [o.id, firedAt])) },
  }));
}

let hiddenAt: number | undefined;

function onVisibility(): void {
  const { prefs, hasPin } = getState();
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now();
    void flush();
    if (hasPin && prefs.autoLock === 0) void lock();
    return;
  }
  if (hasPin && prefs.autoLock !== 'never' && hiddenAt !== undefined) {
    if (Date.now() - hiddenAt >= prefs.autoLock * 60_000) void lock();
  }
  hiddenAt = undefined;
  refreshToday();
  deliverReminders();
}

export function startLifecycle(): () => void {
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', () => void flush());
  const timer = setInterval(() => {
    refreshToday();
    deliverReminders();
  }, 30_000);
  const first = setTimeout(deliverReminders, 1500);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    clearInterval(timer);
    clearTimeout(first);
  };
}
