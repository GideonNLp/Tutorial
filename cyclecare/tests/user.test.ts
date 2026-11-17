import { describe, expect, it } from 'vitest';
import { NICKNAME_MAX } from '../src/domain/types';
import { initials, normalizeNickname } from '../src/domain/user';
import { sanitizeUser } from '../src/storage/backup';

describe('nickname', () => {
  it('tidies spaces and keeps what was typed', () => {
    expect(normalizeNickname('  Ana   Maria ')).toEqual({ ok: true, value: 'Ana Maria' });
    expect(normalizeNickname('ioana')).toEqual({ ok: true, value: 'ioana' });
    expect(normalizeNickname('Ștefania')).toEqual({ ok: true, value: 'Ștefania' });
    expect(normalizeNickname('🌙')).toEqual({ ok: true, value: '🌙' });
  });

  it('empty means no name; only punctuation is refused', () => {
    expect(normalizeNickname('   ')).toEqual({ ok: true, value: undefined });
    expect(normalizeNickname('...')).toEqual({ ok: false });
    expect(normalizeNickname('- _ -')).toEqual({ ok: false });
  });

  it('is cut to the maximum length', () => {
    const result = normalizeNickname('a'.repeat(80));
    expect(result.ok && result.value?.length).toBe(NICKNAME_MAX);
  });

  it('gives one or two initials', () => {
    expect(initials('Ana')).toBe('A');
    expect(initials('Ana Maria')).toBe('AM');
    expect(initials('maria-ioana')).toBe('MI');
    expect(initials('ana maria popescu')).toBe('AP');
    expect(initials('Ștefania')).toBe('Ș');
    expect(initials('...')).toBe('');
  });
});

describe('profile in a backup file', () => {
  const photo = `data:image/jpeg;base64,${'A'.repeat(200)}==`;

  it('keeps a valid name and picture', () => {
    expect(sanitizeUser({ nickname: '  Ana  ', photo })).toEqual({ nickname: 'Ana', photo });
  });

  it('drops anything that is not a small embedded picture', () => {
    expect(sanitizeUser({ photo: 'https://example.com/me.jpg' })).toEqual({});
    expect(sanitizeUser({ photo: 'data:image/svg+xml;base64,PHN2Zz4=' })).toEqual({});
    expect(sanitizeUser({ photo: 'data:image/jpeg;base64,<script>' })).toEqual({});
    expect(sanitizeUser({ photo: `data:image/jpeg;base64,${'A'.repeat(500_000)}` })).toEqual({});
    expect(sanitizeUser({ nickname: 42 })).toEqual({});
    expect(sanitizeUser('Ana')).toEqual({});
  });
});
