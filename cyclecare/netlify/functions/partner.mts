/**
 * Netlify Function hosting the partner relay at /api/partner/* on the app's own domain,
 * so the Content-Security-Policy can stay `connect-src 'self'`.
 * Storage: Netlify Blobs (strong consistency, so a pairing step is visible to the next request at once).
 * The relay only ever stores public keys and ciphertext; see server/relay.ts.
 */
import { getStore } from '@netlify/blobs';
import { handleRelay, type RelayStore } from '../../server/relay';

function blobStore(): RelayStore {
  const store = getStore({ name: 'cyclecare-partner', consistency: 'strong' });
  return {
    get: (key) => store.get(key, { type: 'json' }),
    set: async (key, value) => {
      await store.setJSON(key, value);
    },
    delete: (key) => store.delete(key),
  };
}

export default (req: Request): Promise<Response> => handleRelay(req, blobStore(), '/api/partner');

export const config = { path: ['/api/partner', '/api/partner/*'] };
