import { expect, type Page } from '@playwright/test';
import { emptyAppData } from '../src/domain/types';
import { exportBackup } from '../src/storage/backup';
import { sampleJournal } from '../tests/fixtures/sampleJournal';

/** Sunday 15 November 2026, 09:00 in Bucharest. Every test starts from this moment. */
export const NOW = new Date('2026-11-15T09:00:00+02:00');

export async function openApp(page: Page): Promise<void> {
  await page.clock.install({ time: NOW });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

export async function acceptConsent(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Datele tale rămân la tine' })).toBeVisible();
  await page.getByRole('checkbox', { name: /Sunt de acord ca CycleCare să prelucreze/ }).check();
  await page.getByRole('checkbox', { name: /Am cel puțin 16 ani/ }).check();
  await page.getByRole('button', { name: 'Sunt de acord și continui' }).click();
}

/** Onboards skipping every optional question: an empty journal. */
export async function startEmpty(page: Page): Promise<void> {
  await openApp(page);
  await page.getByRole('button', { name: 'Începe' }).click();
  await acceptConsent(page);
  await page.getByRole('button', { name: 'Sari peste' }).click(); // no name
  await page.getByRole('button', { name: 'Nu-mi amintesc' }).click();
  await page.getByRole('button', { name: 'Nu știu' }).click();
  await page.getByRole('button', { name: 'Nu știu' }).click();
  await page.getByRole('button', { name: 'Sari peste' }).click();
  await page.getByRole('button', { name: 'Deschide CycleCare' }).click();
  await expect(page.getByRole('navigation', { name: 'Navigare principală' })).toBeVisible();
}

/** A backup file with seven completed cycles and day 12 of the eighth, as the app itself would export it. */
export const SAMPLE_BACKUP = (() => {
  const { logs, profile } = sampleJournal('2026-11-15', NOW.toISOString());
  return exportBackup({ ...emptyAppData(), logs, profile }, NOW);
})();

/** Starts with a filled journal: onboards, then restores the sample backup the way a person would. */
export async function startWithJournal(page: Page): Promise<void> {
  await startEmpty(page);
  await openSettings(page, 'Datele mele');
  await page
    .getByLabel('Restaurează dintr-un fișier')
    .setInputFiles({ name: 'jurnal.json', mimeType: 'application/json', buffer: Buffer.from(SAMPLE_BACKUP) });
  await page.getByRole('dialog').getByRole('button', { name: 'Înlocuiește' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Datele au fost restaurate.' })).toBeVisible();
  await tab(page, 'Azi');
  await expect(page.getByRole('img', { name: /Ziua 12 a ciclului/ })).toBeVisible();
}

/** Days with entries open as a compact summary: this opens one section of it in full (no-op when already open). */
export async function editJournalSection(page: Page, title: string): Promise<void> {
  const button = page.locator('.page[data-active]').getByRole('button', { name: new RegExp(`^(Editează|Adaugă): ${title}$`) });
  if (await button.count()) await button.click();
}

export async function tab(page: Page, name: 'Azi' | 'Calendar' | 'Jurnal' | 'Sfaturi' | 'Statistici'): Promise<void> {
  // A bar folded by scrolling shows only the current tab: like a person, touch it first to open the bar.
  const folded = page.locator('.tabbar[data-folded]');
  if ((await folded.count()) > 0) {
    await page.locator('.tab[aria-current="page"]').click();
    await expect(folded).toHaveCount(0);
  }
  await page.getByRole('navigation', { name: 'Navigare principală' }).getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

export async function openSettings(page: Page, section?: string): Promise<void> {
  await page.getByRole('button', { name: 'Profil și setări', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
  if (section) {
    await page.getByRole('link', { name: new RegExp(section) }).click();
    await expect(page.getByRole('heading', { level: 1, name: section })).toBeVisible();
  }
}

/** Everything the app wrote to IndexedDB, as one latin-1 string, to look for plaintext. */
export async function dumpStorage(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('cyclecare');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!db.objectStoreNames.contains('kv')) return '';
    const store = db.transaction('kv', 'readonly').objectStore('kv');
    const all = await new Promise<Array<[IDBValidKey, unknown]>>((resolve, reject) => {
      const out: Array<[IDBValidKey, unknown]> = [];
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        if (cursor.result) {
          out.push([cursor.result.key, cursor.result.value]);
          cursor.result.continue();
        } else resolve(out);
      };
      cursor.onerror = () => reject(cursor.error);
    });
    const text = (value: unknown): string => {
      if (value instanceof Uint8Array) return new TextDecoder('latin1').decode(value);
      if (value instanceof CryptoKey) return `[CryptoKey extractable=${value.extractable}]`;
      if (Array.isArray(value)) return value.map(text).join(' ');
      if (value && typeof value === 'object')
        return Object.entries(value)
          .map(([k, v]) => `${k}=${text(v)}`)
          .join(' ');
      return String(value);
    };
    return all.map(([key, value]) => `${String(key)}: ${text(value)}`).join('\n');
  });
}
