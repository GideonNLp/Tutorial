import { expect, test } from '@playwright/test';
import { acceptConsent, dumpStorage, openApp, startEmpty } from './helpers';

test('asks the four questions, needs explicit consent, and predicts from the answers', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Începe' }).click();

  // Consent is unticked by default and cannot be skipped.
  await page.getByRole('button', { name: 'Sunt de acord și continui' }).click();
  await expect(page.getByRole('alert')).toContainText('Bifează acordul');
  await page.getByRole('button', { name: 'Citește declarația de confidențialitate' }).click();
  await expect(page.getByRole('dialog', { name: 'Declarație de confidențialitate' })).toContainText('Cu cine partajăm datele');
  await page.getByRole('button', { name: 'Închide' }).click();
  await acceptConsent(page);

  await expect(page.getByRole('heading', { name: 'Când a început ultima ta menstruație?' })).toBeFocused();
  await page.getByLabel('Prima zi a ultimei menstruații').fill('2026-11-04');
  await page.getByRole('button', { name: 'Continuă' }).click();

  await page.getByRole('button', { name: 'Crește cu unu' }).click();
  await page.getByRole('button', { name: 'Crește cu unu' }).click();
  await expect(page.getByLabel('Durata ciclului, în zile')).toHaveValue('30');
  await page.getByRole('button', { name: 'Continuă' }).click();

  await page.getByRole('button', { name: 'Nu știu' }).click(); // period length skipped

  await page.getByRole('checkbox', { name: 'Contracepție' }).check();
  await expect(page.getByRole('alert')).toContainText('CycleCare nu este un mijloc de contracepție');
  await page.getByRole('button', { name: 'Continuă' }).click();

  await expect(page.getByText('Ciclu obișnuit: 30 de zile.')).toBeVisible();
  await page.getByRole('button', { name: 'Deschide CycleCare' }).click();

  // 4 Nov + 30 days = 4 Dec, ± 4 days while nothing is recorded yet.
  await expect(page.getByRole('img', { name: 'Ziua 12 a ciclului, Faza foliculară' })).toBeVisible();
  await expect(page.getByText('Probabil între 30 noiembrie și 8 decembrie')).toBeVisible();
  await expect(page.getByText('Precizie scăzută. Pe baza duratei declarate de tine.')).toBeVisible();
  await expect(page.getByText('Zile fertile estimate: 14–20 nov.')).toBeVisible();
  await expect(page.getByText(/CycleCare nu este un mijloc de contracepție/)).toBeVisible();
});

test('every optional question can be skipped', async ({ page }) => {
  await startEmpty(page);
  await expect(page.getByRole('heading', { name: 'Notează prima zi de menstruație' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Următoarea menstruație' })).toHaveCount(0);
});

test('declining consent stores nothing', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Începe' }).click();
  await page.getByRole('button', { name: 'Nu sunt de acord' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Fără acest acord' })).toBeVisible();
  expect(await dumpStorage(page)).toBe('');
});

test('a date in the future is rejected', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Începe' }).click();
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Continuă' }).click();
  await expect(page.getByRole('alert')).toContainText('Alege o zi de până azi');
});
