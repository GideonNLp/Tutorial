import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests run against the production build (`vite preview`), so they also cover
 * the Content-Security-Policy and the service worker.
 *
 * The host is `localhost` (not 127.0.0.1) because WebAuthn refuses IP addresses.
 * Set PW_CHROMIUM_PATH to use a Chromium that is already installed.
 */
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
    locale: 'ro-RO',
    timezoneId: 'Europe/Bucharest',
    viewport: { width: 390, height: 844 },
    trace: 'off',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --host localhost --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
