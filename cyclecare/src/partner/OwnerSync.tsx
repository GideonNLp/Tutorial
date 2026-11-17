import { useEffect, useMemo, useRef } from 'react';
import { createStore, useStore } from '../app/miniStore';
import { retryPendingRevoke, useData, useTimeline } from '../app/store';
import { buildPartnerSnapshot } from '../domain/partner';
import { pushSnapshot } from './flows';

/**
 * Keeps the partner's view up to date on the owner's device: whenever what the partner may see
 * changes (a journal entry, a permission, a new day), the summary is rebuilt, sealed and sent a
 * moment later. Offline, it waits and sends as soon as the connection is back.
 */
export type ShareSyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

const status = createStore<{ state: ShareSyncState; at?: number }>({ state: 'idle' });
export const useShareSync = () => useStore(status, (s) => s);
const setStatus = (state: ShareSyncState) => status.set({ state, at: state === 'synced' ? Date.now() : status.get().at });

const DEBOUNCE_MS = 1500;
const RETRY_MS = [5_000, 15_000, 60_000];

export function OwnerSync() {
  const data = useData();
  const timeline = useTimeline();
  const share = data.partner.share;
  const pendingRevoke = data.partner.pendingRevoke;

  // Without the timestamp, so an unchanged summary is not sent again.
  const content = useMemo(() => {
    if (!share) return undefined;
    const { generatedAt: _at, ...rest } = buildPartnerSnapshot(data, timeline, '');
    return JSON.stringify(rest);
  }, [share, data, timeline]);

  const sent = useRef<string | undefined>(undefined);
  const attempt = useRef(0);

  useEffect(() => {
    if (!share || content === undefined || content === sent.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const send = async () => {
      if (cancelled) return;
      setStatus('syncing');
      const snapshot = { ...JSON.parse(content), generatedAt: new Date().toISOString() };
      const res = await pushSnapshot(share, snapshot);
      if (cancelled) return;
      if (res.ok) {
        sent.current = content;
        attempt.current = 0;
        setStatus('synced');
        return;
      }
      setStatus(res.reason === 'offline' ? 'offline' : 'error');
      timer = setTimeout(send, RETRY_MS[Math.min(attempt.current++, RETRY_MS.length - 1)]);
    };
    timer = setTimeout(send, sent.current === undefined ? 0 : DEBOUNCE_MS);
    const online = () => {
      clearTimeout(timer);
      void send();
    };
    window.addEventListener('online', online);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('online', online);
    };
  }, [share, content]);

  // A link stopped while offline is deleted from the server once the device is back online.
  useEffect(() => {
    if (!pendingRevoke) return;
    const retry = () => void retryPendingRevoke();
    retry();
    window.addEventListener('online', retry);
    const timer = setInterval(retry, 60_000);
    return () => {
      window.removeEventListener('online', retry);
      clearInterval(timer);
    };
  }, [pendingRevoke]);

  // A new link starts fresh.
  useEffect(() => {
    sent.current = undefined;
    if (!share) setStatus('idle');
  }, [share?.channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
