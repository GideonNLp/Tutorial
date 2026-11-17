/**
 * Partner relay: the only server-side code of CycleCare.
 *
 * It never sees anything readable. It stores:
 *   - pairing records (for at most 10 minutes): two ECDH public keys and, once the owner approves,
 *     the channel credentials wrapped with the key the two devices derived from them;
 *   - one channel per sharing link: the latest AES-GCM-encrypted summary, written only by the
 *     holder of the channel's write token, read by whoever knows the 128-bit channel id.
 *
 * Plain Web `Request` → `Response`, so the same code runs as a Netlify Function
 * (netlify/functions/partner.mts), inside `vite preview` for the tests, and in unit tests.
 *
 *   POST   /pair                 { code, ownerPub, tokenHash }      → 201 | 409 (code taken)
 *   GET    /pair/:code                                              → { ownerPub, partnerPub?, payload?, expiresAt } | 404
 *   POST   /pair/:code/join      { partnerPub }                     → 200 | 409 (already joined)
 *   POST   /pair/:code/approve   { payload }   + Bearer pairing token → 200
 *   DELETE /pair/:code                         + Bearer pairing token → 204
 *   PUT    /channel/:id          { iv, ct }    + Bearer write token   → 200 { etag } (the first write sets the token)
 *   GET    /channel/:id          [If-None-Match]                     → 200 { iv, ct, etag, updatedAt } | 304 | 404
 *   DELETE /channel/:id                        + Bearer write token   → 204
 *
 * The same relay also holds the encrypted backups ("Copie de siguranță"). A backup is addressed by an id
 * and a token that both derive from the person's recovery code, which the relay never sees; every call needs
 * the token, reads included. It keeps three versions of one backup, spaced in time so that one bad
 * change cannot push every good one out: the latest, the newest one at least a day older, and the
 * newest one at least a week older than that.
 *
 *   PUT    /backup/:id           { v, z, iv, ct } + Bearer token + If-None-Match: * (the first write)
 *                                                           or If-Match: <etag of the latest> → 200 { etag, updatedAt }
 *                                                           | 412 (someone else wrote since) | 428 (no precondition)
 *   GET    /backup/:id                          + Bearer token → { versions: [{ role, etag, updatedAt, size }] } | 404
 *   GET    /backup/:id/:role                    + Bearer token → { v, z, iv, ct, etag, updatedAt, role } | 404   (latest | daily | weekly)
 *   DELETE /backup/:id                          + Bearer token → 204 (all versions)
 */

export interface RelayStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export const PAIRING_TTL_MS = 10 * 60_000;
const MAX_BODY = 400_000;
/**
 * A backup holds years of days and a profile photo (up to 400 kB that does not compress), plus the base64
 * overhead of the ciphertext. 3 MB of ciphertext stays well under the ~6 MB a Netlify function accepts.
 */
export const MAX_BACKUP_CT = 3_000_000;
const MAX_BACKUP_BODY = MAX_BACKUP_CT + 1_000;
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
export const BACKUP_ROLES = ['latest', 'daily', 'weekly'] as const;
type BackupRole = (typeof BACKUP_ROLES)[number];
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const CHANNEL = /^[A-Za-z0-9_-]{22}$/;
const B64 = /^[A-Za-z0-9_-]+$/;
const TOKEN_HASH = /^[0-9a-f]{64}$/;

interface Pairing {
  ownerPub: string;
  tokenHash: string;
  partnerPub?: string;
  payload?: { iv: string; ct: string };
  expiresAt: number;
}

interface Channel {
  tokenHash: string;
  iv: string;
  ct: string;
  etag: string;
  updatedAt: string;
}

interface BackupEntry {
  /** Name of the blob that holds it (`b<n>`). */
  blob: string;
  etag: string;
  at: number;
  size: number;
  v: number;
  z: string;
}

interface BackupMeta {
  tokenHash: string;
  seq: number;
  latest: BackupEntry;
  daily?: BackupEntry;
  weekly?: BackupEntry;
}

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-None-Match, If-Match',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'ETag',
  'X-Content-Type-Options': 'nosniff',
};

const json = (status: number, body?: unknown, extra: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
const error = (status: number, code: string) => json(status, { error: code });

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const isB64 = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && B64.test(v);
const bearer = (req: Request) => /^Bearer ([A-Za-z0-9_-]{16,128})$/.exec(req.headers.get('Authorization') ?? '')?.[1];

class TooLarge extends Error {}

async function readBody(req: Request, limit = MAX_BODY): Promise<Record<string, unknown> | undefined> {
  const text = await req.text();
  if (text.length > limit) throw new TooLarge();
  try {
    const value = JSON.parse(text) as unknown;
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

async function livePairing(store: RelayStore, code: string, now: number): Promise<Pairing | undefined> {
  const pairing = (await store.get(`pair:${code}`)) as Pairing | null | undefined;
  if (!pairing) return undefined;
  if (pairing.expiresAt <= now) {
    await store.delete(`pair:${code}`);
    return undefined;
  }
  return pairing;
}

/** `basePath` is where the relay is mounted, e.g. `/api/partner`. */
export async function handleRelay(req: Request, store: RelayStore, basePath = '/api/partner', now = Date.now()): Promise<Response> {
  if (req.method === 'OPTIONS') return json(204);
  const path = new URL(req.url).pathname.replace(/\/+$/, '');
  if (!path.startsWith(basePath)) return error(404, 'not_found');
  const parts = path.slice(basePath.length).split('/').filter(Boolean);
  // Each family of routes has its own size limit: a backup is far larger than a summary for a partner.
  const limit = parts[0] === 'backup' ? MAX_BACKUP_BODY : MAX_BODY;
  const declared = Number(req.headers.get('Content-Length') ?? 0);
  if (declared > limit) return error(413, 'too_large');

  try {
    // ---- pairing ---------------------------------------------------------------------------
    if (parts[0] === 'pair') {
      if (parts.length === 1 && req.method === 'POST') {
        const body = await readBody(req);
        if (!body || typeof body.code !== 'string' || !CODE.test(body.code) || !isB64(body.ownerPub, 200)) return error(400, 'bad_request');
        if (typeof body.tokenHash !== 'string' || !TOKEN_HASH.test(body.tokenHash)) return error(400, 'bad_request');
        if (await livePairing(store, body.code, now)) return error(409, 'code_taken');
        const pairing: Pairing = { ownerPub: body.ownerPub, tokenHash: body.tokenHash, expiresAt: now + PAIRING_TTL_MS };
        await store.set(`pair:${body.code}`, pairing);
        return json(201, { expiresAt: pairing.expiresAt });
      }

      const code = parts[1] ?? '';
      if (!CODE.test(code)) return error(404, 'not_found');
      const pairing = await livePairing(store, code, now);
      if (!pairing) return error(404, 'not_found');

      if (parts.length === 2 && req.method === 'GET') {
        const { ownerPub, partnerPub, payload, expiresAt } = pairing;
        return json(200, { ownerPub, partnerPub, payload, expiresAt });
      }
      if (parts.length === 3 && parts[2] === 'join' && req.method === 'POST') {
        const body = await readBody(req);
        if (!body || !isB64(body.partnerPub, 200)) return error(400, 'bad_request');
        // First come, first served: a second device cannot replace the one the owner is verifying.
        if (pairing.partnerPub) return error(409, 'already_joined');
        await store.set(`pair:${code}`, { ...pairing, partnerPub: body.partnerPub });
        return json(200, { ok: true });
      }

      const token = bearer(req);
      if (!token || (await sha256Hex(token)) !== pairing.tokenHash) return error(403, 'forbidden');
      if (parts.length === 3 && parts[2] === 'approve' && req.method === 'POST') {
        const body = await readBody(req);
        const payload = body?.payload as Record<string, unknown> | undefined;
        if (!pairing.partnerPub || !payload || !isB64(payload.iv, 40) || !isB64(payload.ct, 2000)) return error(400, 'bad_request');
        await store.set(`pair:${code}`, { ...pairing, payload: { iv: payload.iv, ct: payload.ct } });
        return json(200, { ok: true });
      }
      if (parts.length === 2 && req.method === 'DELETE') {
        await store.delete(`pair:${code}`);
        return json(204);
      }
      return error(405, 'method_not_allowed');
    }

    // ---- channel ---------------------------------------------------------------------------
    if (parts[0] === 'channel' && parts.length === 2) {
      const id = parts[1]!;
      if (!CHANNEL.test(id)) return error(404, 'not_found');
      const channel = (await store.get(`channel:${id}`)) as Channel | null | undefined;

      if (req.method === 'GET') {
        if (!channel) return error(404, 'not_found');
        if (req.headers.get('If-None-Match') === channel.etag) return json(304, undefined, { ETag: channel.etag });
        const { iv, ct, etag, updatedAt } = channel;
        return json(200, { iv, ct, etag, updatedAt }, { ETag: etag });
      }

      const token = bearer(req);
      if (!token) return error(403, 'forbidden');
      const tokenHash = await sha256Hex(token);
      if (channel && channel.tokenHash !== tokenHash) return error(403, 'forbidden');

      if (req.method === 'PUT') {
        const body = await readBody(req);
        if (!body || !isB64(body.iv, 40) || !isB64(body.ct, MAX_BODY)) return error(400, 'bad_request');
        const etag = `"${(await sha256Hex(body.ct)).slice(0, 16)}"`;
        const record: Channel = { tokenHash, iv: body.iv, ct: body.ct, etag, updatedAt: new Date(now).toISOString() };
        await store.set(`channel:${id}`, record);
        return json(200, { etag }, { ETag: etag });
      }
      if (req.method === 'DELETE') {
        await store.delete(`channel:${id}`);
        return json(204);
      }
      return error(405, 'method_not_allowed');
    }

    // ---- backup ----------------------------------------------------------------------------
    if (parts[0] === 'backup' && (parts.length === 2 || parts.length === 3)) {
      const id = parts[1]!;
      if (!CHANNEL.test(id)) return error(404, 'not_found');
      const metaKey = `backup:${id}:meta`;
      const meta = (await store.get(metaKey)) as BackupMeta | null | undefined;

      const token = bearer(req);
      if (!token) return error(403, 'forbidden');
      const tokenHash = await sha256Hex(token);
      if (meta && meta.tokenHash !== tokenHash) return error(403, 'forbidden');

      if (parts.length === 3) {
        const role = parts[2] as BackupRole;
        if (req.method !== 'GET') return error(405, 'method_not_allowed');
        const entry = BACKUP_ROLES.includes(role) ? meta?.[role] : undefined;
        if (!meta || !entry) return error(404, 'not_found');
        const blob = (await store.get(`backup:${id}:${entry.blob}`)) as { iv: string; ct: string } | null | undefined;
        if (!blob) return error(404, 'not_found');
        return json(200, { v: entry.v, z: entry.z, iv: blob.iv, ct: blob.ct, etag: entry.etag, updatedAt: new Date(entry.at).toISOString(), role });
      }

      if (req.method === 'GET') {
        if (!meta) return error(404, 'not_found');
        const versions = BACKUP_ROLES.flatMap((role) => {
          const entry = meta[role];
          return entry ? [{ role, etag: entry.etag, updatedAt: new Date(entry.at).toISOString(), size: entry.size }] : [];
        });
        return json(200, { versions });
      }

      if (req.method === 'DELETE') {
        if (meta) {
          const blobs = BACKUP_ROLES.flatMap((role) => (meta[role] ? [meta[role]!.blob] : []));
          await Promise.all(blobs.map((blob) => store.delete(`backup:${id}:${blob}`)));
          await store.delete(metaKey);
        }
        return json(204);
      }

      if (req.method === 'PUT') {
        // Whoever writes must have seen the latest version (or be creating the first one): two phones
        // on the same code cannot silently overwrite each other.
        const ifMatch = req.headers.get('If-Match');
        const ifNoneMatch = req.headers.get('If-None-Match');
        if (!ifMatch && ifNoneMatch !== '*') return error(428, 'precondition_required');
        if (meta ? ifMatch !== meta.latest.etag : ifMatch !== null) return error(412, 'precondition_failed');

        const body = await readBody(req, MAX_BACKUP_BODY);
        if (!body || !isB64(body.iv, 40) || !isB64(body.ct, MAX_BACKUP_CT)) return error(400, 'bad_request');
        if (body.v !== 1 || (body.z !== 'gzip' && body.z !== 'none')) return error(400, 'bad_request');

        const seq = (meta?.seq ?? 0) + 1;
        const entry: BackupEntry = {
          blob: `b${seq}`,
          etag: `"${(await sha256Hex(body.iv + body.ct)).slice(0, 16)}"`,
          at: now,
          size: body.ct.length,
          v: body.v,
          z: body.z,
        };
        // The version that was the latest is kept as the daily one if the daily one is at least a day
        // older (and that one as the weekly if the weekly is a week older); otherwise it is let go.
        const drop: string[] = [];
        let daily = meta?.daily;
        let weekly = meta?.weekly;
        const previous = meta?.latest;
        if (previous) {
          if (!daily || previous.at - daily.at >= DAY_MS) {
            if (daily) {
              if (!weekly || daily.at - weekly.at >= WEEK_MS) {
                if (weekly) drop.push(weekly.blob);
                weekly = daily;
              } else {
                drop.push(daily.blob);
              }
            }
            daily = previous;
          } else {
            drop.push(previous.blob);
          }
        }
        await store.set(`backup:${id}:${entry.blob}`, { iv: body.iv, ct: body.ct });
        // The metadata is the commit point: until it is written the old versions are still the truth.
        const next: BackupMeta = { tokenHash, seq, latest: entry, ...(daily ? { daily } : {}), ...(weekly ? { weekly } : {}) };
        await store.set(metaKey, next);
        await Promise.all(drop.map((blob) => store.delete(`backup:${id}:${blob}`)));
        return json(200, { etag: entry.etag, updatedAt: new Date(now).toISOString() }, { ETag: entry.etag });
      }
      return error(405, 'method_not_allowed');
    }

    return error(404, 'not_found');
  } catch (e) {
    return e instanceof TooLarge ? error(413, 'too_large') : error(500, 'server_error');
  }
}

/** In-memory store, for tests and for `vite preview`. */
export function memoryRelayStore(): RelayStore {
  const map = new Map<string, string>();
  return {
    get: async (key) => (map.has(key) ? (JSON.parse(map.get(key)!) as unknown) : null),
    set: async (key, value) => void map.set(key, JSON.stringify(value)),
    delete: async (key) => void map.delete(key),
  };
}
