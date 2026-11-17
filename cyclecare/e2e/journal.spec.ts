import { expect, test } from '@playwright/test';
import { dumpStorage, editJournalSection, startEmpty, startWithJournal, tab } from './helpers';

test('logging the first period day starts a cycle and a prediction', async ({ page }) => {
  await startEmpty(page);
  await page.getByRole('radio', { name: 'Mediu' }).check();
  await expect(page.getByRole('img', { name: 'Ziua 1 a ciclului, Menstruație' })).toBeVisible();
  // 28-day default, ± 4 days: 13 Dec, between 9 and 17 Dec.
  await expect(page.getByText('Probabil între 9 decembrie și 17 decembrie')).toBeVisible();
  await expect(page.getByText('Azi ai notat: flux mediu.')).toBeVisible();

  await tab(page, 'Calendar');
  await expect(page.getByRole('button', { name: /duminică, 15 noiembrie 2026, azi, ziua 1 a ciclului, menstruație notată/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /luni, 16 noiembrie 2026, ziua 2 a ciclului, menstruație estimată/ })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /duminică, 29 noiembrie 2026, ziua 15 a ciclului, faza de ovulație, zi fertilă estimată/ }),
  ).toBeVisible();
});

test('journal entries are saved automatically, survive a reload and are encrypted on disk', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Jurnal');
  await page.getByRole('radio', { name: 'Abundent' }).check();
  await page.getByRole('checkbox', { name: 'Crampe' }).check();
  await page.getByRole('radio', { name: 'Sever' }).check();
  await page.getByRole('radio', { name: 'Scăzută' }).first().check();
  await page.getByLabel('Temperatura, în °C').fill('36,55');
  await page.getByLabel('Temperatura, în °C').blur();
  await page.getByRole('radio', { name: /Cremos/ }).check();
  await page.getByLabel('Notă pentru această zi').fill('Zi grea, am stat acasă.');
  await expect(page.getByRole('status').filter({ hasText: 'Salvat' })).toBeVisible();
  await page.waitForTimeout(600); // let the debounced save reach IndexedDB

  await page.reload();
  await tab(page, 'Jurnal');
  // A day with entries opens as a summary.
  await expect(page.locator('[data-section="symptoms"] .tag')).toHaveText(['Crampe · sever']);
  await expect(page.locator('[data-section="bbt"] .tag')).toHaveText(['36,55 °C']);
  await expect(page.locator('[data-section="note"]')).toContainText('Zi grea, am stat acasă.');
  for (const section of ['Flux', 'Simptome', 'Temperatură bazală', 'Notă']) await editJournalSection(page, section);
  await expect(page.getByRole('radio', { name: 'Abundent' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Crampe' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Sever' })).toBeChecked();
  await expect(page.getByLabel('Temperatura, în °C')).toHaveValue('36,55');
  await expect(page.getByLabel('Notă pentru această zi')).toHaveValue('Zi grea, am stat acasă.');

  const disk = await dumpStorage(page);
  expect(disk).toContain('vault:');
  expect(disk).toContain('[CryptoKey extractable=false]');
  for (const plaintext of ['Zi grea', 'cramps', 'heavy', '36.55', 'health_data_processing']) expect(disk).not.toContain(plaintext);
});

test('an invalid temperature is explained and not saved', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Jurnal');
  const field = page.getByLabel('Temperatura, în °C');
  await field.fill('50');
  await field.blur();
  await expect(page.getByRole('alert')).toContainText('între 34 și 42');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
});

test('future days cannot be journalled', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Jurnal');
  // Sunday is the last day of the week shown, so there is no later week to go to.
  await expect(page.getByRole('button', { name: 'Săptămâna următoare' })).toBeDisabled();
  await page.getByRole('button', { name: 'Săptămâna anterioară' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Duminică, 8 noiembrie' })).toBeVisible();
  await expect(page.locator('[data-section="flow"] .tag')).toHaveText(['Ușor']);
  await editJournalSection(page, 'Flux');
  await expect(page.getByRole('radio', { name: 'Ușor', exact: true })).toBeChecked(); // sample journal: last period day, light flow
});

test('calendar: edit mode marks period days and predictions follow', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Calendar');
  await page.getByRole('button', { name: 'Editează zilele de menstruație' }).click();
  for (const day of ['10', '11', '12']) {
    await page.getByRole('button', { name: new RegExp(`, ${day} noiembrie 2026`) }).click();
  }
  await expect(page.getByRole('button', { name: /, 16 noiembrie 2026/ })).toBeDisabled(); // tomorrow
  await page.getByRole('button', { name: 'Am terminat' }).click();
  await expect(page.getByRole('button', { name: /marți, 10 noiembrie 2026, ziua 1 a ciclului, menstruație notată/ })).toBeVisible();
  await tab(page, 'Azi');
  await expect(page.getByRole('img', { name: 'Ziua 6 a ciclului, Faza foliculară' })).toBeVisible();
});

test('calendar: arrow keys move through days and across months', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Calendar');
  const today = page.getByRole('button', { name: /duminică, 15 noiembrie 2026/ });
  await today.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: /luni, 16 noiembrie 2026/ })).toBeFocused();
  await expect(page.getByRole('heading', { level: 2, name: 'Luni, 16 noiembrie' })).toBeVisible();
  await page.keyboard.press('PageDown');
  await expect(page.getByRole('heading', { level: 2, name: 'Decembrie 2026' })).toBeVisible();
  await expect(page.getByRole('button', { name: /miercuri, 16 decembrie 2026/ })).toBeFocused();
  await expect(page.getByText('Zi din viitor: aici vezi doar estimări.')).toBeVisible();
});

test('tips follow the phase and the recently logged symptoms; a flag can be dismissed', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Sfaturi');
  await expect(page.getByRole('radio', { name: /Faza foliculară/ })).toBeChecked();
  // Cycle day 12: the follicular set that starts with the second tip.
  await expect(page.getByRole('heading', { name: 'Proteine la fiecare masă' })).toBeVisible();
  await page.getByRole('radio', { name: 'Somn' }).check();
  await expect(page.getByRole('heading', { name: 'Lumină dimineața' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Crampe', exact: true })).toBeVisible();
  await expect(page.getByText(/Căldură pe abdomen/)).toBeVisible();

  const flag = page.getByRole('heading', { name: 'Crampe, cu intensitate severă' });
  await expect(flag).toBeVisible();
  await page.getByRole('button', { name: 'Am înțeles' }).click();
  await expect(flag).toHaveCount(0);
});
