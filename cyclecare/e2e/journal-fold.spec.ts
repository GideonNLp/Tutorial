import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { dumpStorage, startEmpty, startWithJournal, tab } from './helpers';

const page$ = (page: Page) => page.locator('.page[data-active]');
const saveButton = (page: Page) => page$(page).getByRole('button', { name: 'Salvare' });
const height = (page: Page) => page$(page).evaluate((el) => el.scrollHeight);
const scrollTop = (page: Page) => page$(page).evaluate((el) => el.scrollTop);

async function chooseSymptoms(page: Page) {
  await page.getByRole('checkbox', { name: 'Crampe' }).check();
  await page.getByRole('checkbox', { name: 'Balonare' }).check();
  await page.getByRole('group', { name: 'Intensitate pentru crampe' }).getByRole('radio', { name: 'Sever' }).check();
}

test('an empty day opens in full, with a Save button kept at the bottom of the screen', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Jurnal');
  await expect(page.getByRole('checkbox', { name: 'Crampe' })).toBeVisible();
  // Visible straight away, above the tab bar, without scrolling to the end.
  await expect(saveButton(page)).toBeInViewport();
  const box = (await saveButton(page).boundingBox())!;
  const tabbar = (await page.locator('.tabbar').boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(tabbar.y);
  expect(tabbar.y - (box.y + box.height)).toBeLessThan(24);
  // Still there in the middle of the symptoms.
  await page.getByRole('checkbox', { name: 'Iritabilitate' }).scrollIntoViewIfNeeded();
  await expect(saveButton(page)).toBeInViewport();

  const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
});

test('Save keeps the day, confirms it and folds everything into a short summary', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Jurnal');
  await page.getByRole('radio', { name: 'Mediu' }).check();
  await chooseSymptoms(page);
  await page.getByRole('radio', { name: 'Bună' }).first().check();
  await page.getByLabel('Notă pentru această zi').fill('Plimbare lungă, m-a ajutat.');
  const before = await height(page);
  await page$(page).evaluate((el) => el.scrollTo(0, el.scrollHeight));

  await saveButton(page).click();
  // The button confirms first…
  await expect(page$(page).getByRole('button', { name: 'Salvat' })).toBeVisible();
  await expect(page.locator('.toast').filter({ hasText: 'Salvat ✓' })).toBeVisible();
  // …then the sections fold.
  await expect(saveButton(page)).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Crampe' })).toHaveCount(0);
  await expect(page.locator('[data-section="flow"] .tag')).toHaveText(['Mediu']);
  await expect(page.locator('[data-section="symptoms"] .tag')).toHaveText(['Crampe · sever', 'Balonare · moderat']);
  await expect(page.locator('[data-section="mood"] .tag')).toHaveText(['Bună']);
  await expect(page.locator('[data-section="note"]')).toContainText('Plimbare lungă');
  // Sections with nothing in them say so and offer to add.
  await expect(page.locator('[data-section="energy"]')).toContainText('Nimic notat');
  await expect(page.getByRole('button', { name: 'Adaugă: Energie' })).toBeVisible();
  // Much shorter, and back at the top of the day.
  expect(await height(page)).toBeLessThan(before * 0.55);
  await expect.poll(() => scrollTop(page)).toBe(0);

  // Really written to the device (encrypted), and still folded after a restart.
  await page.waitForTimeout(300);
  expect(await dumpStorage(page)).not.toContain('Plimbare');
  await page.reload();
  await tab(page, 'Jurnal');
  await expect(page.locator('[data-section="symptoms"] .tag')).toHaveText(['Crampe · sever', 'Balonare · moderat']);
  await expect(saveButton(page)).toHaveCount(0);
});

test('Edit reopens just that section; saving folds it again', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Jurnal');
  // The sample day has entries, so it opens folded.
  await expect(saveButton(page)).toHaveCount(0);
  // No symptoms that day: the folded section offers to add them.
  await expect(page.locator('[data-section="symptoms"]')).toContainText('Nimic notat');
  const edit = page.getByRole('button', { name: 'Adaugă: Simptome' });
  await edit.click();
  // Focus lands in the section, the others stay folded, and Save is back.
  await expect(page.locator('[data-section="symptoms"] input').first()).toBeFocused();
  await expect(page.getByRole('button', { name: 'Editează: Dispoziție' })).toBeVisible();
  await expect(saveButton(page)).toBeInViewport();

  await page.getByRole('checkbox', { name: 'Acnee' }).check();
  await saveButton(page).click();
  await expect(page.getByRole('checkbox', { name: 'Acnee' })).toHaveCount(0);
  await expect(page.locator('[data-section="symptoms"] .tag')).toHaveText(['Acnee · moderat']);
  // With something in it, the folded section now offers to edit.
  await expect(page.getByRole('button', { name: 'Editează: Simptome' })).toBeVisible();
});

test('a temperature that cannot be kept stops the fold, next to its message', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Jurnal');
  const field = page.getByLabel('Temperatura, în °C');
  await field.fill('50');
  await saveButton(page).click();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('între 34 și 42');
  await expect(page.locator('.toast').filter({ hasText: 'Salvat ✓' })).toHaveCount(0);
  await expect(saveButton(page)).toBeVisible();

  await field.fill('36,6');
  await saveButton(page).click();
  await expect(page.locator('[data-section="bbt"] .tag')).toHaveText(['36,60 °C']);
});

test('another day keeps its own state: a new empty day opens in full', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Jurnal');
  await page.getByRole('radio', { name: 'Mediu' }).check();
  await saveButton(page).click();
  await expect(saveButton(page)).toHaveCount(0);
  await page.getByRole('button', { name: /sâmbătă, 14 noiembrie/ }).click();
  await expect(page.getByRole('checkbox', { name: 'Crampe' })).toBeVisible();
  await expect(saveButton(page)).toBeVisible();
  await page.getByRole('button', { name: /duminică, 15 noiembrie/ }).click();
  await expect(page.locator('[data-section="flow"] .tag')).toHaveText(['Mediu']);
});
