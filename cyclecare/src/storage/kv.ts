/**
 * Minimal key–value storage. IndexedDB is used because it can hold binary data and
 * non-extractable CryptoKey objects; when it is unavailable (private window, blocked site data)
 * the app falls back to memory and tells the person that nothing will be kept.
 */
export interface KVStore {
  /** False when values only live for the current session. */
  readonly persistent: boolean;
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export function memoryStore(): KVStore {
  const map = new Map<string, unknown>();
  return {
    persistent: false,
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async delete(key) {
      map.delete(key);
    },
    async clear() {
      map.clear();
    },
  };
}

const STORE = 'kv';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

export function openIndexedDbStore(name = 'cyclecare'): Promise<KVStore> {
  return new Promise((resolve, reject) => {
    let open: IDBOpenDBRequest;
    try {
      open = indexedDB.open(name, 1);
    } catch (error) {
      reject(error);
      return;
    }
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE);
    };
    open.onerror = () => reject(open.error ?? new Error('IndexedDB unavailable'));
    open.onblocked = () => reject(new Error('IndexedDB blocked'));
    open.onsuccess = () => {
      const db = open.result;
      db.onversionchange = () => db.close();
      const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);
      resolve({
        persistent: true,
        get: <T,>(key: string) => request(tx('readonly').get(key)) as Promise<T | undefined>,
        set: (key, value) => request(tx('readwrite').put(value, key)).then(() => undefined),
        delete: (key) => request(tx('readwrite').delete(key)).then(() => undefined),
        clear: () => request(tx('readwrite').clear()).then(() => undefined),
      });
    };
  });
}

/** IndexedDB when it works, memory otherwise. Never throws. */
export async function openBestStore(): Promise<KVStore> {
  try {
    if (typeof indexedDB === 'undefined') return memoryStore();
    const store = await Promise.race([
      openIndexedDbStore(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('IndexedDB timeout')), 4000)),
    ]);
    // Some sandboxes open the database but refuse writes; probe once.
    await store.set('__probe', 1);
    await store.delete('__probe');
    return store;
  } catch {
    return memoryStore();
  }
}
