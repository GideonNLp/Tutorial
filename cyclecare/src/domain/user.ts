import { NICKNAME_MAX } from './types';

/** At least one letter, digit or emoji: a name made only of dots or dashes is most likely a slip. */
const MEANINGFUL = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;

export type NicknameResult = { ok: true; value: string | undefined } | { ok: false };

/** Tidies what was typed. Empty means "no name"; something without a single letter is refused. */
export function normalizeNickname(raw: string): NicknameResult {
  const value = raw.replace(/\s+/g, ' ').trim().slice(0, NICKNAME_MAX);
  if (value === '') return { ok: true, value: undefined };
  return MEANINGFUL.test(value) ? { ok: true, value } : { ok: false };
}

function firstCharacter(word: string): string {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const first = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word)[Symbol.iterator]().next();
    return first.done ? '' : first.value.segment;
  }
  return Array.from(word)[0] ?? '';
}

/** One or two initials for the avatar: "Ana" → "A", "Ana Maria" → "AM", "maria-ioana" → "MI". */
export function initials(nickname: string): string {
  const words = nickname.split(/[\s\-_.]+/).filter((w) => MEANINGFUL.test(w));
  if (words.length === 0) return '';
  const first = firstCharacter(words[0]!);
  const last = words.length > 1 ? firstCharacter(words[words.length - 1]!) : '';
  return (first + last).toLocaleUpperCase();
}
