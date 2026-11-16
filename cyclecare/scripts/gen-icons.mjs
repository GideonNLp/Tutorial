// Renders public/icon.svg to the PNG sizes the web manifest and iOS need.
// Uses the Chromium that ships with Playwright, so there is no image library to install.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../public/', import.meta.url));
const svg = readFileSync(dir + 'icon.svg', 'utf8');
const browser = await chromium.launch();
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: dir + name });
  await page.close();
  console.log('wrote', name);
}
await browser.close();
