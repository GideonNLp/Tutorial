import type { Phase } from './types';

/**
 * The capybara in the middle of the cycle dial: which pose it takes, and which short message it says.
 * The texts live in the dictionaries (`mascot.messages`), a few per pose.
 */

/** A phase pose, or a plain wave when there is no phase to show (no cycle yet, estimates off, a late period). */
export type MascotMood = Phase | 'hello';

export const MASCOT_MOODS: readonly MascotMood[] = ['menstruation', 'follicular', 'ovulation', 'luteal', 'hello'];

/** How long the capybara stays in front before the dial turns back on its own. */
export const MASCOT_SHOW_MS = 7000;

export function mascotMood(phase: Phase | undefined, late: boolean): MascotMood {
  return late || !phase ? 'hello' : phase;
}

/**
 * The message for this showing: it starts from the cycle day, so each day opens with a different one,
 * and moves on by one every time the capybara is called again.
 */
export function mascotMessage(messages: readonly string[], cycleDay: number, turn: number): string {
  if (messages.length === 0) return '';
  const n = messages.length;
  return messages[(((cycleDay + turn) % n) + n) % n]!;
}
