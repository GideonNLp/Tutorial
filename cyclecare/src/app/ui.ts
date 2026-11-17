import { addMonths, parts, todayISO } from '../domain/dates';
import type { ISODate } from '../domain/types';
import { createStore, useStore } from './miniStore';
import { navigate } from './router';

/** View state that is not worth a URL: the day open in the journal, the month shown, toasts. */
export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
  /** Set for the last moments on screen, so the toast can animate out. */
  leaving?: boolean;
}

/** Journal sections that fold into a compact summary after "Salvare". */
export const JOURNAL_SECTIONS = ['flow', 'symptoms', 'mood', 'energy', 'bbt', 'mucus', 'intimacy', 'note'] as const;
export type JournalSection = (typeof JOURNAL_SECTIONS)[number];

interface UiState {
  journalDate: ISODate;
  /** Sections shown in full, per day. A day not in the map has not been opened yet. */
  journalOpen: Record<ISODate, readonly JournalSection[]>;
  calendarYear: number;
  calendarMonth: number;
  calendarSelected: ISODate;
  toasts: Toast[];
}

const now = todayISO();
const ui = createStore<UiState>({
  journalDate: now,
  journalOpen: {},
  calendarYear: parts(now).year,
  calendarMonth: parts(now).month,
  calendarSelected: now,
  toasts: [],
});

export const useJournalDate = () => useStore(ui, (s) => s.journalDate);
export const useCalendarYear = () => useStore(ui, (s) => s.calendarYear);
export const useCalendarMonth = () => useStore(ui, (s) => s.calendarMonth);
export const useCalendarSelected = () => useStore(ui, (s) => s.calendarSelected);
export const useToasts = () => useStore(ui, (s) => s.toasts);
export const useJournalOpen = (date: ISODate) => useStore(ui, (s) => s.journalOpen[date]);

export function setJournalOpen(date: ISODate, sections: readonly JournalSection[]): void {
  ui.set((s) => ({ ...s, journalOpen: { ...s.journalOpen, [date]: sections } }));
}

export function setJournalDate(date: ISODate): void {
  ui.set((s) => ({ ...s, journalDate: date }));
}

export function openJournal(date: ISODate): void {
  setJournalDate(date);
  navigate('jurnal');
}

export function showMonth(year: number, month: number): void {
  ui.set((s) => ({ ...s, calendarYear: year, calendarMonth: month }));
}

export function shiftMonth(delta: number): void {
  const s = ui.get();
  const next = addMonths(s.calendarYear, s.calendarMonth, delta);
  showMonth(next.year, next.month);
}

export function selectCalendarDay(date: ISODate): void {
  const { year, month } = parts(date);
  ui.set((s) => ({ ...s, calendarSelected: date, calendarYear: year, calendarMonth: month }));
}

let toastId = 0;
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();
const TOAST_EXIT_MS = 180;

export function dismissToast(id: number): void {
  clearTimeout(toastTimers.get(id));
  if (!ui.get().toasts.some((t) => t.id === id && !t.leaving)) return;
  ui.set((s) => ({ ...s, toasts: s.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)) }));
  toastTimers.set(
    id,
    setTimeout(() => {
      toastTimers.delete(id);
      ui.set((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }));
    }, TOAST_EXIT_MS),
  );
}

/**
 * Short confirmation, announced politely to screen readers. With an `action` (for example "Undo")
 * it stays a little longer. Repeating the message that is already on screen restarts its timer
 * instead of stacking a copy.
 */
export function toast(message: string, options: { action?: ToastAction; duration?: number } = {}): number {
  const duration = options.duration ?? (options.action ? 7000 : 4000);
  const existing = ui.get().toasts.find((t) => t.message === message && !t.leaving);
  const id = existing?.id ?? ++toastId;
  const next: Toast = { id, message, action: options.action };
  if (existing) {
    ui.set((s) => ({ ...s, toasts: s.toasts.map((t) => (t.id === id ? next : t)) }));
  } else {
    // At most three at a time: the oldest makes room.
    const visible = ui.get().toasts.filter((t) => !t.leaving);
    if (visible.length >= 3) dismissToast(visible[0]!.id);
    ui.set((s) => ({ ...s, toasts: [...s.toasts, next] }));
  }
  clearTimeout(toastTimers.get(id));
  toastTimers.set(
    id,
    setTimeout(() => dismissToast(id), duration),
  );
  return id;
}

export function resetUi(): void {
  toastTimers.forEach((timer) => clearTimeout(timer));
  toastTimers.clear();
  const today = todayISO();
  ui.set({
    journalDate: today,
    journalOpen: {},
    calendarYear: parts(today).year,
    calendarMonth: parts(today).month,
    calendarSelected: today,
    toasts: [],
  });
}
