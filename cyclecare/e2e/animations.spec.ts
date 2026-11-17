import { expect, test, type Page } from '@playwright/test';
import { startEmpty, startWithJournal, tab } from './helpers';

/**
 * The motion of the content of every screen. Page changes, sheets and swipe-back are in motion.spec.ts.
 * Most tests run with motion allowed; the last ones run with the system asking for reduced motion.
 */

interface Recorded {
  tag: string;
  cls: string;
  props: string[];
  duration: number;
  delay: number;
}

/** Records every Web Animations call (what it targets, what it animates), before the app starts. */
async function recordAnimations(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __anim: Recorded[] };
    w.__anim = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (
      this: Element,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      const frames = Array.isArray(keyframes) ? keyframes : [];
      const o = typeof options === 'number' ? { duration: options } : (options ?? {});
      w.__anim.push({
        tag: this.tagName.toLowerCase(),
        cls: this.getAttribute('class') ?? '',
        props: [...new Set(frames.flatMap((f) => Object.keys(f)))],
        duration: Number(o.duration ?? 0),
        delay: Number(o.delay ?? 0),
      });
      return original.call(this, keyframes, options);
    };
  });
}
const recorded = (page: Page) => page.evaluate(() => (window as unknown as { __anim: Recorded[] }).__anim);
const forget = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { __anim: Recorded[] }).__anim = [];
  });

/** A CSS property of an element (or of its pseudo-element), as the browser computes it right now. */
const css = (page: Page, selector: string, property: string, pseudo?: string) =>
  page.evaluate(([sel, prop, ps]) => getComputedStyle(document.querySelector(sel!)!, ps || null).getPropertyValue(prop!), [
    selector,
    property,
    pseudo ?? '',
  ] as const);

/** The same property for every element the selector matches. */
const cssAll = (page: Page, selector: string, property: string) =>
  page.evaluate(([sel, prop]) => [...document.querySelectorAll(sel!)].map((el) => getComputedStyle(el).getPropertyValue(prop!)), [
    selector,
    property,
  ] as const);

const seconds = (values: string[]) => values.map((v) => parseFloat(v));
const ascending = (values: number[]) => values.every((v, i) => i === 0 || v > values[i - 1]!);

const azi = '.page[data-route="azi"]';

/** Starts with the system's "reduce motion" (the test setup's default: the first-run steps would otherwise overlap), then allows motion. */
const withMotion = (page: Page) => page.emulateMedia({ reducedMotion: 'no-preference' });

test.describe('with motion', () => {
  test('a tab brings its page in, and the blocks of the page arrive 50–80 ms apart', async ({ page }) => {
    await recordAnimations(page);
    await startWithJournal(page);
    await withMotion(page);
    await tab(page, 'Calendar');
    await forget(page);
    await tab(page, 'Azi');

    const all = await recorded(page);
    // The page itself fades in and rises a little.
    const pageIn = all.find((a) => a.cls.split(' ').includes('page') && a.props.includes('opacity') && a.props.includes('transform'));
    expect(pageIn).toBeTruthy();
    // Its blocks arrive one after another: Today's dial card, next period, fertility, quick log, …
    const delays = all.filter((a) => a.duration === 420 && a.props.includes('opacity')).map((a) => a.delay);
    expect(delays.length).toBeGreaterThan(4);
    const steps = delays.slice(1).map((d, i) => d - delays[i]!);
    expect(steps.every((s) => s === 0 || (s >= 50 && s <= 80))).toBe(true);
    expect(steps.filter((s) => s > 0).length).toBeGreaterThanOrEqual(4);
    expect(Math.max(...delays) - Math.min(...delays)).toBeLessThanOrEqual(8 * 80);
  });

  test('going back from a deeper page does not replay the entrance', async ({ page }) => {
    await recordAnimations(page);
    await startWithJournal(page);
    await withMotion(page);
    await page.getByRole('button', { name: 'Setări', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Setări' })).toBeVisible();
    await forget(page);
    await page.getByRole('button', { name: 'Înapoi' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Azi' })).toBeVisible();
    await expect(page.locator(azi)).not.toHaveAttribute('data-reveal');
    expect((await recorded(page)).filter((a) => a.duration === 420)).toEqual([]);
  });

  test('Today: the arcs of the dial draw one after another, and the bead pulses', async ({ page }) => {
    await startWithJournal(page);
    await withMotion(page);
    await tab(page, 'Calendar');
    await tab(page, 'Azi');

    const arc = `${azi} .dial-arc`;
    await expect(page.locator(arc)).toHaveCount(4);
    expect(await cssAll(page, arc, 'animation-name')).toEqual(Array(4).fill('dial-draw'));
    expect(ascending(seconds(await cssAll(page, arc, 'animation-delay')))).toBe(true);
    // Mid-way: at least one arc is partly drawn (the dash offset runs from 1 to 0).
    await expect
      .poll(async () => (await cssAll(page, arc, 'stroke-dashoffset')).some((v) => parseFloat(v) > 0.02 && parseFloat(v) < 0.98))
      .toBe(true);

    // The pulse ring lives on its own element, beside the bead, and repeats for as long as the page is shown.
    const pulse = `${azi} .dial-pulse`;
    await expect(page.locator(pulse)).toHaveCount(1);
    expect(await css(page, pulse, 'animation-name')).toBe('dial-pulse');
    expect(await css(page, pulse, 'animation-iteration-count')).toBe('infinite');

    // When the entrance is over the mark is gone and the arcs are plain, complete strokes again.
    await expect(page.locator(azi)).not.toHaveAttribute('data-reveal', '', { timeout: 6000 });
    expect(await cssAll(page, arc, 'stroke-dasharray')).toEqual(Array(4).fill('none'));
  });

  test('Today: the cards give a light touch when pressed, and the middle of the dial too', async ({ page }) => {
    await startWithJournal(page);
    await withMotion(page);
    await expect(page.locator(`${azi} [data-tap]`).first()).toBeVisible();
    const scaleOf = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

    const heading = page.locator(`${azi} #next-heading`);
    await heading.scrollIntoViewIfNeeded();
    const box = (await heading.boundingBox())!;
    await page.mouse.move(box.x + 12, box.y + box.height / 2);
    await page.mouse.down();
    await expect(page.locator(`${azi} [data-tap][data-pressed]`)).toHaveCount(1);
    await expect.poll(() => scaleOf(`${azi} [data-tap][data-pressed]`)).toBeCloseTo(0.985, 2);
    await page.mouse.move(box.x + 12, box.y - 400); // slide off, no click
    await page.mouse.up();
    await expect(page.locator(`${azi} [data-tap][data-pressed]`)).toHaveCount(0);
    await expect.poll(() => scaleOf(`${azi} #next-heading >> xpath=ancestor::section[@data-tap]`)).toBeCloseTo(1, 2);

    await page.locator(`${azi} .dial-flip`).scrollIntoViewIfNeeded();
    const dial = (await page.locator(`${azi} .dial-flip`).boundingBox())!;
    await page.mouse.move(dial.x + dial.width / 2, dial.y + dial.height - 8);
    await page.mouse.down();
    await expect.poll(() => scaleOf(`${azi} .dial-flip`)).toBeCloseTo(0.97, 2);
    await page.mouse.move(dial.x - 200, dial.y);
    await page.mouse.up();
    await expect.poll(() => scaleOf(`${azi} .dial-flip`)).toBeCloseTo(1, 2);
  });

  test('Calendar: the ring springs onto the chosen day, and the details ease to their new height', async ({ page }) => {
    await recordAnimations(page);
    await startWithJournal(page);
    await withMotion(page);
    await tab(page, 'Calendar');
    const cal = '.page[data-route="calendar"]';
    await expect(page.locator(`${cal} .cal-cell[aria-selected="true"]`)).toHaveCount(1);
    await forget(page);

    await page.locator(`${cal} .cal-day`).filter({ hasText: /^25/ }).first().click();
    const selected = `${cal} .cal-cell[aria-selected="true"] .cal-day`;
    await expect(page.locator(selected)).toHaveCount(1);
    expect(await css(page, selected, 'animation-name', '::after')).toBe('ring-pop');
    expect(await css(page, selected, 'border-top-width', '::after')).toBe('2px');

    // The new details fade and rise in, and the panel moves from the old height to the new one.
    await expect.poll(async () => (await recorded(page)).some((a) => a.props.includes('height'))).toBe(true);
    const swap = await recorded(page);
    expect(swap.some((a) => a.props.includes('opacity') && a.props.includes('transform') && a.duration >= 300)).toBe(true);
    // Its content is the real one: the day chosen, in the live region.
    await expect(page.locator(`${cal} #day-heading`)).toContainText('25');
    // And nothing stays clipped once it is done.
    await expect
      .poll(() => page.locator(`${cal} section[aria-labelledby="day-heading"] > div`).evaluate((el) => (el as HTMLElement).style.overflow))
      .toBe('');
  });

  test('Journal: a choice pops, a saved day confirms itself clearly, and its tags settle in one by one', async ({ page }) => {
    await recordAnimations(page);
    await startEmpty(page);
    await withMotion(page);
    await tab(page, 'Jurnal');
    await forget(page);

    await page.getByRole('checkbox', { name: 'Crampe' }).check();
    await page.getByRole('radio', { name: 'Neutră' }).first().check();
    const pops = (await recorded(page)).filter((a) => a.props.includes('transform') && /chip-face|scale-face/.test(a.cls));
    expect(pops.length).toBeGreaterThanOrEqual(2);
    // The icon on the face bounces as well.
    expect((await recorded(page)).some((a) => a.tag === 'svg' && a.props.includes('transform'))).toBe(true);

    await page.getByRole('checkbox', { name: 'Balonare' }).check();
    await page.getByRole('button', { name: 'Salvare' }).click();
    const done = '.page[data-active] .btn-saved';
    await expect(page.locator(done)).toBeVisible();
    expect(await css(page, done, 'animation-name')).toBe('saved-pop');
    expect(await css(page, done, 'animation-name', '::after')).toBe('save-halo');
    expect(await css(page, `${done} svg path`, 'animation-name')).toBe('dial-draw');

    const tags = '.page[data-active] [data-section="symptoms"] .tag';
    await expect(page.locator(tags)).toHaveCount(2);
    expect(await cssAll(page, tags, 'animation-name')).toEqual(['tag-pop', 'tag-pop']);
    expect(ascending(seconds(await cssAll(page, tags, 'animation-delay')))).toBe(true);
  });

  test('Tips: the cards rise in one after another', async ({ page }) => {
    await startWithJournal(page);
    await withMotion(page);
    await tab(page, 'Sfaturi');
    const cards = '.page[data-route="tips"] .tip-cards > li, .page[data-route="sfaturi"] .tip-cards > li';
    await expect(page.locator(cards).first()).toBeVisible();
    expect(await cssAll(page, cards, 'animation-name')).toEqual(Array(3).fill('tip-in'));
    expect(ascending(seconds(await cssAll(page, cards, 'animation-delay')))).toBe(true);
  });

  test('Statistics: bars grow from zero to their value, lines trace themselves, cells pop', async ({ page }) => {
    await startWithJournal(page);
    await withMotion(page);
    await tab(page, 'Statistici');
    const stats = '.page[data-active]';

    const bars = `${stats} .chart-bar`;
    expect(await page.locator(bars).count()).toBeGreaterThanOrEqual(6);
    expect(new Set(await cssAll(page, bars, 'animation-name'))).toEqual(new Set(['bar-grow']));
    expect(ascending(seconds(await cssAll(page, bars, 'animation-delay')))).toBe(true);
    const heights = () => page.locator(bars).evaluateAll((els) => els.map((el) => new DOMMatrix(getComputedStyle(el).transform).d));
    // Mid-way some bar is partly grown; at the end every bar has its full height.
    await expect.poll(async () => (await heights()).some((d) => d > 0.02 && d < 0.98)).toBe(true);
    await expect(page.locator('.page[data-active]')).not.toHaveAttribute('data-reveal', '', { timeout: 6000 });
    expect(await heights()).toEqual(Array((await heights()).length).fill(1));

    expect(await page.locator(`${stats} .heat td[data-level]`).count()).toBeGreaterThan(0);
    // The lines and cells of the other charts, in a fresh entrance.
    await tab(page, 'Azi');
    await tab(page, 'Statistici');
    expect(await css(page, `${stats} .heat td[data-level]`, 'animation-name')).toBe('cell-pop');
    if (await page.locator(`${stats} .chart-line`).count()) {
      expect(await css(page, `${stats} .chart-line`, 'animation-name')).toBe('dial-draw');
      expect(await css(page, `${stats} .chart-line`, 'stroke-dasharray')).toBe('1px');
    }
  });

  test('only a few things loop, and only on the screen that is shown', async ({ page }) => {
    await startWithJournal(page);
    await withMotion(page);
    await tab(page, 'Statistici');
    await expect(page.locator('.page[data-active]')).not.toHaveAttribute('data-reveal', '', { timeout: 6000 });
    const looping = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations === Infinity)
        .map((a) => (a as CSSAnimation).animationName),
    );
    expect(looping).toEqual([]);
  });
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing of this moves, and every picture is complete at once', async ({ page }) => {
    await recordAnimations(page);
    await startWithJournal(page);
    await tab(page, 'Calendar');
    await tab(page, 'Azi');

    // No entrance mark, no drawing arcs, no pulse: the finished dial, with a quiet static halo.
    await expect(page.locator(azi)).not.toHaveAttribute('data-reveal');
    expect(new Set(await cssAll(page, `${azi} .dial-arc`, 'animation-name'))).toEqual(new Set(['none']));
    expect(await cssAll(page, `${azi} .dial-arc`, 'stroke-dasharray')).toEqual(Array(4).fill('none'));
    expect(await css(page, `${azi} .dial-pulse`, 'animation-name')).toBe('none');
    expect(await css(page, `${azi} .dial-pulse`, 'opacity')).toBe('0.3');
    // No block arrives late, nothing was animated from code.
    expect((await recorded(page)).filter((a) => a.duration === 420 || a.props.includes('height'))).toEqual([]);

    // Statistics: bars at full height, nothing running.
    await tab(page, 'Statistici');
    expect(new Set(await cssAll(page, '.page[data-active] .chart-bar', 'animation-name'))).toEqual(new Set(['none']));
    // Calendar: the ring is there, still.
    await tab(page, 'Calendar');
    expect(await css(page, '.page[data-active] .cal-cell[aria-selected="true"] .cal-day', 'animation-name', '::after')).toBe('none');
    expect(await css(page, '.page[data-active] .cal-cell[aria-selected="true"] .cal-day', 'border-top-width', '::after')).toBe('2px');
  });

  test('a choice in the journal does not pop', async ({ page }) => {
    await recordAnimations(page);
    await startEmpty(page);
    await tab(page, 'Jurnal');
    await forget(page);
    await page.getByRole('checkbox', { name: 'Crampe' }).check();
    expect((await recorded(page)).filter((a) => /chip-face/.test(a.cls))).toEqual([]);
  });
});
