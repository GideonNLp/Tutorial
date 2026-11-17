import { cleanThought } from '../domain/mascot';

/**
 * The person's own thought for the capybara. It is typed text, so it is kept as a small convenience
 * on this device, the way the display preferences are: not in the encrypted journal, and never sent
 * anywhere. Every access is guarded: a blocked or full storage just means the default thoughts show.
 */

const KEY = 'cyclecare.mascot.thought';

export function loadOwnThought(): string | undefined {
  try {
    const text = cleanThought(localStorage.getItem(KEY) ?? '');
    return text || undefined;
  } catch {
    return undefined;
  }
}

export function saveOwnThought(text: string): void {
  try {
    localStorage.setItem(KEY, cleanThought(text));
  } catch {
    // Storage blocked or full: the thought lasts for this visit only.
  }
}

export function clearOwnThought(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
