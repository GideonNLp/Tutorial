import { describe, expect, it } from 'vitest';
import { buildTimeline } from '../src/domain/prediction';
import { dueReminders, pruneFired, reminderOccurrences } from '../src/domain/reminders';
import { emptyAppData, type ReminderSettings } from '../src/domain/types';
import { periods, profile } from './helpers';

const today = '2026-11-15';
// Period started 4 Nov, 28-day cycle → next expected 2 Dec; fertile window 12–18 Nov; then 10–16 Dec.
const prediction = buildTimeline(periods(['2026-11-04']), profile({ typicalCycleLength: 28 }), today).prediction;
const base = (): ReminderSettings => emptyAppData().reminders;

describe('reminder occurrences', () => {
  it('reminds once, a chosen number of days before the estimated period', () => {
    const s = base();
    s.period = { enabled: true, daysBefore: 2, time: '09:00', repeatDaily: false };
    const list = reminderOccurrences(s, prediction, true, today, '2026-12-10');
    expect(list.map((o) => o.id)).toEqual(['period:2026-11-30:09:00']);
    expect(list[0]).toMatchObject({ kind: 'period', daysBefore: 2, date: '2026-11-30', time: '09:00' });
    expect(list[0]!.at.getHours()).toBe(9);
  });

  it('can repeat daily until the estimated start', () => {
    const s = base();
    s.period = { enabled: true, daysBefore: 2, time: '08:30', repeatDaily: true };
    const list = reminderOccurrences(s, prediction, true, today, '2026-12-10');
    expect(list.map((o) => [o.date, o.daysBefore])).toEqual([
      ['2026-11-30', 2],
      ['2026-12-01', 1],
      ['2026-12-02', 0],
    ]);
  });

  it('covers later cycles too, inside the requested range', () => {
    const s = base();
    s.period = { enabled: true, daysBefore: 0, time: '09:00', repeatDaily: false };
    const list = reminderOccurrences(s, prediction, true, today, '2027-02-01');
    expect(list.map((o) => o.date)).toEqual(['2026-12-02', '2026-12-30', '2027-01-27']);
  });

  it('reminds about fertile days, unless fertility estimates are hidden', () => {
    const s = base();
    s.fertile = { enabled: true, daysBefore: 1, time: '10:00', repeatDaily: false };
    expect(reminderOccurrences(s, prediction, true, today, '2026-12-31').map((o) => o.date)).toEqual(['2026-12-09']);
    expect(reminderOccurrences(s, prediction, false, today, '2026-12-31')).toEqual([]);
    s.fertile.repeatDaily = true;
    const daily = reminderOccurrences(s, prediction, true, today, '2026-11-20');
    expect(daily.map((o) => o.date)).toEqual(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18']);
  });

  it('schedules medication daily or on chosen weekdays', () => {
    const s = base();
    s.medications = [
      { id: 'pill', name: 'Pilula', time: '21:00', weekdays: [], enabled: true },
      { id: 'iron', name: 'Fier', time: '08:00', weekdays: [0, 3], enabled: true }, // Mon, Thu
      { id: 'off', name: 'Oprit', time: '12:00', weekdays: [], enabled: false },
    ];
    const list = reminderOccurrences(s, prediction, true, '2026-11-16', '2026-11-22');
    expect(list.filter((o) => o.medicationId === 'pill')).toHaveLength(7);
    expect(list.filter((o) => o.medicationId === 'iron').map((o) => o.date)).toEqual(['2026-11-16', '2026-11-19']);
    expect(list.some((o) => o.medicationId === 'off')).toBe(false);
    expect(list[0]).toMatchObject({ id: 'medication:2026-11-16:08:00:iron', medicationName: 'Fier' });
  });

  it('stops period reminders once the period is late', () => {
    const late = buildTimeline(periods(['2026-10-01']), profile({ typicalCycleLength: 28 }), today).prediction;
    const s = base();
    s.period = { enabled: true, daysBefore: 0, time: '09:00', repeatDaily: false };
    expect(late.status).toBe('late');
    expect(reminderOccurrences(s, late, true, today, '2026-12-31')).toEqual([]);
  });
});

describe('delivery', () => {
  const s = base();
  s.medications = [{ id: 'pill', name: 'Pilula', time: '21:00', weekdays: [], enabled: true }];
  const list = reminderOccurrences(s, prediction, true, '2026-11-14', '2026-11-16');

  it('delivers what is due, once, and not if it is too old', () => {
    const now = new Date(2026, 10, 15, 21, 5);
    expect(dueReminders(list, {}, now).map((o) => o.date)).toEqual(['2026-11-15']);
    expect(dueReminders(list, { 'medication:2026-11-15:21:00:pill': now.toISOString() }, now)).toEqual([]);
    expect(dueReminders(list, {}, new Date(2026, 10, 15, 20, 59)).map((o) => o.date)).toEqual([]);
    expect(dueReminders(list, {}, new Date(2026, 10, 15, 8, 0)).map((o) => o.date)).toEqual(['2026-11-14']);
  });

  it('forgets old delivery records', () => {
    const now = new Date(2026, 10, 15, 12, 0);
    const fired = { old: new Date(2026, 7, 1).toISOString(), recent: new Date(2026, 10, 1).toISOString() };
    expect(Object.keys(pruneFired(fired, now))).toEqual(['recent']);
  });
});
