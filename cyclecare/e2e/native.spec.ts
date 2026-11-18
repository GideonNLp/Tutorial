import { expect, test, type Page } from '@playwright/test';
import { MASCOT_TURN_MS, THOUGHT_DELAY_MS } from '../src/domain/mascot';
import { openSettings, startWithJournal } from './helpers';

// A phone: coarse pointer, touch.
test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 } });

const style = (page: Page, selector: string, prop: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

/** A long press on a phone ends in a contextmenu event; this says whether the app let the menu open. */
const menuOpens = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      el.dispatchEvent(event);
      return !event.defaultPrevented;
    });

const openThoughtField = async (page: Page) => {
  await page.locator('.page[data-active] .dial-flip').click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  await page.locator('.page[data-active] .dial-say').click();
  await expect(page.locator('.page[data-active] .dial-draft')).toBeFocused();
};

test('the interface cannot be selected', async ({ page }) => {
  await startWithJournal(page);
  expect(await style(page, '.page[data-active] h1', 'user-select')).toBe('none');
  expect(await style(page, '.page[data-active] .dial-flip', 'user-select')).toBe('none');
  expect(await style(page, '.page[data-active] .btn, .page[data-active] .list-row', 'user-select')).toBe('none');
});

test('the privacy notice can be selected, and so can a text field', async ({ page }) => {
  await startWithJournal(page);
  await openThoughtField(page);
  expect(await style(page, '.dial-draft', 'user-select')).toBe('text');

  await page.locator('.page[data-active] .dial-draft').press('Escape');
  await openSettings(page, 'Confidențialitate și securitate');
  await page
    .getByRole('button', { name: 'Declarația de confidențialitate' })
    .or(page.getByRole('link', { name: /Declarația de confidențialitate/ }))
    .first()
    .click();
  await expect(page.locator('.policy')).toBeVisible();
  expect(await style(page, '.policy p', 'user-select')).toBe('text');
  expect(await menuOpens(page, '.policy p')).toBe(true);
});

test('a long press on the interface opens no menu; on a text field it still does', async ({ page }) => {
  await startWithJournal(page);
  expect(await menuOpens(page, '.page[data-active] h1')).toBe(false);
  expect(await menuOpens(page, '.page[data-active] .dial-flip')).toBe(false);

  await openThoughtField(page);
  expect(await menuOpens(page, '.page[data-active] .dial-draft')).toBe(true);
});

test('typing in a field still works', async ({ page }) => {
  await startWithJournal(page);
  await openThoughtField(page);
  await page.locator('.page[data-active] .dial-draft').fill('o notiță');
  await expect(page.locator('.page[data-active] .dial-draft')).toHaveValue('o notiță');
});
