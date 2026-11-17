/**
 * One place where unexpected errors end up.
 *
 * Nothing is sent anywhere: the app has no server and its Content-Security-Policy forbids talking
 * to one. In development the error is printed; in production the person gets one calm message
 * (through the listener set by the UI) and can carry on or reload.
 */
export type ErrorSource = 'render' | 'save' | 'export' | 'runtime' | 'promise' | 'react';

type Listener = (source: ErrorSource, error: unknown) => void;

let listener: Listener | undefined;

/** The UI registers how unexpected errors are shown (a toast). */
export function onUnexpectedError(next: Listener): void {
  listener = next;
}

export function reportError(source: ErrorSource, error: unknown): void {
  if (import.meta.env.DEV) console.error(`[${source}]`, error);
  try {
    listener?.(source, error);
  } catch {
    // Reporting must never throw.
  }
}

let installed = false;

/** Catches what no `try` caught: script errors and promises nobody handled. */
export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (event) => {
    // Resource load failures (an image, a font) also arrive here, without an `error` object; they are not crashes.
    if (event.error === undefined || event.error === null) return;
    reportError('runtime', event.error);
  });
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    reportError('promise', event.reason);
  });
}
