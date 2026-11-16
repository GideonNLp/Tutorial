/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content-Security-Policy for the production PWA build.
 * `connect-src 'self'` means the app is technically unable to send data to any other server,
 * which is the guarantee the privacy texts rely on. (Not applied in dev: HMR needs inline scripts + websockets.)
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspMeta(): Plugin {
  return {
    name: 'cyclecare-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<!--csp-->', `<meta http-equiv="Content-Security-Policy" content="${CSP}">`);
    },
  };
}

/**
 * Writes the list of built files into the service worker, so the installed app can start
 * offline right after its first visit. The cache name changes with the file list, which
 * retires old caches when a new version is deployed.
 */
function precacheList(): Plugin {
  let outDir = 'dist';
  return {
    name: 'cyclecare-precache-list',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const swPath = join(outDir, 'sw.js');
      let sw: string;
      try {
        sw = readFileSync(swPath, 'utf8');
      } catch {
        return; // build without a service worker (single-file preview)
      }
      const assets = readdirSync(join(outDir, 'assets'))
        .sort()
        .map((name) => `./assets/${name}`);
      const files = ['./', './manifest.webmanifest', './icon.svg', './icon-192.png', ...assets];
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 10);
      writeFileSync(swPath, sw.replace("'__VERSION__'", JSON.stringify(version)).replace('/*__PRECACHE__*/ []', JSON.stringify(files)));
    },
  };
}

export default defineConfig(({ mode }) => {
  // `--mode single` produces one self-contained HTML file (fonts + JS + CSS inlined),
  // used for the shareable prototype page. See scripts/build-single.mjs.
  const single = mode === 'single';
  return {
    base: './',
    plugins: [react(), ...(single ? [] : [cspMeta(), precacheList()])],
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
      __SINGLE_FILE__: JSON.stringify(single),
    },
    build: {
      target: 'es2022',
      outDir: single ? 'dist-single' : 'dist',
      cssCodeSplit: false,
      assetsInlineLimit: single ? 100_000_000 : 2048,
      chunkSizeWarningLimit: 900,
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
