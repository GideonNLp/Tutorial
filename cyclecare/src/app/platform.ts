/**
 * Everything that depends on where the app runs: a browser tab, an installed PWA,
 * or a sandboxed preview frame. Each feature degrades instead of failing.
 */

// ---- Saving a generated file ------------------------------------------------------------------

interface HostDownloads {
  save(request: { filename: string; data: Blob }): Promise<{ status: string }>;
}
interface HostBridge {
  use(name: 'downloads'): Promise<HostDownloads | null>;
}

function hostBridge(): HostBridge | undefined {
  const candidate = (globalThis as { claude?: Partial<HostBridge> }).claude;
  return candidate && typeof candidate.use === 'function' ? (candidate as HostBridge) : undefined;
}

// Asked once, early: a preview host can take several seconds to answer.
let hostDownloads: Promise<HostDownloads | null> | undefined;
export function warmUpHost(): void {
  const bridge = hostBridge();
  if (bridge && !hostDownloads) hostDownloads = bridge.use('downloads').catch(() => null);
}

function framed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export type SaveOutcome = 'saved' | 'declined' | 'failed';

/** Offers a generated file to the person. Nothing is uploaded: the file goes from memory to their device. */
export async function saveFile(filename: string, blob: Blob): Promise<SaveOutcome> {
  warmUpHost();
  if (hostDownloads) {
    const downloads = await hostDownloads;
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob });
        return 'saved';
      } catch (error) {
        return (error as { code?: string } | null)?.code === 'declined' ? 'declined' : 'failed';
      }
    }
    // Inside a preview frame without that ability, downloads started by the page are blocked.
    if (framed()) return 'failed';
  }

  // Phones: the share sheet is the natural way to save a file or send it to someone.
  const file = new File([blob], filename, { type: blob.type });
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (coarse && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'saved';
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return 'declined';
      // otherwise fall back to a plain download
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return 'saved';
  } catch {
    return 'failed';
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(file);
  });
}

// ---- Notifications ----------------------------------------------------------------------------

export type NotificationStatus = 'granted' | 'default' | 'denied' | 'unsupported';

export function notificationStatus(): NotificationStatus {
  try {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

export async function requestNotifications(): Promise<NotificationStatus> {
  try {
    if (typeof Notification === 'undefined') return 'unsupported';
    return await Notification.requestPermission();
  } catch {
    return 'unsupported';
  }
}

export async function showSystemNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (notificationStatus() !== 'granted') return false;
  const options: NotificationOptions = { body, tag, icon: './icon-192.png', badge: './icon-192.png' };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return true;
    }
  } catch {
    // no service worker here; try the page-level API
  }
  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

// ---- Offline support --------------------------------------------------------------------------

/** Registers the service worker of the installable build. The single-file preview has none. */
export function registerServiceWorker(): void {
  if (__SINGLE_FILE__ || !import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator) || framed()) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Offline support is optional; the app works without it.
    });
  });
}
