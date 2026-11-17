import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { acceptConsent, openApp, startWithJournal, tab } from './helpers';

/**
 * Regenerates the screenshots used in the docs: `npm run docs:screenshots`.
 * Skipped in the normal test run. The clock is fixed and the sample journal is deterministic,
 * so the images are reproducible.
 */
const out = new URL('../docs/screenshots/', import.meta.url).pathname;

test.skip(!process.env.SCREENSHOTS, 'only when regenerating the docs');
test.use({ deviceScaleFactor: 2 });

const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}${name}.png` });
};

/** Pages scroll inside the app, so "the whole page" means making the window as tall as its content. */
const tallShot = async (page: Page, name: string) => {
  const size = page.viewportSize()!;
  const height = await page.locator('.page[data-active]').evaluate((el) => el.scrollHeight);
  await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) });
  await shot(page, name);
  await page.setViewportSize(size);
};

/** Lets confirmation toasts leave before a picture is taken. */
const clearToasts = async (page: Page) => {
  await page.clock.fastForward('00:12');
  await expect(page.locator('.toast')).toHaveCount(0);
};

test.beforeAll(() => mkdirSync(out, { recursive: true }));

test('first run', async ({ page }) => {
  await openApp(page);
  await shot(page, '01-bun-venit');
  await page.getByRole('button', { name: 'Începe' }).click();
  await tallShot(page, '02-consimtamant');
  await acceptConsent(page);
  await page.getByLabel('Prima zi a ultimei menstruații').fill('2026-11-04');
  await shot(page, '03-ultima-menstruatie');
  await page.getByRole('button', { name: 'Continuă' }).click();
  await shot(page, '04-durata-ciclului');
  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('checkbox', { name: 'Contracepție' }).check();
  await page.getByRole('checkbox', { name: 'Înțelegerea simptomelor' }).check();
  await shot(page, '05-obiective');
  await page.getByRole('button', { name: 'Continuă' }).click();
  await tallShot(page, '06-pin-si-memento');
});

test('the app with a filled journal', async ({ page }) => {
  await startWithJournal(page);
  await clearToasts(page);
  await shot(page, '07-azi');
  await tab(page, 'Calendar');
  await shot(page, '08-calendar');
  await tab(page, 'Jurnal');
  await shot(page, '09-jurnal');
  await tab(page, 'Sfaturi');
  await shot(page, '10-sfaturi');
  await tab(page, 'Statistici');
  await shot(page, '11-statistici');
  await page.getByRole('heading', { name: 'Simptome pe luni' }).evaluate((el) => {
    const scroller = el.closest('.page')!;
    scroller.scrollTop += el.getBoundingClientRect().top - 84;
  });
  await shot(page, '12-statistici-grafice');
  await page.getByRole('button', { name: 'Creează raportul PDF' }).click();
  await expect(page.getByRole('dialog', { name: 'Raport pentru medic' })).toBeVisible();
  await shot(page, '20-foaie-raport');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Setări', exact: true }).click();
  await shot(page, '13-setari');
  await page.getByRole('link', { name: /Memento-uri/ }).click();
  await page.getByRole('button', { name: 'Adaugă pilula' }).click();
  await page.getByRole('switch', { name: 'Începutul menstruației estimate' }).check();
  await tallShot(page, '14-memento');
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await page.getByRole('link', { name: /Confidențialitate și securitate/ }).click();
  await page.getByRole('button', { name: 'Setează un PIN' }).click();
  await page.getByLabel('PIN nou (4–8 cifre)').fill('2718');
  await page.getByLabel('Repetă PIN-ul nou').fill('2718');
  await page.getByRole('dialog').getByRole('button', { name: 'Setează un PIN' }).click();
  await expect(page.getByText('PIN activ', { exact: true })).toBeVisible();
  await page.clock.fastForward('00:06');
  await expect(page.locator('.toast')).toHaveCount(0);
  await tallShot(page, '15-confidentialitate');
  await page.getByRole('button', { name: 'Blochează acum' }).click();
  await shot(page, '18-blocare');
});

test('dark theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await startWithJournal(page);
  await clearToasts(page);
  await shot(page, '16-azi-intunecat');
  await tab(page, 'Calendar');
  await shot(page, '17-calendar-intunecat');
});

test('in motion: a page being pushed', async ({ page }) => {
  await startWithJournal(page);
  await clearToasts(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Hold the transition a third of the way in.
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, ...args: Parameters<typeof original>) {
      const animation = original.apply(this, args);
      if (this.classList.contains('page')) {
        animation.pause();
        animation.currentTime = 105;
      }
      return animation;
    };
  });
  await page.getByRole('button', { name: 'Setări', exact: true }).click();
  await expect(page.locator('.stage')).toHaveAttribute('data-moving', 'push');
  await shot(page, '21-tranzitie-push');
});
