import { expect, test, type Page } from '@playwright/test';
import { NOTES } from '../tests/fixtures/sampleJournal';
import { NOW, SAMPLE_BACKUP } from './helpers';

/** A phone set to English. Every other spec runs on a Romanian one (playwright.config.ts). */
test.use({ locale: 'en-GB' });

const ROMANIAN_LETTERS = /[ăâîșțşţĂÂÎȘȚŞŢ]/;

async function startInEnglish(page: Page): Promise<void> {
  await page.clock.install({ time: NOW });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Your cycle, explained simply' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: 'Your data stays with you' })).toBeVisible();
  await page.getByRole('checkbox', { name: /I agree that CycleCare may process/ }).check();
  await page.getByRole('checkbox', { name: /I am at least 16/ }).check();
  await page.getByRole('button', { name: 'I agree and continue' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'I don’t remember' }).click();
  await page.getByRole('button', { name: 'I don’t know' }).click();
  await page.getByRole('button', { name: 'I don’t know' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Open CycleCare' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
}

/** Visible text of the current screen that is still Romanian (the sample journal's own notes aside). */
async function romanianLeftovers(page: Page): Promise<string[]> {
  const text = await page.locator('.page[data-active]').innerText();
  return text.split('\n').filter((line) => ROMANIAN_LETTERS.test(line) && !NOTES.some((note) => line.includes(note)) && !line.includes('Română'));
}

async function tab(page: Page, name: string): Promise<void> {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

test('a phone set to English gets the whole app in English', async ({ page }) => {
  await startInEnglish(page);

  // Restore a filled journal, as a person moving from another device would.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: /My data/ }).click();
  await page
    .getByLabel('Restore from a file')
    .setInputFiles({ name: 'journal.json', mimeType: 'application/json', buffer: Buffer.from(SAMPLE_BACKUP) });
  await page.getByRole('dialog').getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Your data has been restored.' })).toBeVisible();

  await tab(page, 'Today');
  await expect(page.getByRole('img', { name: /Cycle day 12/ })).toBeVisible();
  await expect(page.getByText(/Probably between \d+ (November|December) and \d+ December/)).toBeVisible();
  expect(await romanianLeftovers(page)).toEqual([]);

  await tab(page, 'Calendar');
  await expect(page.getByRole('heading', { name: 'November 2026' })).toBeVisible();
  expect(await romanianLeftovers(page)).toEqual([]);

  await tab(page, 'Journal');
  await expect(
    page
      .locator('.page[data-active]')
      .getByText(/Cycle day 12/)
      .first(),
  ).toBeVisible();
  expect(await romanianLeftovers(page)).toEqual([]);

  await tab(page, 'Tips');
  await expect(page.locator('.page[data-active]').getByText('Why does it help?').first()).toBeVisible();
  expect(await romanianLeftovers(page)).toEqual([]);

  await tab(page, 'Statistics');
  await expect(page.locator('.page[data-active]').getByText('Average cycle')).toBeVisible();
  expect(await romanianLeftovers(page)).toEqual([]);

  // Every settings screen, and the privacy notice.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  for (const section of ['My cycle', 'Reminders', 'Privacy and security', 'My data', 'Partner', 'Appearance and accessibility', 'About CycleCare']) {
    await page.getByRole('link', { name: new RegExp(section) }).click();
    await expect(page.getByRole('heading', { level: 1, name: section })).toBeVisible();
    expect(await romanianLeftovers(page), section).toEqual([]);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
  }
  await page.getByRole('link', { name: /Privacy and security/ }).click();
  await page.getByRole('button', { name: 'Read the privacy notice' }).click();
  await expect(page.getByRole('heading', { name: '7. Who we share the data with' })).toBeVisible();
});

test('the language can be changed on the first screen and in Settings, and is remembered', async ({ page }) => {
  await page.clock.install({ time: NOW });
  await page.goto('/');
  await page.getByRole('button', { name: 'Română' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ciclul tău, pe înțelesul tău' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Ciclul tău, pe înțelesul tău' })).toBeVisible();
  await page.getByRole('button', { name: 'English' }).click();

  await startInEnglishFromWelcome(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: /Appearance and accessibility/ }).click();
  await page.getByLabel('Language').selectOption('ro');
  await expect(page.getByRole('heading', { level: 1, name: 'Aspect și accesibilitate' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Navigare principală' })).toBeVisible();
});

test('a journal started before English existed stays in Romanian on an English phone', async ({ page }) => {
  await startInEnglish(page);
  // What an earlier version left behind: display preferences without a language.
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('cyclecare.prefs') ?? '{}');
    delete prefs.locale;
    localStorage.setItem('cyclecare.prefs', JSON.stringify(prefs));
  });
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Navigare principală' })).toBeVisible();
});

async function startInEnglishFromWelcome(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: 'Your cycle, explained simply' })).toBeVisible();
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByRole('checkbox', { name: /I agree that CycleCare may process/ }).check();
  await page.getByRole('checkbox', { name: /I am at least 16/ }).check();
  await page.getByRole('button', { name: 'I agree and continue' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'I don’t remember' }).click();
  await page.getByRole('button', { name: 'I don’t know' }).click();
  await page.getByRole('button', { name: 'I don’t know' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Open CycleCare' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
}
