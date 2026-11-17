import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { startEmpty, startWithJournal } from './helpers';

/** The capybara's lines in src/i18n/ro.ts (the app's dictionary cannot be loaded outside the build). */
const FOLLICULAR = ['Energie nouă, idei noi!', 'Zi bună pentru mișcare.', 'Hai să încercăm ceva nou!'];
const HELLO = ['Mă bucur că ești aici!', 'Pas cu pas, împreună.', 'Te descurci minunat!'];
const oneOf = (lines: string[]) => new RegExp(`^(${lines.map((l) => l.replace(/[.!?]/g, '\\$&')).join('|')})$`);

test('the capybara peeks over the day number and turns the dial over when tapped', async ({ page }) => {
  await startWithJournal(page); // day 12, follicular phase
  const today = page.locator('.page[data-active]');
  const ring = today.getByRole('img', { name: 'Ziua 12 a ciclului, Faza foliculară' });
  const center = today.locator('.dial-flip');

  // Hiding: head and body behind the day text, the paws resting on the digits, in front of them.
  await expect(today.locator('.dial-num .capy-peek-back')).toBeVisible();
  await expect(today.locator('.dial-num .capy-peek-front')).toBeVisible();
  expect(await today.locator('.capy-peek-front').evaluate((el) => getComputedStyle(el).zIndex)).toBe('1');
  await expect(center).toHaveAccessibleName('Ziua 12, Faza foliculară. Arată capibara');
  await expect(center).not.toHaveAttribute('data-flipped');
  const peekZ = await today.locator('.capy-peek-back').evaluate((el) => getComputedStyle(el).zIndex);
  expect(peekZ).toBe('-1');

  // A tap turns the card: the capybara in its follicular pose, with a short message read out.
  await center.click();
  await expect(center).toHaveAttribute('data-flipped');
  await expect(today.locator('.dial-back .capy-full')).toHaveAttribute('data-mood', 'follicular');
  const said = today.locator('.dial-wrap [aria-live="polite"]');
  await expect(said).toHaveText(oneOf(FOLLICULAR));
  const first = await said.textContent();
  await expect(today.locator('.dial-say')).toHaveText(first!);
  await expect(center).toHaveAccessibleName(`${first} Înapoi la ziua ciclului`);

  // A second tap turns it back; the ring and its colours are untouched.
  await center.click();
  await expect(center).not.toHaveAttribute('data-flipped');
  await expect(said).toHaveText('');
  await expect(ring).toBeVisible();

  // Each showing brings the next message, and the dial turns back on its own after a few seconds.
  await center.press('Enter');
  await expect(center).toHaveAttribute('data-flipped');
  await expect(said).not.toHaveText(first!);
  await page.clock.runFor(7500);
  await expect(center).not.toHaveAttribute('data-flipped');
  await expect(center).toHaveAccessibleName('Ziua 12, Faza foliculară. Arată capibara');
});

test('the dial passes automated WCAG checks on both faces', async ({ page }) => {
  await startWithJournal(page);
  const today = page.locator('.page[data-active]');
  const check = async (face: string) => {
    const results = await new AxeBuilder({ page: page as never })
      .include('.page[data-active] .today-cycle')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const found = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target.join(' ')} ${n.failureSummary}`).join(' | ')}`);
    expect(found, face).toEqual([]);
  };
  await check('front');
  await today.locator('.dial-flip').click();
  await page.waitForTimeout(800); // the turn is over
  await check('back');
});

test('with no cycle yet, the capybara waves', async ({ page }) => {
  await startEmpty(page);
  const today = page.locator('.page[data-active]');
  await today.getByRole('button', { name: 'Arată capibara' }).click();
  await expect(today.locator('.dial-back .capy-full')).toHaveAttribute('data-mood', 'hello');
  await expect(today.locator('.dial-wrap [aria-live="polite"]')).toHaveText(oneOf(HELLO));
});

test('the card turns gradually, or at once when the system asks for reduced motion', async ({ page }) => {
  await startWithJournal(page);
  const angles = () =>
    page.evaluate(async () => {
      const card = document.querySelector('.page[data-active] .dial-card') as HTMLElement;
      (document.querySelector('.page[data-active] .dial-flip') as HTMLElement).click();
      const out: number[] = [];
      for (let i = 0; i < 20; i++) {
        const m = new DOMMatrix(getComputedStyle(card).transform);
        out.push(Math.abs(Math.round((Math.atan2(-m.m13, m.m11) * 180) / Math.PI)));
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      return out;
    });

  // The test setup asks for reduced motion: no in-between angle.
  const instant = await angles();
  expect(instant.every((a) => a === 0 || a === 180)).toBe(true);
  await page.locator('.page[data-active] .dial-flip').click(); // back to the front

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(800);
  const turning = await angles();
  expect(turning.some((a) => a > 15 && a < 165)).toBe(true);
  expect(turning.at(-1)).toBeGreaterThan(150);
});
