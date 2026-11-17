import { describe, expect, it } from 'vitest';
import { APPLIED_KEEP_DAYS, rotate, toggleApplied } from '../src/domain/tipRotation';
import { addDays } from '../src/domain/dates';
import { sanitizeAppData } from '../src/storage/backup';
import { NOW } from './helpers';

const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

describe('tip rotation', () => {
  it('shows three consecutive tips, starting somewhere new on every day of the cycle', () => {
    expect(rotate(seven, 0, 3)).toEqual(['a', 'b', 'c']);
    expect(rotate(seven, 1, 3)).toEqual(['d', 'e', 'f']);
    expect(rotate(seven, 2, 3)).toEqual(['g', 'a', 'b']);
    const starts = Array.from({ length: 7 }, (_, day) => rotate(seven, day, 3)[0]);
    expect(new Set(starts).size).toBe(7);
  });

  it('never shows the same set two days in a row', () => {
    for (let day = 1; day <= 40; day++) expect(rotate(seven, day, 3)).not.toEqual(rotate(seven, day - 1, 3));
  });

  it('"Alte idei" moves to the next set, and back around', () => {
    expect(rotate(seven, 12, 3, 1)).toEqual(rotate(seven, 13, 3));
    expect(rotate(seven, 12, 3, 7)).toEqual(rotate(seven, 12, 3));
  });

  it('copes with short lists and any seed', () => {
    expect(rotate(['a', 'b'], 5, 3)).toEqual(['a', 'b']);
    expect(rotate(seven, -4, 3)).toHaveLength(3);
  });
});

describe('"Am aplicat"', () => {
  const today = '2026-11-15';

  it('marks a tip for today, and a second press unmarks it', () => {
    const once = toggleApplied({}, 'fol-nut-1', today);
    expect(once).toEqual({ 'fol-nut-1': today });
    expect(toggleApplied(once, 'fol-nut-1', today)).toEqual({});
  });

  it('marks again a tip applied on an earlier day, and forgets old marks', () => {
    const old = addDays(today, -(APPLIED_KEEP_DAYS + 1));
    const next = toggleApplied({ 'fol-nut-1': '2026-11-10', 'men-sle-2': old }, 'fol-nut-1', today);
    expect(next).toEqual({ 'fol-nut-1': today });
  });

  it('is restored from a backup only when well formed', () => {
    const data = sanitizeAppData({ appliedTips: { 'fol-nut-3': '2026-11-14', bad: '2026-11-14', 'lut-ski-2': 'yesterday' } }, NOW);
    expect(data.appliedTips).toEqual({ 'fol-nut-3': '2026-11-14' });
  });
});
