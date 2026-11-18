import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { MASCOT_SHOW_MS, MASCOT_TURN_MS, THOUGHT_DELAY_MS } from '../src/domain/mascot';
import { startEmpty, startWithJournal } from './helpers';

/** The default thoughts of src/i18n/ro.ts, per pose (the app's dictionary is not loaded outside the build). */
const FOLLICULAR = ['Ce idee nouă ți-ar plăcea? ✨', 'Hai la o plimbare? 🌿', 'Energia e de partea ta azi 💪', 'Ce încerci nou săptămâna asta? 🌱'];
const HELLO = ['Ai grijă de tine, ești super! ✨', 'Un ceai cald ar merge perfect ☕', 'Mă bucur că ești aici! 🌿', 'Pas cu pas, împreună. 🌱'];
const oneOf = (lines: string[]) => new RegExp(`^(${lines.map((l) => l.replace(/[.!?]/g, '\\$&')).join('|')})$`);

const dial = (page: Page) => page.locator('.page[data-active] .dial-flip');
const bubble = (page: Page) => page.locator('.page[data-active] .dial-say');
const field = (page: Page) => page.locator('.page[data-active] .dial-draft');
const live = (page: Page) => page.locator('.page[data-active] .dial-wrap > p[aria-live="polite"]');

test('tapping the dial turns it, and the thought comes about a second after the turn ends', async ({ page }) => {
  await startWithJournal(page); // day 12, follicular phase
  await dial(page).click();
  await expect(dial(page)).toHaveAttribute('data-flipped');
  await expect(page.locator('.page[data-active] .dial-back .capy-full')).toHaveAttribute('data-mood', 'follicular');

  // Still turning, and the pause after it: no thought yet.
  await page.clock.runFor(MASCOT_TURN_MS);
  await expect(bubble(page)).toHaveCount(0);

  // After the pause, the thought appears, and is read out.
  await page.clock.runFor(THOUGHT_DELAY_MS + 100);
  await expect(bubble(page)).toHaveText(oneOf(FOLLICULAR));
  await expect(live(page)).toHaveText(oneOf(FOLLICULAR));
  await expect(dial(page)).toHaveAccessibleName('Înapoi la ziua ciclului');
});

test('tapping the thought writes your own; Enter remembers it and the dial stays turned', async ({ page }) => {
  await startWithJournal(page);
  await dial(page).click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  await bubble(page).click();

  await expect(field(page)).toBeFocused();
  await field(page).click(); // a tap inside the field does not turn the dial back
  await expect(dial(page)).toHaveAttribute('data-flipped');

  await field(page).fill('  Un gând  al meu, scris azi ');
  await field(page).press('Enter');
  await expect(bubble(page)).toHaveText('Un gând al meu, scris azi');
  await expect(live(page)).toHaveText('Gândul a fost salvat.');
  await expect(dial(page)).toHaveAttribute('data-flipped');

  // It is remembered on this device: after a restart the same thought comes back.
  await page.reload();
  await dial(page).click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  await expect(bubble(page)).toHaveText('Un gând al meu, scris azi');
});

test('while someone writes, the dial does not turn back on its own; Escape stops writing', async ({ page }) => {
  await startWithJournal(page);
  await dial(page).click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  await bubble(page).click();

  await page.clock.runFor(MASCOT_SHOW_MS + 2000);
  await expect(dial(page)).toHaveAttribute('data-flipped');
  await expect(field(page)).toBeVisible();

  await field(page).press('Escape');
  await expect(field(page)).toHaveCount(0);
  await expect(dial(page)).toHaveAttribute('data-flipped');

  // Once writing has stopped, the dial turns back on its own as before.
  await page.clock.runFor(MASCOT_SHOW_MS + 500);
  await expect(dial(page)).not.toHaveAttribute('data-flipped');
  await expect(bubble(page)).toHaveCount(0);
});

test('"Default thoughts" puts the defaults back after an own thought was written', async ({ page }) => {
  await startWithJournal(page);
  await dial(page).click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  await bubble(page).click();
  await field(page).fill('Un gând al meu');
  await page.getByRole('button', { name: 'Salvează ✓' }).click();
  await expect(bubble(page)).toHaveText('Un gând al meu');

  await bubble(page).click();
  await page.getByRole('button', { name: 'Gânduri implicite' }).click();
  await expect(live(page)).toHaveText('Au revenit gândurile implicite.');
  await expect(dial(page)).toHaveAttribute('data-flipped'); // the dial stays turned
  await expect(bubble(page)).toHaveText(oneOf(FOLLICULAR));
});

test('a blank thought is not saved: writing nothing keeps the one that was there', async ({ page }) => {
  await startWithJournal(page);
  await dial(page).click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  await bubble(page).click();
  await field(page).fill('   ');
  await field(page).press('Enter');
  await expect(field(page)).toHaveCount(0);
  await expect(bubble(page)).toHaveText(oneOf(FOLLICULAR));
});

test('the thought bubble can be opened from the keyboard', async ({ page }) => {
  await startWithJournal(page);
  await dial(page).click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  await bubble(page).focus();
  await page.keyboard.press('Enter');
  await expect(field(page)).toBeFocused();
});

test('with no cycle yet, the capybara turns and thinks a general thought', async ({ page }) => {
  await startEmpty(page);
  await page.locator('.page[data-active] .dial-flip').click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  await expect(page.locator('.page[data-active] .dial-say')).toHaveText(oneOf(HELLO));
});

test('the bubble stays inside the dial on a small phone, with the capybara still visible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await startWithJournal(page);
  await dial(page).click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  const wrap = await page.locator('.page[data-active] .dial-wrap').boundingBox();
  const shown = await page.locator('.page[data-active] .dial-thought').boundingBox();
  expect(shown).not.toBeNull();
  const b = shown!;
  expect(b.x).toBeGreaterThan(wrap!.x);
  expect(b.x + b.width).toBeLessThan(wrap!.x + wrap!.width);
  expect(b.y).toBeGreaterThan(wrap!.y);
  expect(b.y + b.height).toBeLessThan(wrap!.y + wrap!.height * 0.6); // leaves the capybara its space below
  await expect(page.locator('.page[data-active] .dial-back .capy-full')).toBeVisible();

  // Writing on a small phone: the field stays inside the dial too.
  await bubble(page).click();
  const edit = await page.locator('.page[data-active] .dial-thought').boundingBox();
  expect(edit!.x).toBeGreaterThanOrEqual(wrap!.x);
  expect(edit!.x + edit!.width).toBeLessThanOrEqual(wrap!.x + wrap!.width);
});

test('the field is 16px, so iOS does not zoom into it, yet it is drawn inside the bubble at the old size', async ({ page }) => {
  await startWithJournal(page);
  await dial(page).click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  await bubble(page).click();
  await expect(field(page)).toBeFocused();

  // iOS Safari zooms into a field under 16px and stays zoomed when it closes.
  expect(await field(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  // What is drawn: 0.8 of that, inside the bubble, with no space left over under it.
  const drawn = await field(page).boundingBox();
  const frame = await page.locator('.page[data-active] .dial-bubble').boundingBox();
  const actions = await page.locator('.page[data-active] .dial-actions').boundingBox();
  expect(drawn!.x).toBeGreaterThanOrEqual(frame!.x);
  expect(drawn!.x + drawn!.width).toBeLessThanOrEqual(frame!.x + frame!.width);
  expect(actions!.y - (drawn!.y + drawn!.height)).toBeLessThan(12);

  // Leaving it, the page is not left zoomed or scrolled sideways.
  await field(page).press('Escape');
  await expect(field(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('the dial passes automated WCAG checks while the thought shows and while it is written', async ({ page }) => {
  await startWithJournal(page);
  await dial(page).click();
  await page.clock.runFor(MASCOT_TURN_MS + THOUGHT_DELAY_MS + 100);
  const check = async (state: string) => {
    const results = await new AxeBuilder({ page: page as never })
      .include('.page[data-active] .today-cycle')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const found = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target.join(' ')} ${n.failureSummary}`).join(' | ')}`);
    expect(found, state).toEqual([]);
  };
  await check('thought');
  await bubble(page).click();
  await expect(field(page)).toBeVisible();
  await check('writing');
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
  await dial(page).click(); // back to the front

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(800);
  const turning = await angles();
  expect(turning.some((a) => a > 15 && a < 165)).toBe(true);
  expect(turning.at(-1)).toBeGreaterThan(150);
});
