import { cpSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { expect, test } from '@playwright/test';
import { openApp, startEmpty } from './helpers';

test('the web manifest makes the app installable', async ({ page, request }) => {
  await openApp(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(href!, page.url()).href;
  const manifest = await (await request.get(manifestUrl)).json();
  expect(manifest).toMatchObject({ name: 'CycleCare', short_name: 'CycleCare', display: 'standalone', start_url: './', scope: './' });
  expect(manifest.theme_color).toMatch(/^#[0-9A-F]{6}$/i);
  expect(manifest.background_color).toMatch(/^#[0-9A-F]{6}$/i);

  const png = manifest.icons.filter((icon: { type: string }) => icon.type === 'image/png');
  for (const [size, purpose] of [
    [192, 'any'],
    [512, 'any'],
    [192, 'maskable'],
    [512, 'maskable'],
  ] as const) {
    const icon = png.find((i: { sizes: string; purpose: string }) => i.sizes === `${size}x${size}` && i.purpose === purpose);
    expect(icon, `${size} ${purpose}`).toBeTruthy();
    const response = await request.get(new URL(icon.src, manifestUrl).href);
    expect(response.status()).toBe(200);
    const bytes = await response.body();
    expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBe(size); // width in the IHDR chunk
  }

  // Chromium's own installability check: a manifest, icons and a service worker that controls the page.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  // Test browsers run in a private profile, which is the one reason Chromium itself gives here.
  expect(installabilityErrors.map((e) => e.errorId).filter((id) => id !== 'in-incognito')).toEqual([]);
});

test('production pages keep search engines out by default and ship host files', async ({ page, request }) => {
  await openApp(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const base = page.url();
  expect(await (await request.get(new URL('robots.txt', base).href)).text()).toContain('Disallow: /');
  const headers = await (await request.get(new URL('_headers', base).href)).text();
  expect(headers).toContain("frame-ancestors 'none'");
  expect(headers).toContain('Strict-Transport-Security');
});

test('an address that does not exist gets a 404 page that leads back to the app', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Pagina nu a fost găsită' })).toBeVisible();
  await page.getByRole('link', { name: 'Deschide CycleCare' }).click();
  await expect(page.getByRole('button', { name: 'Începe' })).toBeVisible();
});

test('an unknown route inside the app falls back to the home screen', async ({ page }) => {
  await startEmpty(page);
  await page.goto('/#nu-exista');
  await expect(page.getByRole('heading', { level: 1, name: 'Azi' })).toBeVisible();
});

// ---- Updates: a private copy of the build, served by a tiny static server we can change mid-test ----

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function serve(dir: string): Promise<Server> {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
    let file = join(dir, path);
    try {
      if (statSync(file).isDirectory()) file = join(file, 'index.html');
      const body = readFileSync(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync(join(dir, '404.html')));
    }
  });
  return new Promise((resolve) => server.listen(0, 'localhost', () => resolve(server)));
}

test('a new version is downloaded in the background and applied when the person accepts', async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), 'cyclecare-update-'));
  cpSync('dist', dir, { recursive: true });
  const server = await serve(dir);
  const origin = `http://localhost:${(server.address() as AddressInfo).port}`;
  try {
    await page.clock.install({ time: new Date('2026-11-15T09:00:00+02:00') });
    await page.goto(origin);
    await expect(page.getByRole('button', { name: 'Începe' })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    // The first install is silent.
    await expect(page.getByText('Este disponibilă o versiune nouă.')).toHaveCount(0);

    // "Deploy" a new version: the page title changes, and so does the service worker's cache name.
    writeFileSync(
      join(dir, 'index.html'),
      readFileSync(join(dir, 'index.html'), 'utf8').replace('<title>CycleCare</title>', '<title>CycleCare v2</title>'),
    );
    const sw = readFileSync(join(dir, 'sw.js'), 'utf8');
    writeFileSync(join(dir, 'sw.js'), sw.replace(/const CACHE = 'cyclecare-' \+ "[0-9a-f]+"/, `const CACHE = 'cyclecare-' + "next000001"`));
    expect(readFileSync(join(dir, 'sw.js'), 'utf8')).not.toBe(sw);

    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.update()));
    const offer = page.getByRole('status').filter({ hasText: 'Este disponibilă o versiune nouă.' });
    await expect(offer).toBeVisible();
    // Until accepted, the open page keeps running the version it started with.
    expect(await page.title()).toBe('CycleCare');

    await offer.getByRole('button', { name: 'Actualizează' }).click();
    await expect.poll(() => page.title()).toBe('CycleCare v2');
    await expect(page.getByRole('button', { name: 'Începe' })).toBeVisible();
    expect(await page.evaluate(() => caches.keys())).toEqual(['cyclecare-next000001']);
  } finally {
    server.close();
  }
});
