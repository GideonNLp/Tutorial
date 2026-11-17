import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  eachDay,
  isValidISODate,
  monthGrid,
  startOfWeek,
  todayISO,
  weekdayMondayFirst,
} from '../src/domain/dates';

describe('dates', () => {
  it('adds and subtracts days across months, years and leap days', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-12-01', '2026-11-01')).toBe(30);
  });

  it('does not lose or gain a day around daylight-saving changes', () => {
    // Romania changes clocks on 29 March and 25 October 2026.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(diffDays('2026-03-30', '2026-03-28')).toBe(2);
    expect(diffDays('2026-10-26', '2026-10-24')).toBe(2);
    expect(eachDay('2026-10-24', '2026-10-27')).toHaveLength(4);
  });

  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('15.11.2026')).toBe(false);
    expect(isValidISODate(42)).toBe(false);
  });

  it('uses Monday as the first day of the week', () => {
    expect(weekdayMondayFirst('2026-11-15')).toBe(6); // Sunday
    expect(weekdayMondayFirst('2026-11-16')).toBe(0); // Monday
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09');
  });

  it('builds a Monday-first month grid padded with neighbouring days', () => {
    const grid = monthGrid(2026, 11);
    expect(grid).toHaveLength(6);
    expect(grid[0]![0]).toBe('2026-10-26');
    expect(grid[0]![6]).toBe('2026-11-01');
    expect(grid[5]![0]).toBe('2026-11-30');
    expect(monthGrid(2027, 2)).toHaveLength(4); // 1 Feb 2027 is a Monday, 28 days
  });

  it('handles month arithmetic', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(addMonths(2026, 11, 2)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('takes "today" from the local calendar, not from UTC', () => {
    expect(todayISO(new Date(2026, 10, 15, 23, 59))).toBe('2026-11-15');
    expect(todayISO(new Date(2026, 10, 15, 0, 1))).toBe('2026-11-15');
  });
});
