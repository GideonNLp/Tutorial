/// <reference types="vitest/config" />
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
      return html.replace(
        '<!--csp-->',
        `<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  // `--mode single` produces one self-contained HTML file (fonts + JS + CSS inlined),
  // used for the shareable prototype page. See scripts/build-single.mjs.
  const single = mode === 'single';
  return {
    base: './',
    plugins: [react(), ...(single ? [] : [cspMeta()])],
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
