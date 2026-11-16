// Regenerates the screenshots used in the docs.
//   npm run build && npx vite preview --port 4173 --host localhost &
//   node scripts/screenshots.mjs            (APP_URL overrides the address)
// The clock is fixed, and the demo journal is deterministic, so the images are reproducible.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
const url = process.env.APP_URL ?? 'http://localhost:4173/';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});

async function session(colorScheme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'ro-RO',
    timezoneId: 'Europe/Bucharest',
    colorScheme,
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-11-15T09:00:00+02:00') });
  await page.goto(url);
  const shot = async (name, options = {}) => {
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}${name}.png`, ...options });
    console.log('wrote', `${name}.png`);
  };
  return { context, page, shot };
}

async function consent(page) {
  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: 'Sunt de acord și continui' }).click();
}
const tab = (page, name) => page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
const go = (page, hash) => page.evaluate((h) => (location.hash = h), hash);

// --- Onboarding, answered by hand --------------------------------------------------------------
{
  const { context, page, shot } = await session('light');
  await shot('01-bun-venit');
  await page.getByRole('button', { name: 'Începe' }).click();
  await shot('02-consimtamant', { fullPage: true });
  await consent(page);
  await page.getByLabel('Prima zi a ultimei menstruații').fill('2026-11-04');
  await shot('03-ultima-menstruatie');
  await page.getByRole('button', { name: 'Continuă' }).click();
  await shot('04-durata-ciclului');
  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('checkbox', { name: 'Contracepție' }).check();
  await page.getByRole('checkbox', { name: 'Înțelegerea simptomelor' }).check();
  await shot('05-obiective');
  await page.getByRole('button', { name: 'Continuă' }).click();
  await shot('06-pin-si-memento', { fullPage: true });
  await context.close();
}

// --- The app with the demo journal -------------------------------------------------------------
for (const scheme of ['light', 'dark']) {
  const { context, page, shot } = await session(scheme);
  await page.getByRole('button', { name: 'Explorează cu date demonstrative' }).click();
  await consent(page);
  await page.waitForSelector('nav.tabbar');
  if (scheme === 'dark') {
    await shot('16-azi-intunecat');
    await tab(page, 'Calendar');
    await shot('17-calendar-intunecat');
    await context.close();
    continue;
  }
  await shot('07-azi');
  await shot('07-azi-complet', { fullPage: true });
  await tab(page, 'Calendar');
  await shot('08-calendar');
  await tab(page, 'Jurnal');
  await shot('09-jurnal');
  await tab(page, 'Sfaturi');
  await shot('10-sfaturi');
  await tab(page, 'Statistici');
  await shot('11-statistici');
  await page.getByRole('heading', { name: 'Simptome pe luni' }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -16));
  await shot('12-statistici-grafice');
  await go(page, 'setari');
  await shot('13-setari');
  await go(page, 'setari-memento');
  await page.getByRole('button', { name: 'Adaugă pilula' }).click();
  await page.getByRole('switch', { name: 'Începutul menstruației estimate' }).check();
  await shot('14-memento', { fullPage: true });
  await go(page, 'setari-confidentialitate');
  await page.getByRole('button', { name: 'Setează un PIN' }).click();
  await page.getByLabel('PIN nou (4–8 cifre)').fill('2718');
  await page.getByLabel('Repetă PIN-ul nou').fill('2718');
  await page.getByRole('dialog').getByRole('button', { name: 'Setează un PIN' }).click();
  await page.getByText('PIN activ', { exact: true }).waitFor();
  await page.waitForTimeout(4200); // let the confirmation toast leave
  await shot('15-confidentialitate', { fullPage: true });
  await page.getByRole('button', { name: 'Blochează acum' }).click();
  await shot('18-blocare');
  await context.close();
}

await browser.close();
