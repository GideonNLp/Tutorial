import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import tokens from '../src/styles/tokens.json';
// @ts-expect-error plain ESM build script without type declarations
import { renderTokensCss } from '../scripts/gen-tokens.mjs';

const colors = tokens.color as unknown as Record<string, [string, string]>;

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const PHASES = ['menstruation', 'follicular', 'ovulation', 'luteal'];
/** The page takes a faint colour from the phase (bg-*), brightest at the top of the page (glow-*). */
const PAGE_TINTS = PHASES.flatMap((p) => [`bg-${p}`, `glow-${p}`]);
const SURFACES = ['bg', 'surface', 'surface-2', ...PAGE_TINTS];
const TINTS = ['menstruation-tint', 'follicular-tint', 'ovulation-tint', 'luteal-tint', 'attention-bg'];

/** [foreground, background, minimum ratio] — WCAG 2.2 AA: 4.5 for text, 3 for UI parts and graphics. */
const PAIRS: Array<[string, string, number]> = [
  ...SURFACES.flatMap((s): Array<[string, string, number]> => [
    ['ink', s, 7],
    ['ink-2', s, 4.5],
    ['muted', s, 4.5],
    ['danger', s, 4.5],
    ['line-strong', s, 3],
    ...PHASES.map((p): [string, string, number] => [p, s, 3]),
  ]),
  ...TINTS.flatMap((t): Array<[string, string, number]> => [
    ['ink', t, 7],
    ['ink-2', t, 4.5],
  ]),
  ['on-ink', 'ink', 7],
  ['on-menstruation', 'menstruation', 4.5],
  ['on-danger', 'danger', 4.5],
  ['attention-line', 'attention-bg', 3],
  ...[1, 2, 3, 4].map((n): [string, string, number] => [`on-heat-${n}`, `heat-${n}`, 4.5]),
  // The mascot: eyes readable on the fur, the fur visible on the card in both themes.
  ['capy-ink', 'capy-fur', 3],
  ['capy-fur', 'surface', 3],
];

/** The colour each phase gives the gradient: its own, except ovulation, which is light blue (the "sky" token). */
const GRADIENT_COLOUR: Record<string, string> = { menstruation: 'menstruation', follicular: 'follicular', ovulation: 'sky', luteal: 'luteal' };

/** The lightest end of --ink-gradient: 55% ink, 45% the colour of the phase (sRGB, like color-mix). */
function gradientStart(index: 0 | 1, phase: string): string {
  const [a, b] = [colors.ink![index], colors[GRADIENT_COLOUR[phase]!]![index]].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  return (
    '#' +
    a!
      .map((v, i) =>
        Math.round(v * 0.55 + b![i]! * 0.45)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

describe('design tokens', () => {
  for (const [mode, index] of [
    ['light', 0],
    ['dark', 1],
  ] as const) {
    it(`keeps the text on the gradient readable in every phase in the ${mode} theme`, () => {
      const failures = PHASES.flatMap((p) => {
        const ratio = contrast(colors['on-ink']![index], gradientStart(index, p));
        return ratio >= 7 ? [] : [`on-ink on the gradient toward ${p}: ${ratio.toFixed(2)} < 7`];
      });
      expect(failures).toEqual([]);
    });
  }

  for (const [mode, index] of [
    ['light', 0],
    ['dark', 1],
  ] as const) {
    it(`keeps text and controls readable in the ${mode} theme`, () => {
      const failures = PAIRS.flatMap(([fg, bg, min]) => {
        const ratio = contrast(colors[fg]![index], colors[bg]![index]);
        return ratio >= min ? [] : [`${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`];
      });
      expect(failures).toEqual([]);
    });
  }

  it('has a generated stylesheet that matches tokens.json', () => {
    const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
    expect(css).toBe(renderTokensCss(tokens));
  });
});
