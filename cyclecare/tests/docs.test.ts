import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as legal from '../src/content/ro/legal';
import * as tips from '../src/content/ro/tips';
import { FLAG_SEVERITY, THRESHOLDS } from '../src/domain/insights';
import { PHASES, SYMPTOM_GROUPS, SYMPTOM_IDS } from '../src/domain/types';
import { ro } from '../src/i18n/ro';
// @ts-expect-error plain ESM build script without type declarations
import { renderLegalDoc, renderTipsDoc } from '../scripts/content-docs.mjs';

const doc = (name: string) => readFileSync(new URL(`../docs/${name}`, import.meta.url), 'utf8');

describe('content', () => {
  it('has seven tips per theme for every phase, each with a "why", and unique ids', () => {
    const ids: string[] = [];
    for (const phase of PHASES) {
      expect(tips.phaseTips[phase].summary.length).toBeGreaterThan(40);
      expect(tips.phaseTips[phase].hormones.length, `${phase} hormones`).toBeGreaterThan(120);
      for (const category of tips.TIP_CATEGORIES) {
        const list = tips.phaseTips[phase].tips[category];
        expect(list.length, `${phase}/${category}`).toBe(7);
        for (const tip of list) {
          expect(tip.id, tip.id).toMatch(/^[a-z]{3}-[a-z]{3}-\d$/);
          expect(tip.title.length, tip.id).toBeLessThanOrEqual(40);
          expect(tip.body.length, tip.id).toBeLessThanOrEqual(220);
          expect(tip.why.length, tip.id).toBeGreaterThan(40);
          expect(tip.why.length, tip.id).toBeLessThanOrEqual(220);
        }
        ids.push(...list.map((t) => t.id));
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has advice for every symptom and a message for every flag', () => {
    for (const id of SYMPTOM_IDS) {
      expect(tips.symptomTips[id].helps.length, id).toBeGreaterThanOrEqual(2);
      expect(tips.symptomTips[id].doctor.length, id).toBeGreaterThan(30);
    }
    expect(Object.keys(tips.flagTexts).sort()).toEqual(Object.keys(FLAG_SEVERITY).sort());
  });

  it('keeps the tone rules: no diagnoses, no promises, no doses', () => {
    const all = JSON.stringify([tips.phaseTips, tips.symptomTips]).toLowerCase();
    for (const banned of ['vindec', 'garant', 'sigur ', 'cu siguranță', 'diagnostic', ' mg', 'endometrioz', 'sindrom']) {
      expect(all, banned).not.toContain(banned);
    }
    // Romanian diacritics use comma-below ș/ț, never the cedilla look-alikes.
    expect(JSON.stringify([tips, legal, ro])).not.toMatch(/[şţŞŢ]/);
  });
});

describe('documents generated from content', () => {
  it('docs/04 matches the tips in the app (run `npm run docs:content`)', () => {
    expect(doc('04-sablon-continut-sfaturi.md')).toBe(
      renderTipsDoc({ tips, ro, thresholds: THRESHOLDS, severity: FLAG_SEVERITY, symptomGroups: SYMPTOM_GROUPS }),
    );
  });

  it('docs/05 matches the legal texts in the app (run `npm run docs:content`)', () => {
    expect(doc('05-consimtamant-si-confidentialitate.md')).toBe(renderLegalDoc({ legal }));
  });
});
