import { APP_NAME } from '../app/config';
import { randomBytes, type Bytes } from './crypto';

/**
 * Biometric unlock through WebAuthn with the PRF extension.
 * The platform authenticator (Face ID / Touch ID / Android biometrics / Windows Hello) returns a
 * 32-byte secret only after the person verifies; that secret unwraps the data key. Nothing is sent
 * to a server: the credential is used purely as a local key holder.
 *
 * A native build would use the Keychain / Keystore with biometric access control instead.
 */

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: BufferSource } } };

function toBytes(source: BufferSource): Bytes {
  const view = source instanceof ArrayBuffer ? new Uint8Array(source) : new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  return new Uint8Array(view);
}

export async function biometricsAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.isSecureContext || typeof PublicKeyCredential === 'undefined') return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export interface BiometricRegistration {
  credentialId: Bytes;
  prfSalt: Bytes;
  secret: Bytes;
}

async function requestSecret(credentialId: Bytes, prfSalt: Bytes): Promise<Bytes> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'required',
      timeout: 60_000,
      extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  const first = (assertion?.getClientExtensionResults() as PrfResults | undefined)?.prf?.results?.first;
  if (!first) throw new Error('PRF secret not available');
  return toBytes(first);
}

/** Creates a device-bound credential and returns the secret that will protect the data key. */
export async function registerBiometric(): Promise<BiometricRegistration> {
  const prfSalt = randomBytes(32);
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: APP_NAME },
      user: { id: randomBytes(16), name: 'cyclecare', displayName: APP_NAME },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      attestation: 'none',
      timeout: 60_000,
      extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error('Credential was not created');

  const credentialId = toBytes(credential.rawId);
  const prf = (credential.getClientExtensionResults() as PrfResults).prf;
  if (!prf?.enabled && !prf?.results?.first) throw new Error('PRF extension not supported by this authenticator');
  // Some authenticators return the secret at creation, others only on the first assertion.
  const secret = prf.results?.first ? toBytes(prf.results.first) : await requestSecret(credentialId, prfSalt);
  return { credentialId, prfSalt, secret };
}

export function biometricSecret(credentialId: Bytes, prfSalt: Bytes): Promise<Bytes> {
  return requestSecret(credentialId, prfSalt);
}
