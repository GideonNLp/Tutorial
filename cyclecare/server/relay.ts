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
 */

export interface RelayStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export const PAIRING_TTL_MS = 10 * 60_000;
const MAX_BODY = 400_000;
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

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-None-Match',
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

async function readBody(req: Request): Promise<Record<string, unknown> | undefined> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new TooLarge();
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
  const declared = Number(req.headers.get('Content-Length') ?? 0);
  if (declared > MAX_BODY) return error(413, 'too_large');

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
