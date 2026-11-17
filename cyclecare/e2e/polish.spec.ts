import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { SAMPLE_BACKUP, openSettings, startEmpty, startWithJournal, tab } from './helpers';

/** One toast, by its text (the live region holds all of them). */
const toastWith = (page: import('@playwright/test').Page, text: string) => page.locator('.toast').filter({ hasText: text });

test('a removed medication reminder can be put back with Undo', async ({ page }) => {
  await startEmpty(page);
  await openSettings(page, 'Memento-uri');
  await page.getByRole('button', { name: 'Adaugă pilula' }).click();
  await page.getByRole('button', { name: 'Adaugă un memento' }).click();
  const names = page.getByRole('textbox', { name: 'Denumire' });
  await names.nth(1).fill('Fier');
  await expect(names).toHaveCount(2);

  await page.getByRole('button', { name: 'Elimină memento-ul pentru Pilula' }).click();
  await expect(names).toHaveCount(1);
  const removed = toastWith(page, 'Memento-ul pentru Pilula a fost eliminat.');
  await removed.getByRole('button', { name: 'Anulează' }).click();
  // Back in its original place, with its settings.
  await expect(names).toHaveCount(2);
  await expect(names.first()).toHaveValue('Pilula');
  await expect(toastWith(page, 'Memento-ul a fost pus la loc.')).toBeVisible();
});

test('a medication reminder asks for a name next to the field', async ({ page }) => {
  await startEmpty(page);
  await openSettings(page, 'Memento-uri');
  await page.getByRole('button', { name: 'Adaugă un memento' }).click();
  const name = page.getByRole('textbox', { name: 'Denumire' });
  // Not while the field has simply not been reached yet…
  await expect(page.getByRole('alert')).toHaveCount(0);
  await name.focus();
  await name.blur();
  // …but once it was left empty.
  await expect(page.getByRole('alert')).toContainText('Scrie o denumire');
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await name.fill('Magneziu');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('PIN mistakes are explained under the field they concern', async ({ page }) => {
  await startEmpty(page);
  await openSettings(page, 'Confidențialitate și securitate');
  await page.getByRole('button', { name: 'Setează un PIN' }).click();
  const dialog = page.getByRole('dialog', { name: 'Setează un PIN' });
  const pin = dialog.getByLabel('PIN nou (4–8 cifre)');
  const repeat = dialog.getByLabel('Repetă PIN-ul nou');

  await pin.fill('12');
  await dialog.getByRole('button', { name: 'Setează un PIN' }).click();
  await expect(pin).toHaveAttribute('aria-invalid', 'true');
  await expect(repeat).not.toHaveAttribute('aria-invalid', 'true');
  await expect(pin).toHaveAccessibleDescription(/între 4 și 8 cifre/);

  await pin.fill('1234');
  await repeat.fill('1235');
  await dialog.getByRole('button', { name: 'Setează un PIN' }).click();
  await expect(repeat).toHaveAttribute('aria-invalid', 'true');
  await expect(pin).not.toHaveAttribute('aria-invalid', 'true');
  await expect(repeat).toHaveAccessibleDescription(/nu sunt la fel/);
});

test('restoring a backup can be undone', async ({ page }) => {
  await startEmpty(page);
  await page.getByRole('radio', { name: 'Mediu' }).check(); // today's own entry
  await openSettings(page, 'Datele mele');
  await page
    .getByLabel('Restaurează dintr-un fișier')
    .setInputFiles({ name: 'jurnal.json', mimeType: 'application/json', buffer: Buffer.from(SAMPLE_BACKUP) });
  await page.getByRole('dialog').getByRole('button', { name: 'Înlocuiește' }).click();
  const restored = toastWith(page, 'Datele au fost restaurate.');
  await restored.getByRole('button', { name: 'Anulează' }).click();
  await expect(toastWith(page, 'Am revenit la datele dinainte de restaurare.')).toBeVisible();
  await tab(page, 'Azi');
  await expect(page.getByRole('img', { name: 'Ziua 1 a ciclului, Menstruație' })).toBeVisible();
});

test('a dismissed observation can be brought back', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Sfaturi');
  const flag = page.getByRole('heading', { name: 'Crampe, cu intensitate severă' });
  await expect(flag).toBeVisible();
  await page.getByRole('button', { name: 'Am înțeles' }).first().click();
  await expect(flag).toHaveCount(0);
  await toastWith(page, 'Observația a fost ascunsă').getByRole('button', { name: 'Anulează' }).click();
  await expect(flag).toBeVisible();
});

test('slow actions show that they are working', async ({ page }) => {
  await startEmpty(page);
  await openSettings(page, 'Confidențialitate și securitate');
  await page.getByRole('button', { name: 'Setează un PIN' }).click();
  const dialog = page.getByRole('dialog', { name: 'Setează un PIN' });
  await dialog.getByLabel('PIN nou (4–8 cifre)').fill('2468');
  await dialog.getByLabel('Repetă PIN-ul nou').fill('2468');
  // Deriving the key from the PIN takes a moment: watch the button during it.
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __busy: string[] }).__busy = seen;
    new MutationObserver(() => {
      const button = document.querySelector('dialog[open] button[type="submit"]');
      if (button?.getAttribute('aria-busy') === 'true') seen.push('busy');
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['aria-busy'] });
  });
  await dialog.getByRole('button', { name: 'Setează un PIN' }).click();
  await expect(page.getByText('PIN activ', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __busy: string[] }).__busy.length)).toBeGreaterThan(0);
});

test('an open sheet and the lock screen pass automated WCAG checks', async ({ page }) => {
  const check = async (context: string) => {
    const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      context,
    ).toEqual([]);
  };
  await startWithJournal(page);
  await tab(page, 'Statistici');
  await page.getByRole('button', { name: 'Creează raportul PDF' }).click();
  await expect(page.getByRole('dialog', { name: 'Raport pentru medic' })).toBeVisible();
  await check('report sheet');
  await page.keyboard.press('Escape');

  await openSettings(page, 'Confidențialitate și securitate');
  await page.getByRole('button', { name: 'Setează un PIN' }).click();
  const dialog = page.getByRole('dialog', { name: 'Setează un PIN' });
  await dialog.getByLabel('PIN nou (4–8 cifre)').fill('2468');
  await dialog.getByLabel('Repetă PIN-ul nou').fill('2468');
  await check('PIN sheet');
  await dialog.getByRole('button', { name: 'Setează un PIN' }).click();
  await page.getByRole('button', { name: 'Blochează acum' }).click();
  await expect(page.getByRole('heading', { name: 'CycleCare este blocată' })).toBeVisible();
  await check('lock screen');
});
