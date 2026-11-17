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
