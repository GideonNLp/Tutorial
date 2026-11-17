import { describe, expect, it } from 'vitest';
import { MASCOT_MOODS, mascotMessage, mascotMood } from '../src/domain/mascot';
import { dictionaries, type Locale } from '../src/i18n';

describe('the capybara on the dial', () => {
  it('takes the pose of the phase, and waves when there is no phase to show', () => {
    expect(mascotMood('menstruation', false)).toBe('menstruation');
    expect(mascotMood('follicular', false)).toBe('follicular');
    expect(mascotMood('ovulation', false)).toBe('ovulation');
    expect(mascotMood('luteal', false)).toBe('luteal');
    expect(mascotMood(undefined, false)).toBe('hello'); // no cycle yet, or estimates switched off
    expect(mascotMood('luteal', true)).toBe('hello'); // a late period: no phase is claimed
  });

  it('opens each day with a different message and moves on at every showing', () => {
    const messages = ['a', 'b', 'c'];
    expect(mascotMessage(messages, 12, 0)).toBe('a');
    expect(mascotMessage(messages, 13, 0)).toBe('b');
    expect([1, 2, 3].map((turn) => mascotMessage(messages, 12, turn))).toEqual(['b', 'c', 'a']);
    expect(mascotMessage([], 3, 1)).toBe('');
  });

  for (const locale of Object.keys(dictionaries) as Locale[]) {
    it(`has a few short messages for every pose in ${dictionaries[locale].meta.name}`, () => {
      const { messages } = dictionaries[locale].mascot;
      for (const mood of MASCOT_MOODS) {
        expect(messages[mood].length, mood).toBeGreaterThanOrEqual(3);
        for (const text of messages[mood]) {
          // Two short lines inside the dial at most.
          expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(6);
          expect(text.length, text).toBeLessThanOrEqual(32);
        }
      }
    });
  }
});
