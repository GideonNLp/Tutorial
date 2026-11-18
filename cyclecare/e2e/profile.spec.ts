import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAMPLE_BACKUP, dumpStorage, openSettings, startEmpty, tab } from './helpers';

/** A real picture to upload: a 600 × 400 screenshot of a coloured block (a JPEG from a phone works the same way). */
async function picture(page: Page): Promise<Buffer> {
  await page.evaluate(() => {
    const block = document.createElement('div');
    block.id = 'test-picture';
    block.style.cssText =
      'position:fixed;inset:0 auto auto 0;width:600px;height:400px;z-index:9999;background:linear-gradient(90deg,#d93355 50%,#22a68b 50%)';
    document.body.append(block);
  });
  const shot = await page.locator('#test-picture').screenshot({ type: 'png' });
  await page.evaluate(() => document.getElementById('test-picture')?.remove());
  return shot;
}

const avatar = (page: Page) => page.locator('.page[data-active] .avatar-btn .avatar');

async function openProfile(page: Page) {
  await page.getByRole('button', { name: 'Profil și setări', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
}

test('the round picture sits in the top-right corner of every tab and opens the profile', async ({ page }) => {
  await startEmpty(page);
  for (const name of ['Azi', 'Calendar', 'Jurnal', 'Sfaturi', 'Statistici'] as const) {
    await tab(page, name);
    const button = page.locator('.page[data-active]').getByRole('button', { name: 'Profil și setări', exact: true });
    const box = (await button.boundingBox())!;
    const viewport = page.viewportSize()!;
    // Small, round, in the corner, at the top; it is the only button there (settings are on the profile).
    expect(box.width).toBeLessThanOrEqual(48);
    expect(Math.abs(box.width - box.height)).toBeLessThan(1);
    expect(viewport.width - (box.x + box.width)).toBeLessThanOrEqual(17);
    expect(box.y).toBeLessThan(40);
    await expect(page.locator('.page[data-active] .navbar-actions button')).toHaveCount(1);
    await expect(page.locator('.page[data-active]').getByRole('button', { name: 'Setări', exact: true })).toHaveCount(0);
    expect(await button.locator('.avatar').evaluate((el) => getComputedStyle(el).borderRadius)).toBe('50%');
  }
  // Without a name: a neutral figure, not initials.
  await expect(avatar(page).locator('svg')).toHaveCount(1);
  await openProfile(page);
  await expect(page.getByText('Fără nume')).toBeVisible();
  // Back where it was opened from.
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Statistici' })).toBeVisible();
});

test('the name can be changed and removed, with checks next to the field', async ({ page }) => {
  await startEmpty(page);
  await openProfile(page);
  const field = page.getByLabel('Nume sau poreclă');
  const save = page.getByRole('button', { name: 'Salvează' });
  await expect(save).toBeDisabled(); // nothing changed yet

  await field.fill('!!!');
  await save.click();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAccessibleDescription(/cel puțin o literă/);

  await field.fill('ioana');
  await field.press('Enter');
  await expect(page.locator('.toast').filter({ hasText: 'Numele a fost salvat.' })).toBeVisible();
  await expect(page.locator('.profile-name')).toHaveText('ioana');
  await expect(save).toBeDisabled();

  // The corner picture follows, on every tab.
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await expect(avatar(page)).toHaveText('I');
  await tab(page, 'Jurnal');
  await expect(avatar(page)).toHaveText('I');

  // It is kept encrypted: survives a reload, never on disk in clear.
  await page.waitForTimeout(600);
  expect(await dumpStorage(page)).not.toContain('ioana');
  await page.reload();
  await expect(avatar(page)).toHaveText('I');

  await openProfile(page);
  await field.fill('');
  await save.click();
  await expect(page.locator('.toast').filter({ hasText: 'Numele a fost șters.' })).toBeVisible();
  await expect(page.locator('.profile-name')).toHaveText('Fără nume');
});

test('a profile picture can be added, replaced and removed (with Undo)', async ({ page }) => {
  await startEmpty(page);
  await openProfile(page);
  const image = await picture(page);
  await page.getByLabel('Adaugă o poză').setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('.toast').filter({ hasText: 'Poza de profil a fost schimbată.' })).toBeVisible();

  // Stored small and square, as a JPEG.
  const large = page.locator('.profile-head img.avatar');
  await expect(large).toBeVisible();
  const src = (await large.getAttribute('src'))!;
  expect(src).toMatch(/^data:image\/jpeg;base64,/);
  expect(src.length).toBeLessThan(60_000);
  expect(await large.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([256, 256]);
  // Cropped from the middle of a wide picture: both halves of it are still there.
  const [left, right] = await large.evaluate((img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.drawImage(img, 0, 0);
    return [context.getImageData(20, 128, 1, 1).data[0], context.getImageData(236, 128, 1, 1).data[0]];
  });
  expect(left).toBeGreaterThan(180); // red half
  expect(right).toBeLessThan(80); // green half

  await page.getByRole('button', { name: 'Înapoi' }).click();
  await expect(page.locator('.page[data-active] .avatar-btn img.avatar')).toHaveAttribute('src', src);

  await openProfile(page);
  await page.getByRole('button', { name: 'Elimină poza' }).click();
  await expect(large).toHaveCount(0);
  await page.locator('.toast').filter({ hasText: 'Poza a fost eliminată.' }).getByRole('button', { name: 'Anulează' }).click();
  await expect(large).toHaveAttribute('src', src);
});

test('a file that is not a picture is explained next to the button', async ({ page }) => {
  await startEmpty(page);
  await openProfile(page);
  await page.getByLabel('Adaugă o poză').setInputFiles({ name: 'notite.png', mimeType: 'image/png', buffer: Buffer.from('nu este o imagine') });
  await expect(page.getByRole('alert')).toContainText('nu este o imagine pe care o putem deschide');
  await expect(page.locator('.profile-head img.avatar')).toHaveCount(0);
});

test('the name and picture travel with the backup, and an older backup keeps them', async ({ page }) => {
  await startEmpty(page);
  await openProfile(page);
  await page.getByLabel('Nume sau poreclă').fill('Dana');
  await page.getByRole('button', { name: 'Salvează' }).click();
  await page.getByRole('button', { name: 'Înapoi' }).click();

  // A backup made before profiles existed: the name on this device stays.
  await openSettings(page, 'Datele mele');
  await page
    .getByLabel('Restaurează dintr-un fișier')
    .setInputFiles({ name: 'vechi.json', mimeType: 'application/json', buffer: Buffer.from(SAMPLE_BACKUP) });
  await page.getByRole('dialog').getByRole('button', { name: 'Înlocuiește' }).click();
  await expect(page.locator('.toast').filter({ hasText: 'Datele au fost restaurate.' })).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportă datele (JSON)' }).click();
  const file = await download;
  const backup = JSON.parse(await (await import('node:fs/promises')).readFile(await file.path(), 'utf8'));
  expect(backup.data.user).toEqual({ nickname: 'Dana' });
  expect(Object.keys(backup.data.logs).length).toBeGreaterThan(150);
});

test('the lock screen shows nothing personal', async ({ page }) => {
  await startEmpty(page);
  await openProfile(page);
  await page.getByLabel('Nume sau poreclă').fill('Dana');
  await page.getByRole('button', { name: 'Salvează' }).click();
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await openSettings(page, 'Confidențialitate și securitate');
  await page.getByRole('button', { name: 'Setează un PIN' }).click();
  const dialog = page.getByRole('dialog', { name: 'Setează un PIN' });
  await dialog.getByLabel('PIN nou (4–8 cifre)').fill('1357');
  await dialog.getByLabel('Repetă PIN-ul nou').fill('1357');
  await dialog.getByRole('button', { name: 'Setează un PIN' }).click();
  await expect(page.getByText('PIN activ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Blochează acum' }).click();
  await expect(page.getByRole('heading', { name: 'CycleCare este blocată' })).toBeVisible();
  await expect(page.getByText('Dana')).toHaveCount(0);
  await expect(page.locator('.avatar')).toHaveCount(0);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the profile passes automated WCAG checks (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await startEmpty(page);
    await openProfile(page);
    await page.getByLabel('Nume sau poreclă').fill('Ana');
    await page.getByRole('button', { name: 'Salvează' }).click();
    const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    await page.getByRole('button', { name: 'Înapoi' }).click();
    const home = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(home.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}
