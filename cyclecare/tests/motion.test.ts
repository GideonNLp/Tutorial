import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STAGGER_MAX, STAGGER_STEP, staggerDelay } from '../src/ui/motion';

const css = (name: string) => readFileSync(new URL(`../src/styles/${name}`, import.meta.url), 'utf8');
const STYLESHEETS = ['base.css', 'screens.css', 'motion.css'];

/** The body of the `{ … }` block that opens at `from` (the index of its opening brace). */
function block(text: string, from: number): string {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(from + 1, i);
  }
  throw new Error('unbalanced braces');
}

/** The text without the blocks whose opener (a regex ending in `{`) matches, braces included. */
function without(text: string, opener: RegExp): string {
  let out = text;
  for (;;) {
    const match = opener.exec(out);
    if (!match) return out;
    const open = match.index + match[0].length - 1;
    out = out.slice(0, match.index) + out.slice(open + block(out, open).length + 2);
  }
}

/** Every `@keyframes name { … }`: the name and the CSS properties its frames set. */
function keyframes(text: string): Array<{ name: string; properties: Set<string> }> {
  const found: Array<{ name: string; properties: Set<string> }> = [];
  for (const match of text.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    const body = block(text, match.index! + match[0].length - 1);
    const properties = new Set<string>();
    // Inside a frame: `prop: value;` pairs. Frame selectors (`from`, `50%`) are followed by `{`, not `:`.
    for (const declaration of body.matchAll(/([a-z-]+)\s*:/g)) properties.add(declaration[1]!);
    found.push({ name: match[1]!, properties });
  }
  return found;
}

describe('the stagger', () => {
  it('puts 50–80 ms between blocks, and stops adding delay after the cap', () => {
    expect(STAGGER_STEP).toBeGreaterThanOrEqual(50);
    expect(STAGGER_STEP).toBeLessThanOrEqual(80);
    expect([0, 1, 2, 3].map((i) => staggerDelay(i))).toEqual([0, STAGGER_STEP, 2 * STAGGER_STEP, 3 * STAGGER_STEP]);
    expect(staggerDelay(STAGGER_MAX)).toBe(STAGGER_MAX * STAGGER_STEP);
    expect(staggerDelay(STAGGER_MAX + 20)).toBe(STAGGER_MAX * STAGGER_STEP);
  });

  it('never goes below zero and honours its own step and cap', () => {
    expect(staggerDelay(-3)).toBe(0);
    expect(staggerDelay(5, 50, 2)).toBe(100);
  });

  it('keeps a long screen quick: the last block starts well under a second after the first', () => {
    expect(staggerDelay(1000)).toBeLessThan(600);
  });
});

describe('what moves, and how', () => {
  const all = STYLESHEETS.flatMap((name) => keyframes(css(name)).map((k) => ({ ...k, file: name })));

  it('finds the animations of the app', () => {
    expect(all.length).toBeGreaterThan(25);
    expect(all.map((k) => k.name)).toEqual(expect.arrayContaining(['dial-draw', 'dial-pulse', 'ring-pop', 'bar-grow', 'tip-in', 'save-halo']));
  });

  it('animates only transform and opacity (run on the GPU), and the dash of a stroke being drawn', () => {
    const allowed = new Set(['transform', 'opacity', 'stroke-dashoffset']);
    const offenders = all.flatMap((k) => [...k.properties].filter((p) => !allowed.has(p)).map((p) => `${k.file}: ${k.name} animates ${p}`));
    expect(offenders).toEqual([]);
  });

  it('draws strokes with the dash only in the animations made for it', () => {
    const drawing = all.filter((k) => k.properties.has('stroke-dashoffset')).map((k) => k.name);
    expect(drawing).toEqual(['dial-draw']);
  });

  it('plays the content animations only when the system allows motion, and keeps no layer allocated', () => {
    const motion = css('motion.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const gate = /@media \(prefers-reduced-motion: no-preference\)\s*\{/;
    const match = gate.exec(motion);
    expect(match).not.toBeNull();
    expect(block(motion, match!.index + match![0].length - 1)).toMatch(/animation\s*:/);
    // With the gated block and the @keyframes rules taken out, nothing may start an animation.
    const outside = without(without(motion, /@keyframes\s+[\w-]+\s*\{/), gate);
    expect(outside).not.toMatch(/animation/);
    expect(motion).not.toMatch(/will-change|filter\s*:/);
  });

  it('gives every entrance a hook that is switched on only while a screen arrives', () => {
    const motion = css('motion.css');
    for (const selector of ['.dial-arc', '.chart-bar', '.chart-line', '.heat td', '.tip-cards']) {
      expect(motion, selector).toMatch(new RegExp(`\\.page\\[data-reveal\\][^{]*${selector.replace(/[.[\]]/g, '\\$&')}`));
    }
  });
});
