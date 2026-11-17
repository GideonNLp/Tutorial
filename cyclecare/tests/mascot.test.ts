import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOwnThought, loadOwnThought, saveOwnThought } from '../src/app/mascotThought';
import { cleanThought, MASCOT_MOODS, mascotMood, mascotThought, THOUGHT_MAX } from '../src/domain/mascot';
import { dictionaries, type Locale } from '../src/i18n';

/** The number of characters a person sees: an emoji is one, not two code units. */
const chars = (text: string) => [...text].length;

describe('the capybara on the dial', () => {
  it('takes the pose of the phase, and waves when there is no phase to show', () => {
    expect(mascotMood('menstruation', false)).toBe('menstruation');
    expect(mascotMood('follicular', false)).toBe('follicular');
    expect(mascotMood('ovulation', false)).toBe('ovulation');
    expect(mascotMood('luteal', false)).toBe('luteal');
    expect(mascotMood(undefined, false)).toBe('hello'); // no cycle yet, or estimates switched off
    expect(mascotMood('luteal', true)).toBe('hello'); // a late period: no phase is claimed
  });

  it('opens each day with a different default thought and moves on at every showing', () => {
    const thoughts = ['a', 'b', 'c'];
    expect(mascotThought(thoughts, 12, 0)).toBe('a');
    expect(mascotThought(thoughts, 13, 0)).toBe('b');
    expect([1, 2, 3].map((turn) => mascotThought(thoughts, 12, turn))).toEqual(['b', 'c', 'a']);
    expect(mascotThought([], 3, 1)).toBe('');
  });

  it('cleans what the person writes: one line, no extra spaces, at most the limit, emoji kept whole', () => {
    expect(cleanThought('  Ce   frumos\n\nazi  ')).toBe('Ce frumos azi');
    expect(cleanThought('   ')).toBe('');
    const long = 'ă'.repeat(THOUGHT_MAX + 10);
    expect(chars(cleanThought(long))).toBe(THOUGHT_MAX);
    const emoji = '🌿'.repeat(THOUGHT_MAX + 1);
    expect(cleanThought(emoji)).toBe('🌿'.repeat(THOUGHT_MAX));
  });

  for (const locale of Object.keys(dictionaries) as Locale[]) {
    it(`has four short default thoughts for every pose in ${dictionaries[locale].meta.name}`, () => {
      const { thoughts, thought } = dictionaries[locale].mascot;
      for (const mood of MASCOT_MOODS) {
        expect(thoughts[mood].length, mood).toBe(4);
        for (const text of thoughts[mood]) {
          expect(chars(text), text).toBeLessThanOrEqual(THOUGHT_MAX);
          expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(7);
        }
      }
      for (const [key, value] of Object.entries(thought)) {
        expect(value.length, key).toBeGreaterThan(0);
      }
    });
  }
});

describe('the own thought, kept on this device', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is saved cleaned, read back, and cleared', () => {
    expect(loadOwnThought()).toBeUndefined();
    saveOwnThought('  Un gând  al meu ');
    expect(loadOwnThought()).toBe('Un gând al meu');
    clearOwnThought();
    expect(loadOwnThought()).toBeUndefined();
  });

  it('an empty or unreadable stored value counts as no own thought', () => {
    store.set('cyclecare.mascot.thought', '   ');
    expect(loadOwnThought()).toBeUndefined();
  });

  it('a blocked storage never throws: the default thoughts simply show', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => saveOwnThought('x')).not.toThrow();
    expect(loadOwnThought()).toBeUndefined();
    expect(() => clearOwnThought()).not.toThrow();
  });
});
