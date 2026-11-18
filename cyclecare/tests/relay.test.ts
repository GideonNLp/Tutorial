import { describe, expect, it } from 'vitest';
import { handleRelay, memoryRelayStore, PAIRING_TTL_MS, sha256Hex } from '../server/relay';

const BASE = 'https://app.example/api/partner';
const T0 = 1_800_000_000_000;

function call(
  store: ReturnType<typeof memoryRelayStore>,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
  now = T0,
) {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return handleRelay(new Request(BASE + path, init), store, '/api/partner', now);
}

const OWNER_TOKEN = 'owner-pairing-token-0123456789';
const WRITE_TOKEN = 'channel-write-token-0123456789';
const CHANNEL = 'AbCdEfGhIjKlMnOpQrStUv';

describe('pairing', () => {
  async function started() {
    const store = memoryRelayStore();
    const res = await call(store, 'POST', '/pair', { code: 'K7Q2MX', ownerPub: 'ownerPUBkey', tokenHash: await sha256Hex(OWNER_TOKEN) });
    expect(res.status).toBe(201);
    return store;
  }

  it('lets one partner join, the owner approve, and the partner collect the wrapped credentials', async () => {
    const store = await started();
    expect(await (await call(store, 'GET', '/pair/K7Q2MX')).json()).toMatchObject({ ownerPub: 'ownerPUBkey' });

    expect((await call(store, 'POST', '/pair/K7Q2MX/join', { partnerPub: 'partnerPUBkey' })).status).toBe(200);
    // Nobody can replace the partner the owner is now verifying.
    expect((await call(store, 'POST', '/pair/K7Q2MX/join', { partnerPub: 'intruderKey' })).status).toBe(409);

    // Only the owner (pairing token) can approve.
    const payload = { iv: 'aXY', ct: 'Y2lwaGVy' };
    expect((await call(store, 'POST', '/pair/K7Q2MX/approve', { payload })).status).toBe(403);
    expect((await call(store, 'POST', '/pair/K7Q2MX/approve', { payload }, { Authorization: 'Bearer wrong-token-0123456789' })).status).toBe(403);
    expect((await call(store, 'POST', '/pair/K7Q2MX/approve', { payload }, { Authorization: `Bearer ${OWNER_TOKEN}` })).status).toBe(200);

    expect(await (await call(store, 'GET', '/pair/K7Q2MX')).json()).toMatchObject({ partnerPub: 'partnerPUBkey', payload });
    expect((await call(store, 'DELETE', '/pair/K7Q2MX', undefined, { Authorization: `Bearer ${OWNER_TOKEN}` })).status).toBe(204);
    expect((await call(store, 'GET', '/pair/K7Q2MX')).status).toBe(404);
  });

  it('refuses a code already in use, malformed input, and approval before anyone joined', async () => {
    const store = await started();
    expect((await call(store, 'POST', '/pair', { code: 'K7Q2MX', ownerPub: 'x', tokenHash: await sha256Hex('another-token-000000') })).status).toBe(
      409,
    );
    expect((await call(store, 'POST', '/pair', { code: 'k7q2mx', ownerPub: 'x', tokenHash: await sha256Hex(OWNER_TOKEN) })).status).toBe(400);
    expect((await call(store, 'POST', '/pair', { code: 'ABC10O', ownerPub: 'x', tokenHash: 'nothex' })).status).toBe(400);
    expect((await call(store, 'POST', '/pair/K7Q2MX/join', { partnerPub: 'has spaces' })).status).toBe(400);
    const early = await call(store, 'POST', '/pair/K7Q2MX/approve', { payload: { iv: 'a', ct: 'b' } }, { Authorization: `Bearer ${OWNER_TOKEN}` });
    expect(early.status).toBe(400);
  });

  it('forgets a pairing after ten minutes', async () => {
    const store = await started();
    expect((await call(store, 'GET', '/pair/K7Q2MX', undefined, {}, T0 + PAIRING_TTL_MS - 1)).status).toBe(200);
    expect((await call(store, 'GET', '/pair/K7Q2MX', undefined, {}, T0 + PAIRING_TTL_MS)).status).toBe(404);
    // …and the code can then be used again.
    const again = await call(
      store,
      'POST',
      '/pair',
      { code: 'K7Q2MX', ownerPub: 'new', tokenHash: await sha256Hex(OWNER_TOKEN) },
      {},
      T0 + PAIRING_TTL_MS + 1,
    );
    expect(again.status).toBe(201);
  });
});

describe('channel', () => {
  const auth = { Authorization: `Bearer ${WRITE_TOKEN}` };

  it('stores the latest ciphertext; only the write token may change or delete it', async () => {
    const store = memoryRelayStore();
    expect((await call(store, 'GET', `/channel/${CHANNEL}`)).status).toBe(404);
    const put = await call(store, 'PUT', `/channel/${CHANNEL}`, { iv: 'aXYx', ct: 'Zmlyc3Q' }, auth);
    expect(put.status).toBe(200);
    const { etag } = (await put.json()) as { etag: string };

    const got = await call(store, 'GET', `/channel/${CHANNEL}`);
    expect(await got.json()).toMatchObject({ iv: 'aXYx', ct: 'Zmlyc3Q', etag });
    // Nothing new: 304, without the body.
    expect((await call(store, 'GET', `/channel/${CHANNEL}`, undefined, { 'If-None-Match': etag })).status).toBe(304);

    const other = { Authorization: 'Bearer somebody-else-0123456789' };
    expect((await call(store, 'PUT', `/channel/${CHANNEL}`, { iv: 'aXYx', ct: 'aGFja2Vk' }, other)).status).toBe(403);
    expect((await call(store, 'DELETE', `/channel/${CHANNEL}`, undefined, other)).status).toBe(403);
    expect((await call(store, 'PUT', `/channel/${CHANNEL}`, { iv: 'aXYx', ct: 'c2Vjb25k' })).status).toBe(403);

    const second = await call(store, 'PUT', `/channel/${CHANNEL}`, { iv: 'aXYz', ct: 'c2Vjb25k' }, auth);
    expect(((await second.json()) as { etag: string }).etag).not.toBe(etag);

    expect((await call(store, 'DELETE', `/channel/${CHANNEL}`, undefined, auth)).status).toBe(204);
    expect((await call(store, 'GET', `/channel/${CHANNEL}`)).status).toBe(404);
  });

  it('refuses malformed ids, bodies and oversized uploads', async () => {
    const store = memoryRelayStore();
    expect((await call(store, 'GET', '/channel/short')).status).toBe(404);
    expect((await call(store, 'PUT', `/channel/${CHANNEL}`, { iv: 'a b', ct: 'x' }, auth)).status).toBe(400);
    expect((await call(store, 'PUT', `/channel/${CHANNEL}`, { iv: 'aXYx', ct: 'A'.repeat(400_001) }, auth)).status).toBe(413);
    expect((await call(store, 'GET', '/unknown')).status).toBe(404);
  });

  it('answers CORS preflight requests and never lets responses be cached', async () => {
    const store = memoryRelayStore();
    const res = await call(store, 'OPTIONS', `/channel/${CHANNEL}`);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect((await call(store, 'GET', `/channel/${CHANNEL}`)).headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('backup', () => {
  const ID = 'BackupIdAbCdEfGhIjKlMn';
  const TOKEN = 'backup-token-0123456789-AbCdEfGhIj';
  const auth = { Authorization: `Bearer ${TOKEN}` };
  const DAY = 86_400_000;
  const HOUR = 3_600_000;

  /** A store that can say what it holds, so a version that was let go can be seen to be gone. */
  function trackedStore() {
    const inner = memoryRelayStore();
    const keys = new Set<string>();
    return {
      keys,
      store: {
        get: inner.get,
        set: async (key: string, value: unknown) => {
          keys.add(key);
          await inner.set(key, value);
        },
        delete: async (key: string) => {
          keys.delete(key);
          await inner.delete(key);
        },
      },
    };
  }

  const sealed = (n: number) => ({ v: 1, z: 'gzip', iv: 'aXZpdml2aXZpdg', ct: `Y2lwaGVydGV4dA${n}` });

  /** Writes the next version the way a client does: with the etag of the latest it knows. */
  async function write(store: ReturnType<typeof memoryRelayStore>, n: number, at: number, etag?: string) {
    const headers: Record<string, string> = etag ? { ...auth, 'If-Match': etag } : { ...auth, 'If-None-Match': '*' };
    const res = await call(store, 'PUT', `/backup/${ID}`, sealed(n), headers, at);
    return { res, etag: res.status === 200 ? ((await res.json()) as { etag: string }).etag : undefined };
  }

  const versions = async (store: ReturnType<typeof memoryRelayStore>, at: number) =>
    ((await (await call(store, 'GET', `/backup/${ID}`, undefined, auth, at)).json()) as { versions: Array<{ role: string; updatedAt: string }> })
      .versions;

  it('needs the token for everything, reads included; the first write sets it', async () => {
    const store = memoryRelayStore();
    expect((await call(store, 'GET', `/backup/${ID}`, undefined, auth)).status).toBe(404);
    const first = await write(store, 1, T0);
    expect(first.res.status).toBe(200);
    expect(first.etag).toMatch(/^"[0-9a-f]{16}"$/);

    expect((await call(store, 'GET', `/backup/${ID}`)).status).toBe(403);
    expect((await call(store, 'GET', `/backup/${ID}`, undefined, { Authorization: 'Bearer another-token-0123456789' })).status).toBe(403);
    expect((await call(store, 'GET', `/backup/${ID}/latest`, undefined, { Authorization: 'Bearer another-token-0123456789' })).status).toBe(403);
    expect((await call(store, 'DELETE', `/backup/${ID}`, undefined, { Authorization: 'Bearer another-token-0123456789' })).status).toBe(403);
    expect(
      (await call(store, 'PUT', `/backup/${ID}`, sealed(2), { Authorization: 'Bearer another-token-0123456789', 'If-Match': first.etag! })).status,
    ).toBe(403);

    expect(await (await call(store, 'GET', `/backup/${ID}/latest`, undefined, auth)).json()).toMatchObject({
      ...sealed(1),
      role: 'latest',
      etag: first.etag,
    });
    expect((await call(store, 'GET', `/backup/${ID}/latest`, undefined, auth)).headers.get('Cache-Control')).toBe('no-store');
  });

  it('lets a write through only from someone who has seen the latest version', async () => {
    const store = memoryRelayStore();
    const first = await write(store, 1, T0);
    // No precondition at all, a stale one, or "create" on an existing backup: refused.
    expect((await call(store, 'PUT', `/backup/${ID}`, sealed(2), auth, T0)).status).toBe(428);
    expect((await call(store, 'PUT', `/backup/${ID}`, sealed(2), { ...auth, 'If-Match': '"0000000000000000"' }, T0)).status).toBe(412);
    expect((await call(store, 'PUT', `/backup/${ID}`, sealed(2), { ...auth, 'If-None-Match': '*' }, T0)).status).toBe(412);
    // Creating with an If-Match when nothing exists is not a valid first write either.
    expect((await call(memoryRelayStore(), 'PUT', `/backup/${ID}`, sealed(1), { ...auth, 'If-Match': first.etag! }, T0)).status).toBe(412);

    const second = await write(store, 2, T0 + 1000, first.etag);
    expect(second.res.status).toBe(200);
    expect(second.etag).not.toBe(first.etag);
    // The first writer's etag is now stale: a second phone on the same code finds out instead of overwriting.
    expect((await write(store, 3, T0 + 2000, first.etag)).res.status).toBe(412);
    expect(await (await call(store, 'GET', `/backup/${ID}/latest`, undefined, auth)).json()).toMatchObject(sealed(2));
  });

  it('keeps the latest version, one at least a day older, and one at least a week older than that', async () => {
    const { store, keys } = trackedStore();
    let etag: string | undefined;
    const put = async (n: number, at: number) => {
      const r = await write(store, n, at, etag);
      expect(r.res.status).toBe(200);
      etag = r.etag;
    };

    await put(1, T0);
    expect((await versions(store, T0)).map((v) => v.role)).toEqual(['latest']);

    // Changes within the day replace the latest and are not kept: one bad change cannot push the older ones out.
    await put(2, T0 + HOUR);
    await put(3, T0 + 2 * HOUR);
    expect((await versions(store, T0)).map((v) => v.role)).toEqual(['latest', 'daily']);
    expect(await (await call(store, 'GET', `/backup/${ID}/daily`, undefined, auth)).json()).toMatchObject(sealed(1));

    await put(4, T0 + 25 * HOUR);
    await put(5, T0 + 50 * HOUR);
    const list = await versions(store, T0);
    expect(list.map((v) => v.role)).toEqual(['latest', 'daily', 'weekly']);
    expect(await (await call(store, 'GET', `/backup/${ID}/latest`, undefined, auth)).json()).toMatchObject(sealed(5));
    expect(await (await call(store, 'GET', `/backup/${ID}/daily`, undefined, auth)).json()).toMatchObject(sealed(4));
    expect(await (await call(store, 'GET', `/backup/${ID}/weekly`, undefined, auth)).json()).toMatchObject(sealed(1));
    expect(list[2]!.updatedAt).toBe(new Date(T0).toISOString());

    // Never more than three versions on the server, whatever was written.
    expect([...keys].filter((k) => !k.endsWith(':meta'))).toHaveLength(3);

    // The weekly one changes only when the daily one being replaced is a week newer than it.
    await put(6, T0 + 3 * DAY);
    await put(7, T0 + 4 * DAY);
    await put(8, T0 + 9 * DAY);
    await put(9, T0 + 10 * DAY);
    expect(await (await call(store, 'GET', `/backup/${ID}/weekly`, undefined, auth)).json()).toMatchObject(sealed(1));
    await put(10, T0 + 12 * DAY);
    expect(await (await call(store, 'GET', `/backup/${ID}/weekly`, undefined, auth)).json()).toMatchObject(sealed(8));
    expect([...keys].filter((k) => !k.endsWith(':meta'))).toHaveLength(3);
  });

  it('deletes every version at once, and a repeated delete is harmless', async () => {
    const { store, keys } = trackedStore();
    let etag: string | undefined;
    for (let n = 1; n <= 4; n++) {
      etag = (await write(store, n, T0 + n * 30 * HOUR, etag)).etag;
    }
    expect(keys.size).toBeGreaterThan(2);
    expect((await call(store, 'DELETE', `/backup/${ID}`, undefined, auth)).status).toBe(204);
    expect(keys.size).toBe(0);
    expect((await call(store, 'DELETE', `/backup/${ID}`, undefined, auth)).status).toBe(204);
    expect((await call(store, 'GET', `/backup/${ID}`, undefined, auth)).status).toBe(404);
    expect((await call(store, 'GET', `/backup/${ID}/latest`, undefined, auth)).status).toBe(404);
  });

  it('refuses malformed ids, roles and bodies', async () => {
    const store = memoryRelayStore();
    expect((await call(store, 'PUT', '/backup/short', sealed(1), { ...auth, 'If-None-Match': '*' })).status).toBe(404);
    const headers = { ...auth, 'If-None-Match': '*' };
    expect((await call(store, 'PUT', `/backup/${ID}`, { ...sealed(1), v: 2 }, headers)).status).toBe(400);
    expect((await call(store, 'PUT', `/backup/${ID}`, { ...sealed(1), z: 'zip' }, headers)).status).toBe(400);
    expect((await call(store, 'PUT', `/backup/${ID}`, { ...sealed(1), ct: 'not base64!' }, headers)).status).toBe(400);
    expect((await call(store, 'PUT', `/backup/${ID}`, { v: 1, z: 'gzip' }, headers)).status).toBe(400);
    const first = await write(store, 1, T0);
    expect(first.res.status).toBe(200);
    expect((await call(store, 'GET', `/backup/${ID}/yearly`, undefined, auth)).status).toBe(404);
    expect((await call(store, 'POST', `/backup/${ID}`, sealed(1), auth)).status).toBe(405);
    expect((await call(store, 'PUT', `/backup/${ID}/latest`, sealed(1), auth)).status).toBe(405);
  });

  it('accepts a backup of years of days and a photo, but keeps its own limit apart from the channels', async () => {
    const store = memoryRelayStore();
    const big = { v: 1, z: 'gzip', iv: 'aXZpdml2aXZpdg', ct: 'A'.repeat(2_500_000) };
    expect((await call(store, 'PUT', `/backup/${ID}`, big, { ...auth, 'If-None-Match': '*' })).status).toBe(200);
    const huge = { ...big, ct: 'A'.repeat(3_200_000) };
    expect((await call(memoryRelayStore(), 'PUT', `/backup/${ID}`, huge, { ...auth, 'If-None-Match': '*' })).status).toBe(413);
    // The size a backup may have does not widen what a partner's summary may be.
    const channel = await call(
      store,
      'PUT',
      `/channel/${CHANNEL}`,
      { iv: 'aXY', ct: 'A'.repeat(500_000) },
      { Authorization: `Bearer ${WRITE_TOKEN}` },
    );
    expect(channel.status).toBe(413);
    // A declared length over the limit is refused before the body is read.
    const declared = await handleRelay(
      new Request(`${BASE}/backup/${ID}`, { method: 'PUT', headers: { ...auth, 'If-None-Match': '*', 'Content-Length': '9000000' }, body: '{}' }),
      memoryRelayStore(),
      '/api/partner',
      T0,
    );
    expect(declared.status).toBe(413);
  });
});
