import { expect, test, type Page } from '@playwright/test';
import { startEmpty, startWithJournal, tab } from './helpers';

const phase = (page: Page) => page.evaluate(() => document.documentElement.dataset.phase);
const pageBg = (page: Page) => page.locator('.page[data-active]').evaluate((el) => getComputedStyle(el).backgroundColor);
const style = (page: Page, selector: string, prop: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

test('the page takes a faint colour from the current phase, on every tab', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithJournal(page); // day 12, follicular
  expect(await phase(page)).toBe('follicular');
  expect(await pageBg(page)).toBe('rgb(236, 243, 245)'); // bg-follicular, not the neutral #F6F5FB
  await tab(page, 'Calendar');
  expect(await phase(page)).toBe('follicular');
  expect(await pageBg(page)).toBe('rgb(236, 243, 245)');
});

test('with no phase to name, the page stays neutral', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startEmpty(page);
  expect(await phase(page)).toBeUndefined();
  expect(await pageBg(page)).toBe('rgb(246, 245, 251)');
});

test('cards are lifted with a shadow instead of an outline; the main one is tinted', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithJournal(page);
  const hero = '.page[data-active] .card-hero';
  expect(await style(page, hero, 'box-shadow')).not.toBe('none');
  expect(await style(page, hero, 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
  expect(await style(page, hero, 'background-image')).toContain('gradient');

  await tab(page, 'Calendar');
  const raised = '.page[data-active] .card';
  expect(await style(page, raised, 'box-shadow')).not.toBe('none');
  expect(await style(page, raised, 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
});

test('in the dark theme cards keep a faint outline as well', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await startWithJournal(page);
  expect(await style(page, '.page[data-active] .card-hero', 'border-top-color')).not.toBe('rgba(0, 0, 0, 0)');
});

test('"increase contrast" brings the outlines back and drops the colour', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', contrast: 'more' });
  await startWithJournal(page);
  const hero = '.page[data-active] .card-hero';
  expect(await style(page, hero, 'box-shadow')).toBe('none');
  expect(await style(page, hero, 'border-top-color')).not.toBe('rgba(0, 0, 0, 0)');
  expect(await style(page, hero, 'border-top-width')).toBe('2px');
  expect(await pageBg(page)).toBe('rgb(246, 245, 251)');
});

test('what is chosen carries a small gradient, and it goes away with "increase contrast"', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithJournal(page);
  const tabIcon = '.page[data-active] .btn-primary';
  expect(await style(page, tabIcon, 'background-image')).toContain('gradient');

  // It leans toward the green of the follicular phase here, and the hero card's shadow takes the colour of the phase.
  const app = (prop: string) => page.locator('.app').evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
  expect((await app('--ink-gradient')).toUpperCase()).toContain('#14937C');
  expect((await app('--shadow-hero')).toUpperCase()).toContain('#14937C');

  await page.emulateMedia({ colorScheme: 'light', contrast: 'more' });
  expect(await style(page, tabIcon, 'background-image')).toBe('none');
});

test('under the dial, each block is a card with a badge and, for the next period, a big number for the eye only', async ({ page }) => {
  await startWithJournal(page); // 15 November, the next period expected in 17 days
  const next = page.locator('.page[data-active] .today-card[data-kind="next"]');
  await expect(next.getByRole('heading', { name: 'Următoarea menstruație' })).toBeVisible();
  await expect(next.locator('.icon-badge-wrap')).toHaveAttribute('aria-hidden', 'true');
  const figure = next.locator('.figure');
  await expect(figure).toHaveAttribute('aria-hidden', 'true');
  await expect(figure.locator('.figure-num')).toHaveText('17');
  await expect(figure.locator('.figure-unit')).toHaveText('zile');
  // The sentence says the same in words, and is what a screen reader reads.
  await expect(next.getByText(/peste 17 zile/)).toBeVisible();
  for (const kind of ['fertility', 'risk']) await expect(page.locator(`.page[data-active] .today-card[data-kind="${kind}"]`)).toBeVisible();
});

test('the tab bar floats above the bottom edge as a rounded pill, on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startWithJournal(page);
  const bar = (await page.locator('.tabbar').boundingBox())!;
  expect(844 - (bar.y + bar.height)).toBeGreaterThanOrEqual(6); // air under it
  expect(bar.x).toBeGreaterThanOrEqual(10); // and at the sides
  expect(bar.x + bar.width).toBeLessThanOrEqual(380);
  expect(await style(page, '.tabbar', 'border-top-left-radius')).not.toBe('0px');
  // The last card can be scrolled clear of it.
  await page.locator('.page[data-active]').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  const last = (await page.locator('.page[data-active] .today-card[data-kind="tip"]').boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(bar.y);
});

test('buttons are filled, not outlined: white on the page, tonal in a card', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithJournal(page);
  const quiet = '.page[data-active] .card .btn-secondary';
  expect(await style(page, quiet, 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
  expect(await style(page, quiet, 'background-color')).not.toBe('rgb(255, 255, 255)');
  await tab(page, 'Sfaturi');
  expect(await style(page, '.page[data-active] .chip-face', 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
  expect(await style(page, '.page[data-active] .chip-face', 'background-color')).toBe('rgb(255, 255, 255)');
});

test('the charts have gradient fills with ids that are unique across the pages that stay mounted', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Statistici');
  await expect(page.locator('.page[data-active] .chart-bar').first()).toBeVisible();
  expect(await page.locator('.page[data-active] .chart-bar path').first().getAttribute('fill')).toMatch(/^url\(#[\w-]+\)$/);
  await tab(page, 'Azi');
  await tab(page, 'Statistici');
  const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((el) => el.id));
  expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
});

test('with nothing to show yet, Statistics has the capybara waving, once, and no duplicate ids', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Statistici');
  const empty = page.locator('.page[data-active] .empty-state');
  await expect(empty.getByRole('heading', { name: 'Încă nu sunt destule date' })).toBeVisible();
  await expect(empty.locator('svg.capy-full')).toHaveCount(1);
  await expect(empty.locator('svg.capy-full')).toHaveAttribute('aria-hidden', 'true');
  const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((el) => el.id));
  expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
});

test('the tab highlight sits behind the current icon and glides to the next one', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startWithJournal(page);
  const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!;
  const center = (b: { x: number; width: number }) => b.x + b.width / 2;

  const indicator = () => box('.tab-indicator');
  const icon = (name: string) => box(`.tab:has-text("${name}") .tab-icon`);
  expect(Math.abs(center(await indicator()) - center(await icon('Azi')))).toBeLessThan(1.5);
  await expect(page.locator('.tab-indicator')).toHaveCount(1);

  await tab(page, 'Jurnal');
  // At rest again (the page clock is fake, so wait for the real transition to end).
  await expect.poll(async () => Math.abs(center(await indicator()) - center(await icon('Jurnal'))), { timeout: 3000 }).toBeLessThan(1.5);
  await tab(page, 'Statistici');
  await expect.poll(async () => Math.abs(center(await indicator()) - center(await icon('Statistici'))), { timeout: 3000 }).toBeLessThan(1.5);
});

test('on the next-period card, a ring round the badge shows how far the cycle has gone', async ({ page }) => {
  await startWithJournal(page); // day 12 of a 28-day cycle
  const ring = page.locator('.page[data-active] .today-card[data-kind="next"] .progress-ring');
  await expect(ring).toHaveAttribute('aria-hidden', 'true');
  await expect(ring.locator('.ring-arc')).toHaveCount(1);
  await expect(ring.locator('.ring-track')).toHaveCount(1);
  // The other cards have no ring.
  await expect(page.locator('.page[data-active] .today-card[data-kind="fertility"] .progress-ring')).toHaveCount(0);
});

test('the gradient takes a colour from the phase: red, green, light blue, violet', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithJournal(page);
  const gradient = () => page.locator('.app').evaluate((el) => getComputedStyle(el).getPropertyValue('--ink-gradient').toUpperCase());
  const expected: Record<string, string> = { menstruation: '#B3264F', follicular: '#14937C', ovulation: '#2F9BEA', luteal: '#6257C4' };
  for (const [phase, colour] of Object.entries(expected)) {
    await page.evaluate((p) => (document.documentElement.dataset.phase = p), phase);
    expect(await gradient(), phase).toContain(colour);
  }
  // Ovulation is light blue, not the amber of its other colours.
  await page.evaluate(() => (document.documentElement.dataset.phase = 'ovulation'));
  expect(await gradient()).not.toContain('#B67500');
});

test.describe('the tab bar folds up to the current tab while scrolling down, as in Apple Music', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const scrollTo = (page: Page, y: number) => page.locator('.page[data-active]').evaluate((el, top) => el.scrollTo(0, top), y);
  const barWidth = async (page: Page) => (await page.locator('.tabbar').boundingBox())!.width;

  test('scrolling down folds it, scrolling up opens it again', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const open = await barWidth(page);
    expect(open).toBeGreaterThan(300);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');

    await scrollTo(page, 400);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    // It narrows to about one tab, which is the current one; the others are gone.
    await expect.poll(() => barWidth(page), { timeout: 3000 }).toBeLessThan(100);
    await expect(page.locator('.tab[aria-current="page"]')).toBeVisible();
    for (const name of ['Calendar', 'Jurnal', 'Sfaturi', 'Statistici']) {
      await expect(page.locator(`.tab:has-text("${name}")`)).toHaveCSS('opacity', '0');
    }
    // It stays folded for as long as the person keeps going down, and a bounce at the top does not matter.
    await scrollTo(page, 600);
    await page.waitForTimeout(200); // let the scroll event be handled before the next move
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');

    // A little scroll up opens it.
    await scrollTo(page, 560);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
    await expect.poll(() => barWidth(page), { timeout: 3000 }).toBeGreaterThan(300);
    for (const name of ['Calendar', 'Jurnal', 'Sfaturi', 'Statistici']) {
      await expect(page.locator(`.tab:has-text("${name}")`)).toHaveCSS('opacity', '1');
    }
  });

  test('touching the folded bar opens it without going anywhere; back at the top it is open', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await scrollTo(page, 500);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    await expect.poll(() => barWidth(page), { timeout: 3000 }).toBeLessThan(100);
    await page.locator('.tab[aria-current="page"]').click();
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
    await expect(page).toHaveURL(/#azi$/);
    expect(await page.evaluate(() => document.querySelector('.page[data-active]')!.scrollTop)).toBeGreaterThan(300); // not sent to the top

    await scrollTo(page, 500);
    await scrollTo(page, 0);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
  });

  test('a new tab starts with the bar open, and the folded bar keeps the colour of the tab it shows', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await scrollTo(page, 500);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    await page.locator('.tab[aria-current="page"]').click(); // open it
    await tab(page, 'Calendar');
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
    await expect(page.locator('.tab-indicator')).toHaveCount(1);
  });

  test('with reduced motion the bar still folds, at once and without animation', async ({ page }) => {
    await startWithJournal(page); // the tests run with reduced motion
    await scrollTo(page, 500);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    // No transition to wait for: it is already the width of one tab.
    expect(await barWidth(page)).toBeLessThan(100);
    await scrollTo(page, 420);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
    expect(await barWidth(page)).toBeGreaterThan(300);
  });

  test('a page bouncing past its end does not open the bar', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const max = await page.locator('.page[data-active]').evaluate((el) => el.scrollHeight - el.clientHeight);
    await scrollTo(page, max);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    // A bounce reports a position past the end that then shrinks back: it clamps to the end, so it is not a move up.
    await page.locator('.page[data-active]').evaluate((el, end) => {
      Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => end + 30 });
      el.dispatchEvent(new Event('scroll'));
      Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => end + 5 });
      el.dispatchEvent(new Event('scroll'));
    }, max);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
  });

  test('a screen reader or keyboard can still reach another tab on the folded bar: one activation opens the bar and goes there', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await scrollTo(page, 500);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    await page.locator('.tab:has-text("Calendar")').dispatchEvent('click');
    await expect(page).toHaveURL(/#calendar$/);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
  });

  test('tabbing into the folded bar opens it', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await scrollTo(page, 500);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    await page.locator('.tab[aria-current="page"]').focus();
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
  });
});
