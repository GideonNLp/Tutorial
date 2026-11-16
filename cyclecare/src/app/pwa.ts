import { createStore, useStore } from './miniStore';

/**
 * What makes the web build behave like an installed app: the service worker (offline start and
 * updates), the install prompt, and asking the browser not to evict the journal.
 * The single-file preview has none of this.
 */
export type InstallState =
  | 'installed' // running from the home screen
  | 'available' // the browser offered an install prompt we can show
  | 'manual-ios' // iOS: only through Share → "Add to Home Screen"
  | 'unavailable';

interface PwaState {
  install: InstallState;
  /** A new version is downloaded and waiting for the person to accept it. */
  updateReady: boolean;
  /** Whether the browser promised to keep this site's storage; `undefined` until asked. */
  persisted: boolean | undefined;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const hasWindow = typeof window !== 'undefined';

function framed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function standalone(): boolean {
  try {
    return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

function isIOS(): boolean {
  // iPadOS reports itself as a Mac; the touch points give it away.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function initialInstall(): InstallState {
  if (!hasWindow || __PREVIEW__ || framed()) return 'unavailable';
  if (standalone()) return 'installed';
  return isIOS() ? 'manual-ios' : 'unavailable';
}

const store = createStore<PwaState>({ install: initialInstall(), updateReady: false, persisted: undefined });
const patch = (partial: Partial<PwaState>) => store.set((s) => ({ ...s, ...partial }));

export const useInstallState = () => useStore(store, (s) => s.install);
export const useUpdateReady = () => useStore(store, (s) => s.updateReady);
export const useStoragePersisted = () => useStore(store, (s) => s.persisted);

// ---- Install ----------------------------------------------------------------------------------

let installPrompt: BeforeInstallPromptEvent | undefined;

if (hasWindow && !__PREVIEW__) {
  // Fires early, so the listeners are attached as soon as this module loads.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // we show our own button, in Settings → About
    installPrompt = event as BeforeInstallPromptEvent;
    patch({ install: 'available' });
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = undefined;
    patch({ install: 'installed' });
  });
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = installPrompt;
  if (!prompt) return 'unavailable';
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    installPrompt = undefined; // a prompt can be used once
    patch({ install: outcome === 'accepted' ? 'installed' : 'unavailable' });
    return outcome;
  } catch {
    return 'unavailable';
  }
}

// ---- Storage ----------------------------------------------------------------------------------

/**
 * Asks the browser to keep the journal even when the device runs low on space.
 * Browsers grant this quietly to installed or often-used apps; some ask the person.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (__PREVIEW__ || !navigator.storage?.persist) return;
    const persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    patch({ persisted });
  } catch {
    // Not supported here: nothing to report.
  }
}

// ---- Offline support and updates --------------------------------------------------------------

let registration: ServiceWorkerRegistration | undefined;
let reloading = false;

/**
 * Registers the service worker. A first install takes control silently. A later version is
 * downloaded in the background and offered (`updateReady`); nothing changes under an open screen
 * until the person accepts, or until the app is fully closed and opened again.
 */
export function registerServiceWorker(beforeReload: () => Promise<unknown>): void {
  if (__PREVIEW__ || !import.meta.env.PROD) return;
  if (!hasWindow || !('serviceWorker' in navigator) || framed()) return;
  const container = navigator.serviceWorker;

  const start = async () => {
    try {
      let controlled = container.controller !== null;
      const reg = await container.register('./sw.js', { updateViaCache: 'none' });
      registration = reg;

      const offer = () => patch({ updateReady: true });
      const watch = (worker: ServiceWorker) =>
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && container.controller) offer();
        });
      if (reg.waiting && container.controller) offer();
      if (reg.installing) watch(reg.installing);
      reg.addEventListener('updatefound', () => {
        if (reg.installing) watch(reg.installing);
      });

      container.addEventListener('controllerchange', () => {
        // The first worker claiming the page changes nothing on screen. A replacement means a new
        // version went live (here or in another tab): load it, after saving what is pending.
        if (controlled && !reloading) {
          reloading = true;
          void beforeReload()
            .catch(() => undefined)
            .then(() => window.location.reload());
        }
        controlled = true;
      });

      // An installed app can stay open for days: look for a new version whenever it comes back to the front.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
      });
    } catch {
      // Offline support is optional; the app works without it.
    }
  };
  if (document.readyState === 'complete') void start();
  else window.addEventListener('load', () => void start(), { once: true });
}

/** Switches to the downloaded version: the waiting worker takes over and the page reloads. */
export function applyUpdate(): void {
  const waiting = registration?.waiting;
  if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
  else window.location.reload();
}
