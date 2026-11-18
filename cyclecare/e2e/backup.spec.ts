import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { deriveBackupKeys, formatRecoveryCode, generateRecoveryCode, parseBackupFile } from '../src/backup/crypto';
import { dumpStorage, editJournalSection, openApp, openSettings, startWithJournal, tab } from './helpers';

/** A second phone: its own browser context, so its own storage. All phones share the app's relay. */
async function newPhone(browser: Browser): Promise<Page> {
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

const backupScreen = async (page: Page) => openSettings(page, 'Copie de siguranță');

/** From a screen inside Settings (the Backup screen), to another section of Settings. */
async function otherSection(page: Page, section: string) {
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await page.getByRole('link', { name: new RegExp(section) }).click();
  await expect(page.getByRole('heading', { level: 1, name: section })).toBeVisible();
}
const status = (page: Page) => page.getByTestId('backup-status');
const serverSwitch = (page: Page) => page.getByRole('switch', { name: 'Păstrează o copie criptată pe server' });

/** Creates the code, types back the group that is asked for, and returns the code (read off the screen, as a person would). */
async function createCode(page: Page): Promise<string> {
  await backupScreen(page);
  await page.getByRole('button', { name: 'Creează codul de recuperare' }).click();
  const code = (await page.locator('.page[data-active] [data-testid="recovery-code"] span').allTextContents()).join('');
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{24}$/);
  const ask = await page
    .locator('.page[data-active] .field-label')
    .filter({ hasText: /Scrie grupul \d din 6/ })
    .textContent();
  const n = Number(/grupul (\d)/.exec(ask!)![1]);
  await page.getByLabel('Grupul de patru caractere').fill(code.slice((n - 1) * 4, n * 4).toLowerCase());
  await page.getByRole('button', { name: 'Am notat codul' }).click();
  await expect(page.getByRole('button', { name: 'Arată codul' })).toBeVisible();
  return code;
}

/** Turns the copy on the server on, with the separate consent. */
async function turnOnServerCopy(page: Page) {
  await serverSwitch(page).click();
  const consent = page.getByRole('dialog', { name: 'Acord separat pentru copia pe server' });
  await expect(consent).toContainText('serverul nu o poate citi');
  await consent.getByRole('button', { name: 'Sunt de acord cu această copie' }).click();
  await expect(status(page)).toContainText('Ultima copie trimisă', { timeout: 10_000 });
}

/** What the relay holds for a code, asked the way the app asks (id and token derived from the code). */
async function serverVersions(request: APIRequestContext, code: string) {
  const { id, token } = await deriveBackupKeys(code);
  const res = await request.get(`/api/partner/backup/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status(), body: res.status() === 200 ? ((await res.json()) as { versions: Array<{ role: string }> }) : undefined, id, token };
}

/** First screen of a new phone → "Restaurează dintr-o copie" → code → server → found. */
async function openRestore(phone: Page, code: string) {
  await phone.getByRole('button', { name: 'Restaurează dintr-o copie' }).click();
  await phone.getByLabel('Codul de recuperare').fill(formatRecoveryCode(code).toLowerCase());
}

async function acceptConsent(phone: Page) {
  await expect(phone.getByRole('heading', { name: 'Datele tale rămân la tine' })).toBeVisible();
  await phone.getByRole('checkbox', { name: /Sunt de acord ca CycleCare să prelucreze/ }).check();
  await phone.getByRole('checkbox', { name: /Am cel puțin 16 ani/ }).check();
  await phone.getByRole('button', { name: 'Sunt de acord și continui' }).click();
}

test('the recovery code is shown once, must be typed back in part, and then stays hidden until asked for', async ({ page }) => {
  await startWithJournal(page);
  await backupScreen(page);
  await expect(page.getByText(/Datele tale sunt doar pe acest telefon/)).toBeVisible();
  await page.getByRole('button', { name: 'Creează codul de recuperare' }).click();

  const groups = await page.locator('.page[data-active] [data-testid="recovery-code"] span').allTextContents();
  expect(groups).toHaveLength(6);
  expect(groups.every((g) => /^[A-HJ-NP-Z2-9]{4}$/.test(g))).toBe(true);
  await expect(page.getByText('Codul nu este confirmat încă')).toBeVisible();
  // Nothing yet to save or to send: the code has to be written down first.
  await expect(page.getByRole('button', { name: 'Salvează un fișier criptat' })).toHaveCount(0);
  await expect(serverSwitch(page)).toBeDisabled();
  await expect(page.getByText('Creează și confirmă mai întâi codul de recuperare')).toBeVisible();

  const ask = await page
    .locator('.page[data-active] .field-label')
    .filter({ hasText: /Scrie grupul \d din 6/ })
    .textContent();
  const n = Number(/grupul (\d)/.exec(ask!)![1]);
  await page.getByLabel('Grupul de patru caractere').fill('AAAA');
  await page.getByRole('button', { name: 'Am notat codul' }).click();
  await expect(page.getByRole('alert')).toContainText('Nu este grupul corect');
  await page.getByLabel('Grupul de patru caractere').fill(groups[n - 1]!);
  await page.getByRole('button', { name: 'Am notat codul' }).click();

  await expect(page.getByTestId('recovery-code')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Salvează un fișier criptat' })).toBeVisible();
  await expect(serverSwitch(page)).toBeEnabled();
  await page.getByRole('button', { name: 'Arată codul' }).click();
  expect((await page.locator('.page[data-active] [data-testid="recovery-code"] span').allTextContents()).join('')).toBe(groups.join(''));

  // It survives a restart (it lives in the encrypted journal) and is in nothing readable.
  await page.reload(); // the address still names the Backup screen
  await expect(page.getByRole('heading', { level: 1, name: 'Copie de siguranță' })).toBeVisible();
  await page.getByRole('button', { name: 'Arată codul' }).click();
  expect((await page.locator('.page[data-active] [data-testid="recovery-code"] span').allTextContents()).join('')).toBe(groups.join(''));
  expect(await dumpStorage(page)).not.toContain(groups.join(''));
});

test('an encrypted file holds nothing readable and opens only with the code, on a new phone', async ({ page, browser }) => {
  await startWithJournal(page);
  const code = await createCode(page);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Salvează un fișier criptat' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^CycleCare-copie-2026-11-15\.cyclecare$/);
  const text = (await (await import('node:fs/promises')).readFile((await file.path())!, 'utf8')) as string;
  expect(parseBackupFile(text)).toBeDefined();
  for (const secret of ['"flow"', 'Crampe', 'Ana', code]) expect(text).not.toContain(secret);

  const phone = await newPhone(browser);
  await openRestore(phone, generateRecoveryCode()); // a code that is not this one
  await phone
    .getByLabel('Alege un fișier criptat')
    .setInputFiles({ name: 'copie.cyclecare', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(phone.getByRole('alert')).toContainText('Fișierul nu se deschide cu acest cod');

  await phone.getByLabel('Codul de recuperare').fill(formatRecoveryCode(code));
  await phone
    .getByLabel('Alege un fișier criptat')
    .setInputFiles({ name: 'copie.cyclecare', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(phone.getByTestId('restore-found')).toContainText(/Copia are \d+ de zile notate|Copia are \d+ zile notate/);
  await phone.getByRole('button', { name: 'Restaurează', exact: true }).click();
  await acceptConsent(phone);
  await expect(phone.getByRole('img', { name: /Ziua 12 a ciclului/ })).toBeVisible();

  // The new phone has the code too, so it can go on: it shows it and can save its own files.
  await openSettings(phone, 'Copie de siguranță');
  await phone.getByRole('button', { name: 'Arată codul' }).click();
  expect((await phone.locator('.page[data-active] [data-testid="recovery-code"] span').allTextContents()).join('')).toBe(code);
  await phone.context().close();
});

test('a file that is not a copy, or a code with a mistake, is told apart from a code that finds nothing', async ({ page, browser }) => {
  await startWithJournal(page);
  await page.close();
  const phone = await newPhone(browser);
  const code = generateRecoveryCode();
  await phone.getByRole('button', { name: 'Restaurează dintr-o copie' }).click();
  const field = phone.getByLabel('Codul de recuperare');

  await phone.getByRole('button', { name: 'Caută pe server' }).click();
  await expect(phone.getByRole('alert')).toContainText('Introdu mai întâi codul');

  await field.fill(code.slice(0, 23));
  await phone.getByRole('button', { name: 'Caută pe server' }).click();
  await expect(phone.getByRole('alert')).toContainText('Codul are o greșeală');

  const mistyped = code.slice(0, 23) + (code.at(-1) === 'A' ? 'B' : 'A');
  await field.fill(mistyped);
  await phone.getByRole('button', { name: 'Caută pe server' }).click();
  await expect(phone.getByRole('alert')).toContainText('Codul are o greșeală');

  await field.fill(formatRecoveryCode(code));
  await phone.getByRole('button', { name: 'Caută pe server' }).click();
  await expect(phone.getByRole('alert')).toContainText('Nu există nicio copie cu acest cod');

  await phone
    .getByLabel('Alege un fișier criptat')
    .setInputFiles({ name: 'plan.json', mimeType: 'application/json', buffer: Buffer.from('{"not":"a copy"}') });
  await expect(phone.getByRole('alert')).toContainText('nu este o copie criptată CycleCare');
  await phone.context().close();
});

test('the copy on the server needs its own consent, is sealed, and brings the journal back on another phone', async ({ page, browser, request }) => {
  await startWithJournal(page);
  const code = await createCode(page);
  expect((await serverVersions(request, code)).status).toBe(404);

  // Declining changes nothing.
  await serverSwitch(page).click();
  const consent = page.getByRole('dialog', { name: 'Acord separat pentru copia pe server' });
  await consent.getByRole('button', { name: 'Nu acum' }).click();
  await expect(serverSwitch(page)).not.toBeChecked();
  expect((await serverVersions(request, code)).status).toBe(404);

  await turnOnServerCopy(page);
  await expect(page.getByTestId('backup-versions')).toContainText('Cea mai recentă');
  const held = await serverVersions(request, code);
  expect(held.status).toBe(200);
  expect(held.body?.versions.map((v) => v.role)).toEqual(['latest']);
  // The server holds nothing readable, and the id it knows is not the code.
  const raw = await (await request.get(`/api/partner/backup/${held.id}/latest`, { headers: { Authorization: `Bearer ${held.token}` } })).text();
  for (const secret of ['Crampe', '"flow"', code, 'Ana']) expect(raw).not.toContain(secret);
  expect(raw).not.toContain(Buffer.from(code).toString('base64'));
  // Nobody else can read it: not without the token, not with another.
  expect((await request.get(`/api/partner/backup/${held.id}`)).status()).toBe(403);
  expect((await request.get(`/api/partner/backup/${held.id}`, { headers: { Authorization: 'Bearer wrong-token-0123456789' } })).status()).toBe(403);

  // The privacy screen no longer says that nothing leaves the phone.
  await otherSection(page, 'Confidențialitate și securitate');
  await expect(page.getByText(/Ai pornit copia de siguranță: o copie criptată a jurnalului/)).toBeVisible();
  await expect(page.getByText(/Copia de siguranță pe server este pornită/)).toBeVisible();

  // A new phone: code → server → found → restore → consent → the journal is there.
  const phone = await newPhone(browser);
  await openRestore(phone, code);
  await phone.getByRole('button', { name: 'Caută pe server' }).click();
  await expect(phone.getByTestId('restore-found')).toContainText(/zile notate/);
  await phone.getByRole('button', { name: 'Restaurează', exact: true }).click();
  await acceptConsent(phone);
  await expect(phone.getByRole('img', { name: /Ziua 12 a ciclului/ })).toBeVisible();
  await tab(phone, 'Calendar');
  await expect(phone.locator('.page[data-active] .cal-cell').first()).toBeVisible();
  await phone.context().close();
});

test('two phones on one code do not overwrite each other: the first one stops and asks', async ({ page, browser, request }) => {
  await startWithJournal(page);
  const code = await createCode(page);
  await turnOnServerCopy(page);

  // The second phone restores the copy and turns its own copy on: from here it is the one that writes.
  const second = await newPhone(browser);
  await openRestore(second, code);
  await second.getByRole('button', { name: 'Caută pe server' }).click();
  await second.getByRole('button', { name: 'Restaurează', exact: true }).click();
  await acceptConsent(second);
  await expect(second.getByRole('img', { name: /Ziua 12 a ciclului/ })).toBeVisible();
  await openSettings(second, 'Copie de siguranță');
  await expect(serverSwitch(second)).not.toBeChecked();
  await turnOnServerCopy(second);

  // The first phone changes something; its next copy finds the server has moved on.
  await tab(page, 'Jurnal');
  await editJournalSection(page, 'Simptome');
  await page.getByRole('checkbox', { name: 'Crampe' }).check();
  await page.clock.runFor(50_000);
  await openSettings(page, 'Copie de siguranță');
  await expect(page.getByText('Altă copie a luat locul')).toBeVisible({ timeout: 10_000 });
  await expect(status(page)).toHaveCount(0); // it has stopped sending

  // The first phone takes it back, and goes on.
  await page.getByRole('button', { name: 'Folosește acest telefon' }).click();
  await expect(page.getByText('Altă copie a luat locul')).toHaveCount(0);
  await expect(status(page)).toBeVisible();
  expect((await serverVersions(request, code)).status).toBe(200);
  await second.context().close();
});

test('turning the copy off, or deleting it, removes it from the server; the code stays', async ({ page, request }) => {
  await startWithJournal(page);
  const code = await createCode(page);
  await turnOnServerCopy(page);
  expect((await serverVersions(request, code)).status).toBe(200);

  await page.getByRole('button', { name: 'Oprește copia și șterge-o de pe server' }).click();
  await page.getByRole('dialog', { name: 'Oprești copia de pe server?' }).getByRole('button', { name: 'Da, oprește și șterge' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copia a fost ștearsă de pe server' })).toBeVisible();
  await expect(serverSwitch(page)).not.toBeChecked();
  expect((await serverVersions(request, code)).status).toBe(404);
  // The code and the encrypted file are still there.
  await expect(page.getByRole('button', { name: 'Salvează un fișier criptat' })).toBeVisible();
  await page.getByRole('button', { name: 'Arată codul' }).click();
  expect((await page.locator('.page[data-active] [data-testid="recovery-code"] span').allTextContents()).join('')).toBe(code);

  // On again: a fresh copy, and the old consent is asked for again.
  await turnOnServerCopy(page);
  expect((await serverVersions(request, code)).status).toBe(200);
});

test('a new code makes a new copy first and deletes the old one only after that', async ({ page, request }) => {
  await startWithJournal(page);
  const first = await createCode(page);
  await turnOnServerCopy(page);
  expect((await serverVersions(request, first)).status).toBe(200);

  await page.getByRole('button', { name: 'Generează alt cod' }).click();
  await page.getByRole('dialog', { name: 'Generezi alt cod?' }).getByRole('button', { name: 'Da, generează' }).click();
  await expect(page.getByText('Codul nu este confirmat încă')).toBeVisible();
  const second = (await page.locator('.page[data-active] [data-testid="recovery-code"] span').allTextContents()).join('');
  expect(second).not.toBe(first);

  // Under the new code the copy exists; the old one is gone.
  await expect.poll(async () => (await serverVersions(request, second)).status, { timeout: 15_000 }).toBe(200);
  await expect.poll(async () => (await serverVersions(request, first)).status, { timeout: 15_000 }).toBe(404);
});

test('"Delete all data" deletes the copy on the server; after a forgotten PIN it stays, to be restored with the code', async ({
  page,
  browser,
  request,
}) => {
  // A phone whose PIN is forgotten: the copy has to survive, because it is what the person comes back to.
  await startWithJournal(page);
  const kept = await createCode(page);
  await turnOnServerCopy(page);
  await otherSection(page, 'Confidențialitate și securitate');
  await page.getByRole('button', { name: 'Setează un PIN' }).click();
  const pin = page.getByRole('dialog', { name: 'Setează un PIN' });
  await pin.getByLabel('PIN nou (4–8 cifre)').fill('1234');
  await pin.getByLabel('Repetă PIN-ul nou').fill('1234');
  await pin.getByRole('button', { name: 'Setează un PIN' }).click();
  await page.getByRole('button', { name: 'Blochează acum' }).click();
  await page.getByRole('button', { name: 'Am uitat PIN-ul' }).click();
  await expect(page.getByRole('dialog', { name: 'PIN-ul nu poate fi recuperat' })).toContainText('rămâne acolo');
  await page.getByRole('button', { name: 'Șterge toate datele' }).click();
  await page.getByRole('button', { name: 'Da, șterge tot' }).click();
  await expect(page.getByRole('button', { name: 'Începe' })).toBeVisible();
  expect((await serverVersions(request, kept)).status).toBe(200);
  // …and the same phone, from scratch, gets everything back with the code.
  await openRestore(page, kept);
  await page.getByRole('button', { name: 'Caută pe server' }).click();
  await expect(page.getByTestId('restore-found')).toContainText(/zile notate/);

  // Deleting everything on purpose takes the copy with it.
  const deleter = await browser.newContext({
    locale: 'ro-RO',
    timezoneId: 'Europe/Bucharest',
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const dpage = await deleter.newPage();
  await startWithJournal(dpage);
  const gone = await createCode(dpage);
  await turnOnServerCopy(dpage);
  expect((await serverVersions(request, gone)).status).toBe(200);
  await otherSection(dpage, 'Confidențialitate și securitate');
  await expect(dpage.getByText(/Se șterge și copia criptată de pe server/)).toBeVisible();
  await dpage.getByRole('button', { name: 'Șterge toate datele' }).first().click();
  await dpage.getByRole('button', { name: 'Da, șterge tot' }).click();
  await expect(dpage.getByRole('button', { name: 'Începe' })).toBeVisible();
  await expect.poll(async () => (await serverVersions(request, gone)).status).toBe(404);
  await deleter.close();
});

test('a phone that restored a copy, and never turned the copy on, can still delete it', async ({ page, browser, request }) => {
  await startWithJournal(page);
  const code = await createCode(page);
  await turnOnServerCopy(page);

  const phone = await newPhone(browser);
  await openRestore(phone, code);
  await phone.getByRole('button', { name: 'Caută pe server' }).click();
  await phone.getByRole('button', { name: 'Restaurează', exact: true }).click();
  await acceptConsent(phone);
  await openSettings(phone, 'Copie de siguranță');
  await phone.getByRole('button', { name: 'Șterge copia de pe server' }).click();
  await phone.getByRole('dialog', { name: 'Ștergi copia de pe server?' }).getByRole('button', { name: 'Da, șterge' }).click();
  await expect.poll(async () => (await serverVersions(request, code)).status).toBe(404);
  await phone.context().close();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the backup screen passes automated WCAG checks (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await startWithJournal(page);
    await backupScreen(page);
    const check = async (state: string) => {
      const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const found = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target.join(' ')} ${n.failureSummary}`).join(' | ')}`);
      expect(found, state).toEqual([]);
    };
    await check('no code');
    await page.getByRole('button', { name: 'Creează codul de recuperare' }).click();
    await check('code shown, not confirmed');
    const groups = await page.locator('.page[data-active] [data-testid="recovery-code"] span').allTextContents();
    const ask = await page
      .locator('.page[data-active] .field-label')
      .filter({ hasText: /Scrie grupul \d din 6/ })
      .textContent();
    await page.getByLabel('Grupul de patru caractere').fill(groups[Number(/grupul (\d)/.exec(ask!)![1]) - 1]!);
    await page.getByRole('button', { name: 'Am notat codul' }).click();
    await check('confirmed');
    await serverSwitch(page).click();
    await check('consent sheet');
  });
}

test('the first screen offers the restore, and its panel passes automated WCAG checks', async ({ browser }) => {
  const phone = await newPhone(browser);
  await expect(phone.getByText('Ai folosit aplicația pe alt telefon?')).toBeVisible();
  await phone.getByRole('button', { name: 'Restaurează dintr-o copie' }).click();
  await expect(phone.getByRole('heading', { level: 1, name: 'Restaurează dintr-o copie' })).toBeVisible();
  const results = await new AxeBuilder({ page: phone as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  // The way back leads to the welcome screen.
  await phone.getByRole('button', { name: 'Înapoi' }).click();
  await expect(phone.getByRole('button', { name: 'Începe' })).toBeVisible();
  await phone.context().close();
});
