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
