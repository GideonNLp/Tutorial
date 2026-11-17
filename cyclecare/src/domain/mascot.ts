import type { Phase } from './types';

/**
 * The capybara in the middle of the cycle dial: which pose it takes, and the thought it has.
 * The default thoughts live in the dictionaries (`mascot.thoughts`), four per pose.
 */

/** A phase pose, or a plain wave when there is no phase to show (no cycle yet, estimates off, a late period). */
export type MascotMood = Phase | 'hello';

export const MASCOT_MOODS: readonly MascotMood[] = ['menstruation', 'follicular', 'ovulation', 'luteal', 'hello'];

/** The turn of the card (the CSS transition is 0.7 s). */
export const MASCOT_TURN_MS = 700;
/** The pause between the end of the turn and the thought bubble. */
export const THOUGHT_DELAY_MS = 1000;
/** How long the capybara stays in front before the dial turns back on its own (not while someone is writing). */
export const MASCOT_SHOW_MS = 9000;
/** The longest thought, in characters (code points, so an emoji counts once). */
export const THOUGHT_MAX = 40;

export function mascotMood(phase: Phase | undefined, late: boolean): MascotMood {
  return late || !phase ? 'hello' : phase;
}

/**
 * The default thought for this showing: it starts from the cycle day, so each day opens with a
 * different one, and moves on by one every time the capybara is called again.
 */
export function mascotThought(thoughts: readonly string[], cycleDay: number, turn: number): string {
  if (thoughts.length === 0) return '';
  const n = thoughts.length;
  return thoughts[(((cycleDay + turn) % n) + n) % n]!;
}

/** A thought as the person wrote it, cleaned: one line, no extra spaces, at most THOUGHT_MAX characters. */
export function cleanThought(raw: string): string {
  return [...raw.replace(/\s+/g, ' ').trim()].slice(0, THOUGHT_MAX).join('').trim();
}
