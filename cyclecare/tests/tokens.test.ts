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

const SURFACES = ['bg', 'surface', 'surface-2'];
const TINTS = ['menstruation-tint', 'follicular-tint', 'ovulation-tint', 'luteal-tint', 'attention-bg'];
const PHASES = ['menstruation', 'follicular', 'ovulation', 'luteal'];

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
];

describe('design tokens', () => {
  for (const [mode, index] of [['light', 0], ['dark', 1]] as const) {
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
