import { expect, test, type Page } from '@playwright/test';
import { dumpStorage, openSettings, startWithJournal, tab } from './helpers';

async function setPin(page: Page, pin: string): Promise<void> {
  await openSettings(page, 'Confidențialitate și securitate');
  await page.getByRole('button', { name: 'Setează un PIN' }).click();
  const dialog = page.getByRole('dialog', { name: 'Setează un PIN' });
  await dialog.getByLabel('PIN nou (4–8 cifre)').fill(pin);
  await dialog.getByLabel('Repetă PIN-ul nou').fill(pin);
  await dialog.getByRole('button', { name: 'Setează un PIN' }).click();
  await expect(page.getByText('PIN activ', { exact: true })).toBeVisible();
}

test('a PIN locks the app, protects the key and survives a restart', async ({ page }) => {
  await startWithJournal(page);
  await setPin(page, '271828');

  // With a PIN there is no device key left on disk: only the PIN can unwrap the data key.
  const disk = await dumpStorage(page);
  expect(disk).not.toContain('deviceKey');
  expect(disk).toContain('type=pin');

  await page.getByRole('button', { name: 'Blochează acum' }).click();
  await expect(page.getByRole('heading', { name: 'CycleCare este blocată' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);

  await page.getByLabel('Introdu PIN-ul').fill('000000');
  await page.getByRole('button', { name: 'Deblochează', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('PIN greșit. Mai ai 4 încercări');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'CycleCare este blocată' })).toBeVisible();
  await page.getByLabel('Introdu PIN-ul').fill('271828');
  await page.getByRole('button', { name: 'Deblochează', exact: true }).click();
  // Unlocking returns to the screen the person was on.
  await expect(page.getByRole('heading', { level: 1, name: 'Confidențialitate și securitate' })).toBeVisible();
  await tab(page, 'Azi');
  await expect(page.getByRole('img', { name: /Ziua 12 a ciclului/ })).toBeVisible();
});

test('PIN entry pauses after five wrong attempts', async ({ page }) => {
  await startWithJournal(page);
  await setPin(page, '1234');
  await page.getByRole('button', { name: 'Blochează acum' }).click();
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.getByLabel('Introdu PIN-ul').fill('9999');
    await page.getByRole('button', { name: 'Deblochează', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  }
  await expect(page.getByRole('alert')).toContainText('Prea multe încercări');
  await expect(page.getByLabel('Introdu PIN-ul')).toBeDisabled();
  await page.clock.fastForward('00:31');
  await expect(page.getByLabel('Introdu PIN-ul')).toBeEnabled();
  await page.getByLabel('Introdu PIN-ul').fill('1234');
  await page.getByRole('button', { name: 'Deblochează', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Navigare principală' })).toBeVisible();
});

test('the PIN can be changed and removed, with the current PIN', async ({ page }) => {
  await startWithJournal(page);
  await setPin(page, '1234');

  await page.getByRole('button', { name: 'Dezactivează PIN-ul' }).click();
  const dialog = page.getByRole('dialog', { name: 'Dezactivează PIN-ul' });
  await dialog.getByLabel('PIN-ul actual').fill('0000');
  await dialog.getByRole('button', { name: 'Dezactivează PIN-ul' }).click();
  await expect(dialog.getByRole('alert')).toContainText('PIN-ul actual nu este corect');
  await dialog.getByLabel('PIN-ul actual').fill('1234');
  await dialog.getByRole('button', { name: 'Dezactivează PIN-ul' }).click();
  await expect(page.getByText('Fără PIN', { exact: true })).toBeVisible();

  await page.reload(); // opens without asking for anything
  await expect(page.getByText('Fără PIN', { exact: true })).toBeVisible();
  await tab(page, 'Azi');
  await expect(page.getByRole('img', { name: /Ziua 12 a ciclului/ })).toBeVisible();
});

test('biometric unlock works through a platform authenticator (WebAuthn PRF)', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      hasPrf: true,
      automaticPresenceSimulation: true,
    },
  });

  await startWithJournal(page);
  await setPin(page, '1234');
  await page.getByRole('switch', { name: 'Deblocare cu amprenta sau fața' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Deblocarea biometrică este activă.' })).toBeVisible();
  expect(await dumpStorage(page)).toContain('type=biometric');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'CycleCare este blocată' })).toBeVisible();
  await page.getByRole('button', { name: 'Deblochează cu amprenta sau fața' }).click();
  await expect(page.getByRole('switch', { name: 'Deblocare cu amprenta sau fața' })).toBeChecked();
});

test('"delete all data" removes everything and goes back to the first screen', async ({ page }) => {
  await startWithJournal(page);
  await setPin(page, '1234');
  await page.getByRole('button', { name: 'Șterge toate datele' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ștergi definitiv toate datele?' });
  await dialog.getByRole('button', { name: 'Da, șterge tot' }).click();
  await expect(page.getByRole('button', { name: 'Începe' })).toBeVisible();
  expect(await dumpStorage(page)).toBe('');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Începe' })).toBeVisible();
});

test('a forgotten PIN can only be answered by wiping the data', async ({ page }) => {
  await startWithJournal(page);
  await setPin(page, '1234');
  await page.getByRole('button', { name: 'Blochează acum' }).click();
  await page.getByRole('button', { name: 'Am uitat PIN-ul' }).click();
  await expect(page.getByRole('dialog', { name: 'PIN-ul nu poate fi recuperat' })).toContainText('nu există nicio copie');
  await page.getByRole('button', { name: 'Șterge toate datele' }).click();
  await page.getByRole('button', { name: 'Da, șterge tot' }).click();
  await expect(page.getByRole('button', { name: 'Începe' })).toBeVisible();
});

test('withdrawing consent deletes the journal', async ({ page }) => {
  await startWithJournal(page);
  await openSettings(page, 'Confidențialitate și securitate');
  await expect(page.getByText(/Acord pentru prelucrarea datelor privind sănătatea, dat pe 15 noiembrie 2026/)).toBeVisible();
  await page.getByRole('button', { name: 'Retrage acordul și șterge datele' }).click();
  await page.getByRole('button', { name: 'Da, șterge tot' }).click();
  await expect(page.getByRole('button', { name: 'Începe' })).toBeVisible();
  expect(await dumpStorage(page)).toBe('');
});
