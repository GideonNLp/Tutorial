/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleRelay, memoryRelayStore } from './server/relay.ts';

/**
 * Content-Security-Policy for the production PWA build.
 * `connect-src 'self'` means the app is technically unable to send data to any other server,
 * which is the guarantee the privacy texts rely on. (Not applied in dev: HMR needs inline scripts + websockets.)
 * With `default-src 'self'` on an HTTPS origin nothing can be loaded over plain HTTP either, so there is no mixed content.
 */
function csp(site: SiteConfig): string {
  // The partner relay normally lives on the same origin (/api/partner). Only if it is configured on
  // another host does that one origin join `connect-src`.
  const relayOrigin = /^https:\/\//.test(site.partnerSyncUrl) ? new URL(site.partnerSyncUrl).origin : '';
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${relayOrigin ? ` ${relayOrigin}` : ''}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

/** Colours repeated outside the stylesheet (manifest, 404 page). They mirror `bg` / `ink` in src/styles/tokens.json. */
const COLORS = { lightBg: '#F6F5FB', lightInk: '#1F1B3A', darkBg: '#14121E', darkInk: '#F1EEF8' };

interface SiteConfig {
  appName: string;
  description: string;
  /** Absolute address of the published app, with a trailing slash, when known. */
  publicUrl: string | undefined;
  allowIndexing: boolean;
  /**
   * Where the partner relay answers: a same-origin path (`/api/partner`) or an https URL.
   * Empty: Partner mode is not offered (for example on GitHub Pages, which cannot run the relay).
   */
  partnerSyncUrl: string;
}

function siteConfig(mode: string): SiteConfig {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const appName = env.VITE_APP_NAME?.trim() || 'CycleCare';
  const rawUrl = env.VITE_PUBLIC_URL?.trim();
  return {
    appName,
    description: `${appName} – urmărirea ciclului menstrual, cu datele păstrate criptat pe dispozitivul tău.`,
    publicUrl: rawUrl ? rawUrl.replace(/\/*$/, '/') : undefined,
    allowIndexing: env.VITE_ALLOW_INDEXING === 'true',
    // Netlify builds get the bundled function by default (NETLIFY=true is set by Netlify's build image).
    partnerSyncUrl: (env.VITE_PARTNER_SYNC_URL ?? (process.env.NETLIFY === 'true' ? '/api/partner' : '')).trim().replace(/\/+$/, ''),
  };
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fills index.html: name, description, search-engine policy and, in production, the Content-Security-Policy. */
function htmlMeta(site: SiteConfig, production: boolean): Plugin {
  return {
    name: 'cyclecare-html-meta',
    transformIndexHtml(html) {
      const head = [
        production ? `<meta http-equiv="Content-Security-Policy" content="${csp(site)}">` : '',
        site.allowIndexing ? '' : '<meta name="robots" content="noindex, nofollow">',
        site.allowIndexing && site.publicUrl ? `<link rel="canonical" href="${escapeHtml(site.publicUrl)}">` : '',
      ]
        .filter(Boolean)
        .join('\n    ');
      return html
        .replace('<!--head-->', head)
        .replaceAll('%APP_NAME%', escapeHtml(site.appName))
        .replaceAll('%APP_DESCRIPTION%', escapeHtml(site.description));
    },
  };
}

function manifest(site: SiteConfig): string {
  return JSON.stringify(
    {
      name: site.appName,
      short_name: site.appName,
      description: site.description.replace(`${site.appName} – `, '').replace(/^./, (c) => c.toUpperCase()),
      id: './',
      lang: 'ro',
      dir: 'ltr',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'portrait',
      background_color: COLORS.lightBg,
      theme_color: COLORS.lightBg,
      categories: ['health', 'lifestyle'],
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ],
    },
    null,
    2,
  );
}

/**
 * The page a static host shows for an address that does not exist. Self-contained (no script, no
 * external file), because it can be served from any path. The link goes to the app's address when
 * it is configured, otherwise to the folder the missing page was asked from.
 */
function notFoundPage(site: SiteConfig): string {
  const home = site.publicUrl ? new URL(site.publicUrl).pathname : './';
  const name = escapeHtml(site.appName);
  return `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
    <meta name="robots" content="noindex">
    <meta name="referrer" content="no-referrer">
    <meta name="theme-color" content="${COLORS.lightBg}" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="${COLORS.darkBg}" media="(prefers-color-scheme: dark)">
    <title>Pagina nu a fost găsită – ${name}</title>
    <style>
      :root { color-scheme: light dark; --bg: ${COLORS.lightBg}; --ink: ${COLORS.lightInk}; --on-ink: #FFFFFF; }
      @media (prefers-color-scheme: dark) { :root { --bg: ${COLORS.darkBg}; --ink: ${COLORS.darkInk}; --on-ink: ${COLORS.darkBg}; } }
      * { box-sizing: border-box; }
      html, body { height: 100%; margin: 0; }
      body {
        display: grid; place-items: center; padding: 24px;
        background: var(--bg); color: var(--ink);
        font: 1.0625rem/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      main { max-width: 26rem; text-align: center; }
      .code { margin: 0; font-size: 0.9375rem; font-weight: 650; letter-spacing: 0.08em; opacity: 0.7; }
      h1 { margin: 0.5rem 0 0.75rem; font-size: 1.875rem; line-height: 1.15; letter-spacing: -0.01em; }
      p { margin: 0 0 1.5rem; }
      a {
        display: inline-flex; align-items: center; justify-content: center; min-height: 3rem; padding: 0.5rem 1.5rem;
        border-radius: 999px; background: var(--ink); color: var(--on-ink); font-weight: 650; text-decoration: none;
      }
      a:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
    </style>
  </head>
  <body>
    <main>
      <p class="code">Eroare 404</p>
      <h1>Pagina nu a fost găsită</h1>
      <p>Adresa nu există sau a fost mutată. Datele tale din ${name} nu sunt afectate: ele rămân pe dispozitivul tău.</p>
      <a href="${escapeHtml(home)}">Deschide ${name}</a>
    </main>
  </body>
</html>
`;
}

/**
 * Response headers for hosts that read a `_headers` file (Netlify, Cloudflare Pages).
 * Other hosts ignore the file; the meta Content-Security-Policy in index.html still applies there.
 */
function headersFile(site: SiteConfig): string {
  return `/*
  Content-Security-Policy: ${csp(site)}; frame-ancestors 'none'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: no-cache

/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: no-cache
`;
}

function robotsFile(site: SiteConfig): string {
  return site.allowIndexing ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';
}

/** Files generated from the configuration instead of being kept by hand in `public/`. */
function siteFiles(site: SiteConfig): Plugin {
  return {
    name: 'cyclecare-site-files',
    // The dev server has no build output, so it answers the manifest request itself.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0]?.endsWith('/manifest.webmanifest')) {
          res.setHeader('Content-Type', 'application/manifest+json');
          res.end(manifest(site));
        } else next();
      });
    },
    generateBundle() {
      const emit = (fileName: string, source: string) => this.emitFile({ type: 'asset', fileName, source });
      emit('manifest.webmanifest', manifest(site));
      emit('404.html', notFoundPage(site));
      emit('_headers', headersFile(site));
      emit('robots.txt', robotsFile(site));
    },
  };
}

/**
 * The partner relay inside `vite` and `vite preview`, with an in-memory store, so Partner mode works
 * locally and in the end-to-end tests. Production uses the Netlify Function (netlify/functions/partner.mts).
 */
function localPartnerRelay(site: SiteConfig): Plugin {
  const store = memoryRelayStore();
  const mount = (middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void }) => {
    const base = site.partnerSyncUrl;
    if (!base.startsWith('/')) return;
    middlewares.use((req, res, next) => {
      if (!req.url?.startsWith(base)) return next();
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value);
        const body = chunks.length && req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(chunks) : undefined;
        const request = new Request(`http://localhost${req.url}`, { method: req.method, headers, body });
        void handleRelay(request, store, base).then(async (response) => {
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        });
      });
    });
  };
  return {
    name: 'cyclecare-local-partner-relay',
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  };
}

/** Not part of the offline app: host configuration, the 404 page and the service worker itself. */
const NOT_PRECACHED = new Set(['sw.js', '404.html', '_headers', 'robots.txt', 'index.html', '.nojekyll']);

function listFiles(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path, base) : [relative(base, path).split(sep).join('/')];
  });
}

/**
 * Writes the list of built files into the service worker, so the installed app can start
 * offline right after its first visit. The cache name is a hash of the files' contents, which
 * retires old caches (and offers the update) whenever a new version is deployed.
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
      const files = listFiles(outDir)
        .filter((name) => !NOT_PRECACHED.has(name))
        .sort();
      const hash = createHash('sha256');
      for (const name of ['index.html', ...files]) hash.update(name).update(readFileSync(join(outDir, name)));
      const version = hash.digest('hex').slice(0, 10);
      const urls = ['./', ...files.map((name) => `./${name}`)];
      writeFileSync(swPath, sw.replace("'__VERSION__'", JSON.stringify(version)).replace('/*__PRECACHE__*/ []', JSON.stringify(urls)));
    },
  };
}

export default defineConfig(({ mode, command }) => {
  // `--mode single` produces one self-contained HTML file (fonts + JS + CSS inlined),
  // used for the shareable preview page. See scripts/build-single.mjs.
  const single = mode === 'single';
  const site = siteConfig(mode);
  return {
    // Relative addresses everywhere: the build works from a domain root or from any sub-folder.
    base: './',
    plugins: [react(), htmlMeta(site, command === 'build' && !single), ...(single ? [] : [siteFiles(site), precacheList(), localPartnerRelay(site)])],
    define: {
      // The single-file preview has no relay to talk to.
      // Unit tests talk to an in-process relay at this path (see tests/partnerFlows.test.ts).
      __PARTNER_SYNC_URL__: JSON.stringify(process.env.VITEST ? '/api/partner' : single ? '' : site.partnerSyncUrl),
      __APP_VERSION__: JSON.stringify((JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version),
      __PREVIEW__: JSON.stringify(single),
    },
    build: {
      target: 'es2022',
      outDir: single ? 'dist-single' : 'dist',
      sourcemap: false,
      cssCodeSplit: false,
      assetsInlineLimit: single ? 100_000_000 : 2048,
      chunkSizeWarningLimit: 900,
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      // Tests describe the default configuration, whatever the machine's environment says.
      env: {
        VITE_APP_NAME: '',
        VITE_OPERATOR_NAME: '',
        VITE_OPERATOR_ADDRESS: '',
        VITE_OPERATOR_REGISTRATION: '',
        VITE_CONTACT_EMAIL: '',
        VITE_DPO_CONTACT: '',
        VITE_LEGAL_REVIEWED: '',
        VITE_PARTNER_SYNC_URL: '',
      },
    },
  };
});
