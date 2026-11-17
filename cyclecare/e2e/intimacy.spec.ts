import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { dumpStorage, openSettings, startWithJournal, tab } from './helpers';

// The sample journal is on cycle day 12 on 15 November: inside the estimated fertile window.
const TODAY_CELL = /duminică, 15 noiembrie 2026/;

async function logContact(page: Page) {
  await tab(page, 'Jurnal');
  await page.getByRole('switch', { name: 'Am avut un contact intim' }).click();
  await expect(page.getByRole('group', { name: 'Ce fel de contact?' })).toBeVisible();
}
const riskNote = (page: Page) => page.locator('.page[data-active] .risk-note');
const chip = (page: Page, name: string | RegExp) => page.getByRole('checkbox', { name });

test('a contact is logged in the journal and its pregnancy risk follows the details', async ({ page }) => {
  await startWithJournal(page);
  await logContact(page);
  // Nothing said about it: counted as possibly unprotected, on a fertile day.
  await expect(riskNote(page)).toContainText('Risc de sarcină: ridicat.');
  await expect(riskNote(page)).toContainText('Protecția nu este notată');
  await expect(riskNote(page)).toContainText('fereastra fertilă estimată');

  await chip(page, 'Sex oral').check();
  await chip(page, 'Jucării sexuale').check();
  await expect(riskNote(page)).toContainText('fără risc de sarcină');
  await expect(riskNote(page)).toContainText('nu pot duce singure la o sarcină');

  await chip(page, 'Penetrare vaginală').check();
  await chip(page, 'Prezervativ').check();
  await expect(riskNote(page)).toContainText('Risc de sarcină: scăzut.');
  await page.getByRole('switch', { name: 'Prezervativul s-a rupt sau a alunecat' }).click();
  await expect(riskNote(page)).toContainText('Risc de sarcină: ridicat.');
  await expect(riskNote(page)).toContainText('nu mai protejează');

  await page.getByRole('switch', { name: 'Prezervativul s-a rupt sau a alunecat' }).click();
  await chip(page, 'Pilulă contraceptivă').check();
  await expect(riskNote(page)).toContainText('Risc de sarcină: foarte scăzut.');

  await chip(page, /Retragere/).check();
  await chip(page, 'Fără protecție').check();
  await expect(riskNote(page)).toContainText('Risc de sarcină: ridicat.');

  // Kept encrypted, like the rest of the journal.
  await page.waitForTimeout(600);
  const disk = await dumpStorage(page);
  for (const plain of ['vaginal', 'condom', 'intimacy']) expect(disk).not.toContain(plain);
});

test('a heart marks the day in the calendar, with the risk in the day details', async ({ page }) => {
  await startWithJournal(page);
  await logContact(page);
  await chip(page, 'Penetrare vaginală').check();
  await chip(page, 'Prezervativ').check();

  await tab(page, 'Calendar');
  const today = page.getByRole('button', { name: TODAY_CELL });
  await expect(today).toHaveAccessibleName(/contact intim notat/);
  await expect(today.locator('.mark-heart')).toHaveCount(1);
  await expect(page.locator('.cal .mark-heart')).toHaveCount(1);
  await expect(page.getByRole('listitem').filter({ hasText: 'Contact intim' })).toBeVisible(); // legend
  await expect(page.locator('#day-heading').locator('..')).toContainText('contact intim');
  await expect(page.locator('#day-heading').locator('..')).toContainText('Risc de sarcină: scăzut.');
});

test('the home screen shows the chance today, the contacts this cycle and what to do next', async ({ page }) => {
  await startWithJournal(page);
  const card = page.getByRole('region', { name: 'Risc de sarcină' });
  await expect(card).toContainText('Azi: ridicată');
  await expect(card).toContainText('fereastra fertilă estimată');
  await expect(card).toContainText('Nu ai notat contacte intime în acest ciclu.');
  await expect(card).toContainText('nu o metodă de contracepție');
  await expect(card.locator('.risk-scale i')).toHaveCount(3);

  await card.getByRole('button', { name: 'Notează un contact intim' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Jurnal' })).toBeVisible();
  await page.getByRole('switch', { name: 'Am avut un contact intim' }).click();
  await chip(page, 'Penetrare vaginală').check();
  await chip(page, 'Fără protecție').check();
  await tab(page, 'Azi');

  await expect(card).toContainText('În acest ciclu: 1 contact intim notat.');
  await expect(card).toContainText('Cel mai mare risc: ridicat, pe 15 noiembrie.');
  // Emergency contraception, within five days of the contact.
  await expect(card).toContainText('contracepția de urgență');
  await expect(card).toContainText('până pe 20 noiembrie');
  // And when a test becomes reliable.
  await expect(card).toContainText(/Un test de sarcină dă un răspuns de încredere din \d+ (noiembrie|decembrie)/);
  await expect(page.getByText(/Azi ai notat:.*contact intim\./)).toBeVisible();

  // Emergency contraception logged: noted instead of suggested again.
  await tab(page, 'Jurnal');
  await chip(page, /Pilula de urgență/).check();
  await tab(page, 'Azi');
  await expect(card).not.toContainText('până pe 20 noiembrie');
  await expect(card).toContainText('Ai notat contracepția de urgență');
});

test('removing a contact can be undone', async ({ page }) => {
  await startWithJournal(page);
  await logContact(page);
  await chip(page, 'Sex oral').check();
  await page.getByRole('switch', { name: 'Am avut un contact intim' }).click();
  await expect(page.getByRole('group', { name: 'Ce fel de contact?' })).toHaveCount(0);
  await page.locator('.toast').filter({ hasText: 'Contactul intim a fost șters.' }).getByRole('button', { name: 'Anulează' }).click();
  await expect(chip(page, 'Sex oral')).toBeChecked();
});

test('hearts can be hidden from the calendar for discretion', async ({ page }) => {
  await startWithJournal(page);
  await logContact(page);
  await openSettings(page, 'Confidențialitate și securitate');
  await page.getByRole('switch', { name: 'Arată contactele intime în calendar' }).click();
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await page.getByRole('button', { name: 'Înapoi' }).click();

  await tab(page, 'Calendar');
  await expect(page.locator('.cal .mark-heart')).toHaveCount(0);
  await expect(page.getByRole('button', { name: TODAY_CELL })).not.toHaveAccessibleName(/contact intim/);
  await expect(page.locator('.cal-legend')).not.toContainText('Contact intim');
  await expect(page.locator('#day-heading').locator('..')).not.toContainText('contact intim');
  // Still logged, and still counted.
  await tab(page, 'Azi');
  await expect(page.getByRole('region', { name: 'Risc de sarcină' })).toContainText('1 contact intim notat');
  await tab(page, 'Jurnal');
  await expect(page.getByRole('switch', { name: 'Am avut un contact intim' })).toBeChecked();
});

test('contacts travel with the JSON backup but never reach the PDF report', async ({ page }) => {
  await startWithJournal(page);
  await logContact(page);
  await chip(page, 'Penetrare vaginală').check();
  await chip(page, 'Prezervativ').check();

  await openSettings(page, 'Datele mele');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportă datele (JSON)' }).click();
  const backup = JSON.parse(readFileSync(await (await download).path(), 'utf8'));
  expect(backup.data.logs['2026-11-15'].intimacy).toEqual({ activities: ['vaginal'], protection: ['condom'] });

  await page.getByRole('button', { name: 'Înapoi' }).click();
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await tab(page, 'Statistici');
  await page.getByRole('button', { name: 'Creează raportul PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'Raport pentru medic' });
  await dialog.getByRole('checkbox', { name: /Include notele din jurnal/ }).check();
  const pdf = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Generează PDF' }).click();
  const text = readFileSync(await (await pdf).path()).toString('latin1');
  expect(text).toContain('%PDF');
  for (const word of ['Prezervativ', 'intim', 'Penetrare']) expect(text).not.toContain(word);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`intimacy logging and the risk card pass automated WCAG checks (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await startWithJournal(page);
    await logContact(page);
    await chip(page, 'Penetrare vaginală').check();
    await chip(page, 'Prezervativ').check();
    const check = async (where: string) => {
      const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
        where,
      ).toEqual([]);
    };
    await check('journal');
    await tab(page, 'Azi');
    await check('today');
    await tab(page, 'Calendar');
    await check('calendar');
  });
}
