import {
  accountIdFor,
  bodyHashOf,
  base64Of,
  type DeviceKeyPair,
  deviceKeyPairFrom,
  envelopeVersion,
  recoverySaltLength,
  signedHeaders,
  wrappedVaultKeyLength,
} from '@emi/crypto';

import type { AuthorizerEvent, HttpRequestEvent } from '../../src/api';
import type { StoredAccount } from '../../src/store/accounts';

/** Builders for a signed request, so no test writes an event or a header by hand. */

/** A key pair from a seed, so a failure names the same key every run. */
export function keyPairFromSeed(seed: number): DeviceKeyPair {
  return deviceKeyPairFrom(new Uint8Array(32).map((_, at) => (at * 7 + seed) % 256));
}

/** The registration body for a key pair, as the phone writes it. */
export function registrationBody(pair: DeviceKeyPair): string {
  return registrationBodyWithRecovery(pair);
}

export interface RequestParts {
  readonly method: string;
  readonly path: string;
  readonly body?: string;
  readonly instant: Date;
}

/** The four signed headers for those parts. */
export function headersFor(
  pair: DeviceKeyPair,
  parts: RequestParts,
): Readonly<Record<string, string>> {
  return signedHeaders(pair, {
    method: parts.method,
    path: parts.path,
    instant: parts.instant.toISOString(),
    bodyHash: bodyHashOf(parts.body ?? ''),
  });
}

/** An event carrying a body, as the api sends it to the function. */
export function requestEvent(
  parts: RequestParts,
  headers: Readonly<Record<string, string | undefined>>,
): HttpRequestEvent {
  const [rawPath, rawQueryString] = parts.path.split('?');

  return {
    rawPath: rawPath ?? parts.path,
    rawQueryString: rawQueryString ?? '',
    headers,
    requestContext: { http: { method: parts.method } },
    body: parts.body ?? '',
    isBase64Encoded: false,
  };
}

/** The same event without its body, as the api sends it to the authorizer. */
export function authorizerEvent(
  parts: RequestParts,
  headers: Readonly<Record<string, string | undefined>>,
): AuthorizerEvent {
  const event = requestEvent(parts, headers);

  return {
    rawPath: event.rawPath,
    rawQueryString: event.rawQueryString,
    headers: event.headers,
    requestContext: event.requestContext,
  };
}

/** A signed request, both halves of it, from one call. */
export function signedRequest(
  pair: DeviceKeyPair,
  parts: RequestParts,
): {
  headers: Readonly<Record<string, string>>;
  event: HttpRequestEvent;
  forAuthorizer: AuthorizerEvent;
} {
  const headers = headersFor(pair, parts);

  return {
    headers,
    event: requestEvent(parts, headers),
    forAuthorizer: authorizerEvent(parts, headers),
  };
}

/**
 * The event as the api sends it to the function behind the authorizer, which is the same event
 * with the account the authorizer allowed carried beside it.
 */
export function authorizedEvent(event: HttpRequestEvent, accountId: string): HttpRequestEvent {
  return {
    ...event,
    requestContext: {
      ...event.requestContext,
      authorizer: { lambda: { accountId } },
    },
  };
}

/**
 * An account as the register handler writes one, so the five tests that seed a store do not each
 * carry their own idea of what an account holds. A field added to `StoredAccount` is added here
 * once, and every seeded store gains it.
 */
export function anAccount(
  pair: { readonly publicKey: Uint8Array },
  createdAt: Date,
  held: Partial<StoredAccount> = {},
): StoredAccount {
  return {
    accountId: accountIdFor(pair.publicKey),
    publicKey: pair.publicKey,
    wrappedVaultKey: aWrappedVaultKey(pair.publicKey[0] ?? 1),
    recoverySalt: aRecoverySalt(pair.publicKey[1] ?? 2),
    createdAt: createdAt.toISOString(),
    recordCount: 0,
    ...held,
  };
}

/**
 * Bytes of the right shape for a wrapped vault key. The service never opens one, so what these
 * tests need is the shape and the length, and a real wrap costs a tenth of a second of Argon2id.
 * `packages/crypto/tests/recovery.test.ts` is where the real one is checked.
 */
export function aWrappedVaultKey(seed: number): Uint8Array {
  const wrapped = new Uint8Array(wrappedVaultKeyLength).map((_, at) => (at * 31 + seed) % 256);
  wrapped[0] = envelopeVersion;

  return wrapped;
}

export function aRecoverySalt(seed: number): Uint8Array {
  return new Uint8Array(recoverySaltLength).map((_, at) => ((at + 1) * 17 + seed) % 255 || 3);
}

/** The registration body a phone writes, with everything contract WIRE-1 asks for. */
export function registrationBodyWithRecovery(
  pair: DeviceKeyPair,
  held: Readonly<Record<string, unknown>> = {},
): string {
  return JSON.stringify({
    publicKey: base64Of(pair.publicKey),
    wrappedVaultKey: base64Of(aWrappedVaultKey(pair.publicKey[0] ?? 1)),
    recoverySalt: base64Of(aRecoverySalt(pair.publicKey[1] ?? 2)),
    ...held,
  });
}
