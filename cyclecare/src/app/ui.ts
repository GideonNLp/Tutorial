import { addMonths, parts, todayISO } from '../domain/dates';
import type { ISODate } from '../domain/types';
import { createStore, useStore } from './miniStore';
import { navigate } from './router';

/** View state that is not worth a URL: the day open in the journal, the month shown, toasts. */
export interface Toast {
  id: number;
  message: string;
}

interface UiState {
  journalDate: ISODate;
  calendarYear: number;
  calendarMonth: number;
  calendarSelected: ISODate;
  toasts: Toast[];
}

const now = todayISO();
const ui = createStore<UiState>({
  journalDate: now,
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

/** Short confirmation, announced politely to screen readers. */
export function toast(message: string): void {
  const id = ++toastId;
  ui.set((s) => ({ ...s, toasts: [...s.toasts.slice(-2), { id, message }] }));
  setTimeout(() => ui.set((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
}

export function resetUi(): void {
  const today = todayISO();
  ui.set({
    journalDate: today,
    calendarYear: parts(today).year,
    calendarMonth: parts(today).month,
    calendarSelected: today,
    toasts: [],
  });
}
