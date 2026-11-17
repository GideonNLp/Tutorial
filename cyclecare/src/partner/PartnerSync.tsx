import { useEffect } from 'react';
import { createStore, useStore } from '../app/miniStore';
import { getState, updatePartnerView, useData } from '../app/store';
import { readPartnerSnapshot, type PartnerSnapshot } from '../domain/partner';
import { fetchSnapshot } from './flows';

/**
 * On the partner's device: looks for a newer summary every 20 seconds while the app is in front,
 * at once when it comes back to the front or online, and on request. The last summary received is
 * kept in the device's encrypted vault, so the screens work offline.
 */
export type ViewSyncState = 'idle' | 'checking' | 'ok' | 'offline' | 'error';

const status = createStore<{ state: ViewSyncState; at?: number }>({ state: 'idle' });
export const usePartnerSync = () => useStore(status, (s) => s);

const POLL_MS = 20_000;
let running: Promise<void> | undefined;

/** Asks the relay now. Overlapping calls share one request. */
export function refreshPartnerView(): Promise<void> {
  running ??= (async () => {
    const view = getState().data?.partnerView;
    if (!view || view.revoked) return;
    status.set((s) => ({ ...s, state: 'checking' }));
    const outcome = await fetchSnapshot(view);
    const at = Date.now();
    if (outcome.kind === 'updated') {
      updatePartnerView({ snapshot: outcome.snapshot, etag: outcome.etag, checkedAt: new Date(at).toISOString() });
      status.set({ state: 'ok', at });
    } else if (outcome.kind === 'unchanged') {
      status.set({ state: 'ok', at });
    } else if (outcome.kind === 'revoked') {
      updatePartnerView({ revoked: true, checkedAt: new Date(at).toISOString() });
      status.set({ state: 'ok', at });
    } else {
      status.set((s) => ({ ...s, state: outcome.reason === 'offline' ? 'offline' : 'error' }));
    }
  })().finally(() => {
    running = undefined;
  });
  return running;
}

export function PartnerSync() {
  useEffect(() => {
    void refreshPartnerView();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshPartnerView();
    }, POLL_MS);
    const wake = () => {
      if (document.visibilityState === 'visible') void refreshPartnerView();
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
    };
  }, []);
  return null;
}

/** The summary to show, validated again on the way out of storage. */
export function usePartnerSnapshot(): PartnerSnapshot | undefined {
  const view = useData().partnerView;
  return view?.snapshot === undefined ? undefined : readPartnerSnapshot(view.snapshot);
}
