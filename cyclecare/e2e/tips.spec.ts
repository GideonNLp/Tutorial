import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { startWithJournal, tab } from './helpers';

// The sample journal is on cycle day 12, in the follicular phase.
const cards = (page: Page) => page.locator('.page[data-active] .tip-card');
const titles = (page: Page) => cards(page).locator('h3').allTextContents();

test('the phase is summed up in a coloured card that explains the hormones on request', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Sfaturi');
  const phaseCard = page.locator('.page[data-active] .phase-card');
  await expect(phaseCard).toHaveAttribute('data-phase', 'follicular');
  await expect(phaseCard).toContainText('Faza foliculară · acum');
  const why = phaseCard.getByText('De ce se întâmplă asta?');
  await expect(phaseCard.getByText(/hormonul FSH/)).toBeHidden();
  await why.click();
  await expect(phaseCard.getByText(/hormonul FSH/)).toBeVisible();
});

test('tips are cards with a theme, a short text, "De ce ajută?" and "Am aplicat ✓"', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Sfaturi');
  await expect(cards(page)).toHaveCount(3);
  await expect(page.getByText('3 din 7 idei · se schimbă în fiecare zi a ciclului')).toBeVisible();

  const first = cards(page).first();
  await expect(first.locator('.tip-cat')).toHaveText('Alimentație');
  await expect(first.locator('.tip-cat svg')).toHaveCount(1);
  await expect(first.getByRole('heading', { level: 3 })).toHaveText('Proteine la fiecare masă');
  // The explanation stays closed until asked for.
  await expect(first.getByText(/proteinele ajută mușchii să se refacă/)).toBeHidden();
  await first.getByText('De ce ajută?').click();
  await expect(first.getByText(/proteinele ajută mușchii să se refacă/)).toBeVisible();

  // Another theme, another set of cards with the matching label.
  await page.getByRole('radio', { name: 'Somn' }).check();
  await expect(cards(page).first().locator('.tip-cat')).toHaveText('Somn');
  await expect(cards(page)).toHaveCount(3);
});

test('"Am aplicat ✓" marks a card for today, survives a restart, and can be undone', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Sfaturi');
  const card = cards(page).first();
  const button = card.getByRole('button', { name: 'Am aplicat' });
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(button).toHaveAccessibleDescription('Proteine la fiecare masă');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(card).toHaveAttribute('data-applied', '');
  await expect(card.getByText('Aplicat azi')).toBeVisible();

  await page.waitForTimeout(600);
  await page.reload();
  await tab(page, 'Sfaturi');
  await expect(cards(page).first().getByRole('button', { name: 'Am aplicat' })).toHaveAttribute('aria-pressed', 'true');

  await cards(page).first().getByRole('button', { name: 'Am aplicat' }).click();
  await expect(cards(page).first().getByRole('button', { name: 'Am aplicat' })).toHaveAttribute('aria-pressed', 'false');
  await expect(cards(page).first().getByText('Aplicat azi')).toHaveCount(0);
});

test('"Alte idei ↻" shows another set at once, and the set changes with the day of the cycle', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Sfaturi');
  const today = await titles(page);
  expect(today).toEqual(['Proteine la fiecare masă', 'Încearcă un aliment nou', 'Alimente fermentate']);

  await page.getByRole('button', { name: 'Alte idei' }).click();
  const more = await titles(page);
  expect(more).toHaveLength(3);
  expect(more).not.toEqual(today);
  await page.getByRole('button', { name: 'Alte idei' }).click();
  expect(await titles(page)).not.toEqual(more);

  // A new day of the cycle starts from a different place, without pressing anything.
  await page.clock.setSystemTime(new Date('2026-11-16T09:00:00+02:00'));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await tab(page, 'Sfaturi');
  await expect.poll(() => titles(page)).not.toEqual(today);
  // Day 13 is already the ovulation phase, which is now the one preselected.
  await expect(page.locator('.page[data-active] .phase-card')).toHaveAttribute('data-phase', 'ovulation');
  expect(await titles(page)).toHaveLength(3);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the tips page passes automated WCAG checks (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await startWithJournal(page);
    await tab(page, 'Sfaturi');
    await page.locator('.page[data-active] .phase-card').getByText('De ce se întâmplă asta?').click();
    await cards(page).first().getByText('De ce ajută?').click();
    await cards(page).nth(1).getByRole('button', { name: 'Am aplicat' }).click();
    for (const phase of ['Menstruație', 'Faza foliculară', 'Ovulație', 'Faza luteală']) {
      await page.getByRole('radio', { name: new RegExp(phase) }).check();
      const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
        phase,
      ).toEqual([]);
    }
  });
}
