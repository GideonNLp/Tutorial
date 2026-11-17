import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { NOW, dumpStorage, editJournalSection, openApp, openSettings, startWithJournal, tab } from './helpers';

/** A second phone: its own browser context, so its own storage. */
async function partnerPhone(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    locale: 'ro-RO',
    timezoneId: 'Europe/Bucharest',
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await openApp(page);
  return page;
}

/** The owner invites; returns the code shown on her screen. */
async function invite(owner: Page): Promise<string> {
  await openSettings(owner, 'Partener');
  await owner.getByRole('button', { name: 'Invită partenerul' }).click();
  const consent = owner.getByRole('dialog', { name: 'Acord separat pentru Modul Partener' });
  await expect(consent).toContainText('serverul nu îl poate citi');
  await consent.getByRole('button', { name: 'Sunt de acord cu această partajare' }).click();
  const code = owner.locator('.pair-code');
  await expect(code).toHaveText(/^[A-Z2-9]{3} [A-Z2-9]{3}$/);
  return (await code.textContent())!.replace(' ', '');
}

/** The partner types the code; both screens show the same digits; the owner approves. */
async function connect(owner: Page, partner: Page, code: string) {
  await partner.getByRole('button', { name: 'Conectează-te ca partener' }).click();
  await partner.getByLabel('Codul de asociere').fill(code.toLowerCase());
  await partner.getByRole('button', { name: 'Conectează-te', exact: true }).click();
  const partnerDigits = partner.getByTestId('partner-digits');
  await expect(partnerDigits).toHaveText(/^\d{3} \d{3}$/);
  const ownerDigits = owner.getByTestId('owner-digits');
  await expect(ownerDigits).toHaveText((await partnerDigits.textContent())!, { timeout: 10_000 });
  await owner.getByRole('button', { name: 'Aprob' }).click();
  await expect(owner.getByText(/Partener conectat din 15 noiembrie 2026/)).toBeVisible();
  await expect(partner.getByRole('navigation', { name: 'Navigare principală' })).toBeVisible({ timeout: 10_000 });
}

/** Asks the partner's phone for news until `check` holds (the phone also polls every 20 s on its own). */
async function untilPartnerSees(partner: Page, check: () => Promise<void>) {
  await expect(async () => {
    await partner.getByRole('button', { name: 'Actualizează' }).click();
    await check();
  }).toPass({ timeout: 15_000, intervals: [500, 1000, 1500] });
}

test('two phones: pairing with matching digits, then a read-only view that follows her journal and permissions', async ({ page: owner, browser }) => {
  await startWithJournal(owner);
  const partner = await partnerPhone(browser);
  await connect(owner, partner, await invite(owner));

  // ---- What the partner sees: today.
  await expect(partner.getByRole('heading', { level: 1, name: 'Azi' })).toBeVisible();
  await expect(partner.getByText('Faza foliculară')).toBeVisible();
  await expect(partner.getByText('Ziua 12 a ciclului')).toBeVisible();
  await expect(partner.getByText(/Menstruația este așteptată peste \d+ (de )?zile\./)).toBeVisible();
  await expect(partner.getByRole('heading', { name: 'Cum se simte azi' })).toBeVisible();
  await expect(partner.getByRole('heading', { name: 'Cum poți ajuta' })).toBeVisible();
  await expect(partner.locator('.page[data-active] .tip-cards > li')).toHaveCount(2);
  // Read-only: no settings of hers, no profile, no journal controls.
  await expect(partner.getByRole('button', { name: 'Profil', exact: true })).toHaveCount(0);
  await expect(partner.getByRole('navigation', { name: 'Navigare principală' }).getByRole('link')).toHaveText(['Azi', 'Calendar', 'Istoric']);

  // ---- Calendar and history.
  await tab(partner, 'Calendar');
  await expect(partner.getByRole('button', { name: /duminică, 15 noiembrie 2026, azi/ })).toBeVisible();
  await expect(partner.locator('.cal-cell[data-phase="ovulation"]').first()).toBeVisible();
  await expect(partner.locator('.cal-num[data-period="predicted"]').first()).toBeVisible();
  await partner.getByRole('navigation', { name: 'Navigare principală' }).getByRole('link', { name: 'Istoric' }).click();
  await expect(partner.getByRole('heading', { level: 1, name: 'Istoric' })).toBeVisible();
  await expect(partner.locator('.page[data-active] .card').first()).toBeVisible();
  await expect(partner.locator('.page[data-active] input, .page[data-active] textarea')).toHaveCount(0);

  // Her data is kept encrypted on his phone too.
  await partner.waitForTimeout(600);
  const disk = await dumpStorage(partner);
  for (const plain of ['follicular', 'Ana', 'cramps', 'journal']) expect(disk).not.toContain(plain);

  // ---- She notes something: it reaches him.
  await tab(owner, 'Jurnal');
  await editJournalSection(owner, 'Simptome');
  await owner.getByRole('checkbox', { name: 'Dureri de cap' }).check();
  await partner.getByRole('navigation', { name: 'Navigare principală' }).getByRole('link', { name: 'Azi' }).click();
  await untilPartnerSees(partner, () =>
    expect(partner.locator('.page[data-active] .tag').filter({ hasText: 'Dureri de cap' })).toBeVisible({ timeout: 800 }),
  );

  // ---- Intimate contacts never travel, whatever the permissions.
  await editJournalSection(owner, 'Viață intimă');
  await owner.getByRole('switch', { name: 'Am avut un contact intim' }).click();
  await owner.waitForTimeout(2500);
  await partner.getByRole('button', { name: 'Actualizează' }).click();
  await expect(partner.getByText(/intim/i)).toHaveCount(0);

  // ---- She turns off "how she feels": his view says so.
  await openSettings(owner, 'Partener');
  await owner.getByRole('switch', { name: 'Cum te simți' }).click();
  await expect(owner.getByRole('switch', { name: 'Notițele personale' })).toBeDisabled();
  await untilPartnerSees(partner, () => expect(partner.getByText('Jurnalul nu este împărtășit.')).toBeVisible({ timeout: 800 }));

  // ---- She stops sharing.
  await owner.getByRole('button', { name: 'Oprește partajarea' }).click();
  await owner.getByRole('dialog').getByRole('button', { name: 'Da, oprește' }).click();
  await expect(owner.locator('.toast').filter({ hasText: 'Partajarea a fost oprită.' })).toBeVisible();
  await expect(owner.getByRole('button', { name: 'Invită partenerul' })).toBeVisible();
  await untilPartnerSees(partner, () => expect(partner.getByText(/Partajarea a fost oprită/)).toBeVisible({ timeout: 800 }));
  await expect(partner.getByRole('button', { name: 'Actualizează' })).toHaveCount(0);

  // ---- He disconnects: his phone is back to the start, with nothing of hers.
  await partner.getByRole('button', { name: 'Setări', exact: true }).click();
  await partner.getByRole('button', { name: 'Deconectează-te' }).click();
  await partner.getByRole('dialog').getByRole('button', { name: 'Da, deconectează-mă' }).click();
  await expect(partner.getByRole('button', { name: 'Începe' })).toBeVisible();
  expect(await dumpStorage(partner)).toBe('');
});

test('the owner can refuse when the digits do not match', async ({ page: owner, browser }) => {
  await startWithJournal(owner);
  const partner = await partnerPhone(browser);
  const code = await invite(owner);
  await partner.getByRole('button', { name: 'Conectează-te ca partener' }).click();
  await partner.getByLabel('Codul de asociere').fill(code);
  await partner.getByRole('button', { name: 'Conectează-te', exact: true }).click();
  await expect(owner.getByTestId('owner-digits')).toBeVisible({ timeout: 10_000 });
  await owner.getByRole('button', { name: 'Nu sunt aceleași' }).click();
  await expect(owner.getByRole('alert')).toContainText('Conectarea a fost respinsă');
  await expect(partner.getByRole('alert')).toContainText('nu a fost aprobată', { timeout: 10_000 });
  await expect(partner.getByRole('navigation', { name: 'Navigare principală' })).toHaveCount(0);
});

test('a wrong or malformed code is explained next to the field', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Conectează-te ca partener' }).click();
  const field = page.getByLabel('Codul de asociere');
  await field.fill('ab1');
  await page.getByRole('button', { name: 'Conectează-te', exact: true }).click();
  await expect(field).toHaveAccessibleDescription(/6 litere și cifre/);
  await field.fill('ZZZZZZ');
  await page.getByRole('button', { name: 'Conectează-te', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('nu există sau a expirat');
});

test('an invitation link opens the code screen with the code filled in', async ({ page: owner, browser }) => {
  await startWithJournal(owner);
  const code = await invite(owner);
  const context = await browser.newContext({ locale: 'ro-RO', timezoneId: 'Europe/Bucharest' });
  const partner = await context.newPage();
  await partner.clock.install({ time: NOW });
  await partner.goto(`/#partener=${code}`);
  await expect(partner.getByRole('heading', { level: 1, name: 'Conectează-te ca partener' })).toBeVisible();
  await expect(partner.getByLabel('Codul de asociere')).toHaveValue(code);
  // The code does not stay in the address.
  expect(new URL(partner.url()).hash).toBe('#azi');
});

test('Partner settings and the partner view pass automated WCAG checks', async ({ page: owner, browser }) => {
  const check = async (page: Page, where: string) => {
    const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      where,
    ).toEqual([]);
  };
  await startWithJournal(owner);
  const partner = await partnerPhone(browser);
  const code = await invite(owner);
  await check(owner, 'owner, code on screen');
  await connect(owner, partner, code);
  await check(owner, 'owner, connected');
  await check(partner, 'partner today');
  await tab(partner, 'Calendar');
  await check(partner, 'partner calendar');
  await partner.getByRole('button', { name: 'Setări', exact: true }).click();
  await check(partner, 'partner settings');
});
