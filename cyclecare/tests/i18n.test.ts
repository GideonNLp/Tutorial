import { describe, expect, it } from 'vitest';
import * as enLegal from '../src/content/en/legal';
import * as enPartner from '../src/content/en/partnerTips';
import * as enTips from '../src/content/en/tips';
import * as roLegal from '../src/content/ro/legal';
import * as roPartner from '../src/content/ro/partnerTips';
import * as roTips from '../src/content/ro/tips';
import { PHASES } from '../src/domain/types';
import { deviceLocale, dictionaries } from '../src/i18n';
import { en } from '../src/i18n/en';
import { ro } from '../src/i18n/ro';

const ROMANIAN_LETTERS = /[ăâîșțşţĂÂÎȘȚŞŢ]/;

/** Every string in a value, with the path to it; functions are called with sample arguments. */
function strings(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value === 'function') {
    // Text helpers take numbers or strings; whichever the function accepts gives its output.
    const fn = value as (...a: unknown[]) => unknown;
    for (const args of [
      [3, 5, 7, 2],
      ['K7Q2MX', 'B', 'C', 'D'],
    ]) {
      try {
        const out = fn(...args);
        if (typeof out === 'string') return [[`${path}()`, out]];
      } catch {
        // try the other kind of argument
      }
    }
    return [];
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
  return [];
}

describe('languages', () => {
  it('starts in the device language when the app has it, and in English otherwise', () => {
    expect(deviceLocale(['ro-RO', 'en-US'])).toBe('ro');
    expect(deviceLocale(['ro-MD'])).toBe('ro');
    expect(deviceLocale(['en-US'])).toBe('en');
    expect(deviceLocale(['en_GB'])).toBe('en');
    expect(deviceLocale(['de-DE', 'ro'])).toBe('ro');
    expect(deviceLocale(['de-DE', 'fr-FR'])).toBe('en');
    expect(deviceLocale([])).toBe('en');
  });

  it('lists both languages, each named in itself', () => {
    expect(Object.keys(dictionaries)).toEqual(['ro', 'en']);
    expect(ro.meta).toMatchObject({ name: 'Română', htmlLang: 'ro' });
    expect(en.meta).toMatchObject({ name: 'English', htmlLang: 'en' });
  });

  it('has an English text for every Romanian one, and none of them is still Romanian', () => {
    const roPaths = strings(ro).map(([p]) => p);
    const enStrings = strings(en);
    expect(enStrings.map(([p]) => p)).toEqual(roPaths);
    const leftovers = enStrings.filter(([, text]) => ROMANIAN_LETTERS.test(text) && !text.includes('Română'));
    expect(leftovers).toEqual([]);
  });

  it('counts in English', () => {
    expect(en.common.days(1)).toBe('1 day');
    expect(en.common.days(21)).toBe('21 days');
    expect(en.lock.wrong(1)).toBe('Wrong PIN. 1 attempt left before a pause.');
    expect(en.today.next.likely('4 December', 1)).toBe('Most likely around 4 December, which is tomorrow.');
  });

  it('translates every tip with the same ids, so “I tried it” marks survive a language switch', () => {
    for (const phase of PHASES) {
      for (const category of roTips.TIP_CATEGORIES) {
        const ro = roTips.phaseTips[phase].tips[category];
        const en = enTips.phaseTips[phase].tips[category];
        expect(en.map((t) => t.id)).toEqual(ro.map((t) => t.id));
        for (const tip of en) {
          expect(tip.title.length, tip.id).toBeLessThanOrEqual(40);
          expect(tip.body.length, tip.id).toBeLessThanOrEqual(220);
          expect(tip.why.length, tip.id).toBeLessThanOrEqual(220);
        }
      }
      expect(enPartner.partnerTips[phase].map((t) => t.id)).toEqual(roPartner.partnerTips[phase].map((t) => t.id));
    }
    expect(Object.keys(enTips.symptomTips)).toEqual(Object.keys(roTips.symptomTips));
    for (const id of Object.keys(roTips.symptomTips) as Array<keyof typeof roTips.symptomTips>) {
      expect(enTips.symptomTips[id].helps.length, id).toBe(roTips.symptomTips[id].helps.length);
    }
    expect(Object.keys(enTips.flagTexts)).toEqual(Object.keys(roTips.flagTexts));
    const content = strings({ tips: enTips.phaseTips, symptoms: enTips.symptomTips, partner: enPartner.partnerTips });
    expect(content.filter(([, text]) => ROMANIAN_LETTERS.test(text))).toEqual([]);
  });

  it('translates the consent and the privacy notice section by section, and records which text was accepted', () => {
    expect(enLegal.privacyPolicy.sections.map((s) => s.heading.split('.')[0])).toEqual(
      roLegal.privacyPolicy.sections.map((s) => s.heading.split('.')[0]),
    );
    for (const [i, section] of enLegal.privacyPolicy.sections.entries()) {
      const original = roLegal.privacyPolicy.sections[i]!;
      expect(section.paragraphs?.length, section.heading).toBe(original.paragraphs?.length);
      expect(section.bullets?.length, section.heading).toBe(original.bullets?.length);
    }
    expect(enLegal.consentText.points.length).toBe(roLegal.consentText.points.length);
    expect(enLegal.LEGAL_VERSION).not.toBe(roLegal.LEGAL_VERSION);
    expect(enLegal.LEGAL_VERSION.length).toBeLessThanOrEqual(20); // the limit a backup accepts
    const legal = strings({ consent: enLegal.consentText, policy: enLegal.privacyPolicy });
    expect(legal.filter(([, text]) => ROMANIAN_LETTERS.test(text))).toEqual([]);
  });
});

describe('the big figures on Today', () => {
  // The figure and the sentence under it must agree, in Romanian above all: 1 zi, 2 zile, 19 zile, 20 de zile, 101 zile, 120 de zile.
  const sentence = (n: number) => ro.today.next.late(n).match(/^Întârzie cu (.+) față/)![1]!;
  const cases: Array<[number, string]> = [
    [1, 'zi'],
    [2, 'zile'],
    [19, 'zile'],
    [20, 'de zile'],
    [101, 'zile'],
    [120, 'de zile'],
  ];

  for (const [n, word] of cases) {
    it(`says "${n} ${word}" in Romanian, as the sentence does`, () => {
      expect(ro.today.next.figure.unit(n)).toBe(word);
      expect(sentence(n)).toBe(`${n} ${word}`);
      expect(ro.today.next.figure.lateUnit(n)).toBe(`${word} de întârziere`);
      expect(ro.today.fertility.untilUnit(n)).toBe(`${word} până la zilele fertile`);
    });
  }

  it('says day and days in English', () => {
    expect([1, 2, 20].map((n) => en.today.next.figure.unit(n))).toEqual(['day', 'days', 'days']);
    expect(en.today.next.figure.lateUnit(1)).toBe('day late');
  });
});
