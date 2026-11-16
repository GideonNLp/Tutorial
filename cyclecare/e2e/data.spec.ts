import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openSettings, startEmpty, startWithDemoData, tab } from './helpers';

test('the doctor report is generated on the device as a real PDF', async ({ page }) => {
  await startWithDemoData(page);
  await tab(page, 'Statistici');
  await page.getByRole('button', { name: 'Creează raportul PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'Raport pentru medic' });
  await dialog.getByRole('radio', { name: 'Ultimele 12 luni' }).check();
  await dialog.getByRole('checkbox', { name: /Include notele din jurnal/ }).check();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Generează PDF' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('CycleCare-raport-2026-11-15.pdf');
  const bytes = readFileSync(await file.path());
  expect(bytes.subarray(0, 8).toString('latin1')).toBe('%PDF-1.7');
  expect(bytes.length).toBeGreaterThan(50_000);
  expect(bytes.toString('latin1')).toContain('/Lang (ro-RO)');
  await expect(page.getByRole('status').filter({ hasText: 'Raportul a fost salvat.' })).toBeVisible();
});

test('statistics show charts with a table alternative', async ({ page }) => {
  await startWithDemoData(page);
  await tab(page, 'Statistici');
  await expect(page.getByText('28,0 zile')).toBeVisible(); // average cycle
  await expect(page.getByText('26–30 zile')).toBeVisible(); // variation
  await expect(page.getByRole('img', { name: /Grafic cu durata ultimelor 7 cicluri\. Media: 27,9 zile\./ })).toBeVisible();
  await page.getByText('Vezi datele ca tabel').first().click();
  const table = page.getByRole('table').filter({ hasText: 'Durata ciclului' });
  await expect(table.getByRole('row', { name: /7 octombrie 2026 28 5/ })).toBeVisible();
  await expect(table.getByRole('row', { name: /4 noiembrie 2026 în curs, ziua 12/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Crampe/ }).first()).toBeVisible();

  // Arrow keys walk the bars and show the same values as hovering.
  const chart = page.getByRole('img', { name: /Grafic cu durata/ });
  await chart.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.chart-tip')).toContainText('27 de zile');
});

test('an empty journal explains what will appear', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Statistici');
  await expect(page.getByRole('heading', { name: 'Încă nu sunt destule date' })).toBeVisible();
});

test('the journal can be exported as JSON and restored on another device', async ({ page, browser }) => {
  await startWithDemoData(page);
  await openSettings(page, 'Datele mele');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportă datele (JSON)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('CycleCare-date-2026-11-15.json');
  const path = await file.path();
  const backup = JSON.parse(readFileSync(path, 'utf8'));
  expect(backup).toMatchObject({ app: 'CycleCare', format: 1 });
  expect(Object.keys(backup.data.logs).length).toBeGreaterThan(150);

  const other = await browser.newContext({ locale: 'ro-RO', timezoneId: 'Europe/Bucharest' });
  const second = await other.newPage();
  await startEmpty(second);
  await openSettings(second, 'Datele mele');
  await second.getByLabel('Restaurează dintr-un fișier').setInputFiles(path);
  const dialog = second.getByRole('dialog', { name: 'Înlocuiești datele de pe acest dispozitiv?' });
  await expect(dialog).toContainText(`${Object.keys(backup.data.logs).length} de zile notate`);
  await dialog.getByRole('button', { name: 'Înlocuiește' }).click();
  await second.getByRole('button', { name: 'Înapoi' }).click();
  await second.getByRole('button', { name: 'Înapoi' }).click();
  await expect(second.getByRole('img', { name: /Ziua 12 a ciclului/ })).toBeVisible();
  await other.close();
});

test('a file that is not a CycleCare export is refused', async ({ page }) => {
  await startEmpty(page);
  await openSettings(page, 'Datele mele');
  await page
    .getByLabel('Restaurează dintr-un fișier')
    .setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.getByRole('alert')).toContainText('nu este un export CycleCare');
});

test('basal temperatures are imported from a wearable CSV file', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Jurnal');
  await page.getByLabel('Temperatura, în °C').fill('36,40');
  await page.getByLabel('Temperatura, în °C').blur();
  await page.getByRole('button', { name: 'Importă din fișier' }).click();
  const dialog = page.getByRole('dialog', { name: 'Importă temperaturi' });
  const csv = 'Data;Temperatura (°C)\n13.11.2026;36,41\n14.11.2026;36,48\n15.11.2026;36,90\n16.11.2026;36,50\nxx;1\n';
  await dialog.getByLabel('Alege fișierul').setInputFiles({ name: 'inel.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(dialog.getByText('3 valori între 13 nov. și 15 nov.')).toBeVisible();
  await expect(dialog.getByText('2 rânduri nu au putut fi folosite.')).toBeVisible(); // tomorrow + the broken row
  await expect(dialog.getByLabel('Numele dispozitivului')).toHaveValue('inel');
  // Today's hand-typed value is kept unless the person asks otherwise.
  await expect(dialog.getByText(/1 zi are deja o temperatură notată/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Importă', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Am importat 2 temperaturi.' })).toBeVisible();
  await expect(page.getByLabel('Temperatura, în °C')).toHaveValue('36,40');

  await page.getByRole('button', { name: /sâmbătă, 14 noiembrie/ }).click();
  await expect(page.getByLabel('Temperatura, în °C')).toHaveValue('36,48');
  await expect(page.getByText('Importată din inel')).toBeVisible();

  await openSettings(page, 'Datele mele');
  await expect(page.getByText(/inel: 2 valori, importate pe 15 noiembrie 2026/)).toBeVisible();
});

test('reminders are configurable and fire while the app is open', async ({ page }) => {
  await startWithDemoData(page);
  await openSettings(page, 'Memento-uri');
  await page.getByRole('button', { name: 'Adaugă pilula' }).click();
  await page.getByLabel('Ora').fill('09:02');
  await page.getByRole('switch', { name: 'Începutul menstruației estimate' }).check();
  await page.getByLabel('Cu câte zile înainte').selectOption('3');
  await expect(page.getByRole('switch', { name: 'Text discret în notificări' })).toBeChecked();

  await page.getByRole('button', { name: 'Înapoi' }).click();
  await page.getByRole('button', { name: 'Înapoi' }).click();
  const today = page.getByRole('list').filter({ hasText: 'E timpul pentru: Pilula' });
  await expect(today).toContainText('09:02');

  await page.clock.fastForward('03:00');
  await expect(page.getByRole('status').filter({ hasText: 'E timpul pentru: Pilula' })).toBeVisible();
});

test('fertility estimates can be switched off everywhere', async ({ page }) => {
  await startWithDemoData(page);
  await expect(page.getByRole('heading', { name: 'Fertilitate' })).toBeVisible();
  await openSettings(page, 'Ciclul meu');
  await page.getByRole('switch', { name: 'Arată fazele ciclului și estimările de fertilitate' }).uncheck();
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await expect(page.getByRole('heading', { name: 'Fertilitate' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Următoarea menstruație' })).toBeVisible();
  await tab(page, 'Calendar');
  await expect(page.getByRole('button', { name: /marți, 17 noiembrie 2026/ })).not.toHaveAccessibleName(/ovulație|fertilă|foliculară/);
});
