import { useEffect, useRef } from 'react';
import { createStore, useStore } from '../app/miniStore';
import { retryPendingBackupDelete, updateAutoBackup, useData } from '../app/store';
import { contentDigest, listBackups, pushBackup } from './flows';

/**
 * Keeps the encrypted copy on the server up to date, on a device where the person turned it on.
 *
 * It is slower than the partner's summary on purpose: a copy is the whole journal, so it goes out
 * about 45 seconds after the last change, at once when the app goes to the background, and again
 * as soon as the connection is back. An unchanged journal is never sent again. Offline it waits and retries.
 *
 * Every write names the version this device last wrote (`If-Match`). If another phone wrote since, the
 * server says so, this device stops, and the person decides which of the two journals the copy should follow.
 * A response that arrives after the screen changed is still recorded: losing it would make the next write look like a stranger's.
 */
export type BackupSyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'taken';

const status = createStore<{ state: BackupSyncState }>({ state: 'idle' });
export const useBackupSync = () => useStore(status, (s) => s.state);

export const BACKUP_DEBOUNCE_MS = 45_000;
const RETRY_MS = [30_000, 120_000, 600_000];

export function BackupSync() {
  const data = useData();
  const backup = data.backup;
  const auto = backup?.auto;
  const latest = useRef(data);
  latest.current = data;
  const busy = useRef(false);
  const again = useRef(false);
  const attempt = useRef(0);
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const send = useRef(async (): Promise<void> => {
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    try {
      const current = latest.current;
      const b = current.backup;
      if (!b?.auto || b.auto.taken) return;
      const hash = await contentDigest(current);
      if (hash === b.auto.digest && b.auto.etag) {
        status.set({ state: 'synced' });
        return;
      }
      status.set({ state: 'syncing' });
      let etag = b.auto.etag;
      if (!etag) {
        // Turning the copy on is the person's own act: if the code already has a version on the server (a phone
        // that was restored, a copy that was turned off and on again), this phone takes it over from here.
        const existing = await listBackups(b.code);
        if (existing.ok) etag = existing.value[0]?.etag;
        else if (existing.reason !== 'not_found') {
          status.set({ state: existing.reason === 'offline' ? 'offline' : 'error' });
          clearTimeout(retry.current);
          retry.current = setTimeout(() => void send.current(), RETRY_MS[Math.min(attempt.current++, RETRY_MS.length - 1)]);
          return;
        }
      }
      const res = await pushBackup(b.code, latest.current, etag, new Date());
      if (res.ok) {
        attempt.current = 0;
        // What was sent is what `hash` describes, even if the journal moved on while it was on its way.
        updateAutoBackup({ etag: res.value.etag, digest: hash, lastAt: res.value.updatedAt });
        status.set({ state: 'synced' });
        void retryPendingBackupDelete();
        return;
      }
      if (res.reason === 'conflict') {
        updateAutoBackup({ taken: true });
        status.set({ state: 'taken' });
        return;
      }
      status.set({ state: res.reason === 'offline' ? 'offline' : 'error' });
      clearTimeout(retry.current);
      retry.current = setTimeout(() => void send.current(), RETRY_MS[Math.min(attempt.current++, RETRY_MS.length - 1)]);
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        clearTimeout(retry.current);
        retry.current = setTimeout(() => void send.current(), 1000);
      }
    }
  });

  const on = Boolean(auto);
  const waiting = Boolean(auto && !auto.taken);
  const firstCopy = Boolean(auto && !auto.etag);

  useEffect(() => {
    if (!on) status.set({ state: 'idle' });
    else if (!waiting) status.set({ state: 'taken' });
  }, [on, waiting]);

  // A change starts the wait again; the first copy of a new code goes out at once.
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => void send.current(), firstCopy ? 0 : BACKUP_DEBOUNCE_MS);
    const flush = () => {
      clearTimeout(timer);
      void send.current();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [waiting, firstCopy, data]);

  useEffect(() => () => clearTimeout(retry.current), []);

  // A copy turned off, or left behind by a new code, is deleted once the server can be reached.
  const pending = backup?.pendingDelete?.length ?? 0;
  useEffect(() => {
    if (!pending) return;
    const retryDelete = () => void retryPendingBackupDelete();
    retryDelete();
    window.addEventListener('online', retryDelete);
    const timer = setInterval(retryDelete, 60_000);
    return () => {
      window.removeEventListener('online', retryDelete);
      clearInterval(timer);
    };
  }, [pending]);

  return null;
}
