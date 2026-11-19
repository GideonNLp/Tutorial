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
  const tabIcon = '.tab[aria-current="page"] .tab-icon';
  expect(await style(page, tabIcon, 'background-image')).toContain('gradient');
  await tab(page, 'Jurnal');
  expect(await style(page, tabIcon, 'background-image')).toContain('gradient');

  // It leans toward the colour of the phase (follicular green here), and so does the hero card's shadow.
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
  await expect(next.locator('.icon-badge')).toHaveAttribute('aria-hidden', 'true');
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
