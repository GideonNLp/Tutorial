// Renders public/icon.svg to the PNG sizes the web manifest and iOS need.
// Uses the Chromium that ships with Playwright, so there is no image library to install.
//
//   icon-192 / icon-512                    purpose "any": the artwork with rounded corners on a transparent background
//   icon-maskable-192 / icon-maskable-512  purpose "maskable": full-bleed; the launcher cuts its own shape,
//                                          and the ring stays inside the central safe zone (80 % of the width)
//   apple-touch-icon (180)                 full-bleed and opaque: iOS rounds the corners itself
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../public/', import.meta.url));
const svg = readFileSync(dir + 'icon.svg', 'utf8');
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
for (const [name, size, rounded] of [
  ['icon-192.png', 192, true],
  ['icon-512.png', 512, true],
  ['icon-maskable-192.png', 192, false],
  ['icon-maskable-512.png', 512, false],
  ['apple-touch-icon.png', 180, false],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const radius = rounded ? `border-radius:${Math.round(size * 0.22)}px;` : '';
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px;${radius}}</style>${svg}`,
  );
  await page.screenshot({ path: dir + name, omitBackground: true });
  await page.close();
  console.log('wrote', name);
}
await browser.close();
