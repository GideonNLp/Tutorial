import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openApp, openSettings, startWithDemoData, tab } from './helpers';

async function expectNoViolations(page: Page, context: string): Promise<void> {
  const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 4)
        .join(' | ')}`,
  );
  expect(summary, `axe violations on ${context}`).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accessibility, ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test('onboarding screens pass automated WCAG checks', async ({ page }) => {
      await openApp(page);
      await expectNoViolations(page, 'welcome');
      await page.getByRole('button', { name: 'Începe' }).click();
      await expectNoViolations(page, 'consent');
    });

    test('main screens pass automated WCAG checks', async ({ page }) => {
      await startWithDemoData(page);
      await expectNoViolations(page, 'today');
      for (const name of ['Calendar', 'Jurnal', 'Sfaturi', 'Statistici'] as const) {
        await tab(page, name);
        await expectNoViolations(page, name);
      }
    });

    test('settings screens pass automated WCAG checks', async ({ page }) => {
      await startWithDemoData(page);
      await openSettings(page);
      await expectNoViolations(page, 'settings');
      for (const section of [
        'Ciclul meu',
        'Memento-uri',
        'Confidențialitate și securitate',
        'Datele mele',
        'Aspect și accesibilitate',
        'Despre CycleCare',
      ]) {
        await page.getByRole('link', { name: new RegExp(section) }).click();
        await expect(page.getByRole('heading', { level: 1, name: section })).toBeVisible();
        await expectNoViolations(page, section);
        await page.getByRole('button', { name: 'Înapoi' }).click();
      }
    });
  });
}

test('text size and theme can be changed and are remembered', async ({ page }) => {
  await startWithDemoData(page);
  await openSettings(page, 'Aspect și accesibilitate');
  const rootSize = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(await rootSize()).toBe(16);
  await page.getByRole('radio', { name: 'Foarte mare' }).check();
  expect(await rootSize()).toBeCloseTo(20.8, 1);
  await page.getByRole('radio', { name: 'Întunecată' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(20, 18, 30)');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await rootSize()).toBeCloseTo(20.8, 1);
});

test('at the largest text size on a small phone nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await startWithDemoData(page);
  await openSettings(page, 'Aspect și accesibilitate');
  await page.getByRole('radio', { name: 'Foarte mare' }).check();
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await page.getByRole('button', { name: 'Înapoi' }).click();
  for (const name of ['Azi', 'Calendar', 'Jurnal', 'Sfaturi', 'Statistici'] as const) {
    await tab(page, name);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${name}`).toBeLessThanOrEqual(0);
  }
});

test('each screen moves focus to its heading and the skip link works', async ({ page }) => {
  await startWithDemoData(page);
  await tab(page, 'Calendar');
  await expect(page.getByRole('heading', { level: 1, name: 'Calendar' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  // After a fresh load nothing has taken focus yet, so the skip link is the first stop.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Calendar' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Sari la conținut' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('the app talks to no other server', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'http:' || url.protocol === 'https:') origins.add(url.origin);
  });
  await startWithDemoData(page);
  for (const name of ['Calendar', 'Jurnal', 'Sfaturi', 'Statistici'] as const) await tab(page, name);
  await page.getByRole('button', { name: 'Creează raportul PDF' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generează PDF' }).click();
  await download;
  expect([...origins]).toEqual([new URL(page.url()).origin]);

  // And the Content-Security-Policy would block it if some code tried.
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("connect-src 'self'");
  expect(csp).toContain("default-src 'self'");
  const blocked = await page.evaluate(() =>
    fetch('https://example.com/').then(
      () => 'sent',
      () => 'blocked',
    ),
  );
  expect(blocked).toBe('blocked');
});

test('the installed app starts offline', async ({ page, context }) => {
  await startWithDemoData(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.waitForTimeout(800); // precaching finishes just after "ready"
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('img', { name: /Ziua 12 a ciclului/ })).toBeVisible();
  await tab(page, 'Statistici');
  await expect(page.getByRole('heading', { name: 'Durata ciclurilor' })).toBeVisible();
});
