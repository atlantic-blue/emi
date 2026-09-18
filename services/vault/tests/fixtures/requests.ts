import {
  bodyHashOf,
  base64Of,
  type DeviceKeyPair,
  deviceKeyPairFrom,
  signedHeaders,
} from '@emi/crypto';

import type { AuthorizerEvent, HttpRequestEvent } from '../../src/api';

/** Builders for a signed request, so no test writes an event or a header by hand. */

/** A key pair from a seed, so a failure names the same key every run. */
export function keyPairFromSeed(seed: number): DeviceKeyPair {
  return deviceKeyPairFrom(new Uint8Array(32).map((_, at) => (at * 7 + seed) % 256));
}

/** The registration body for a key pair, as the phone writes it. */
export function registrationBody(pair: DeviceKeyPair): string {
  return JSON.stringify({ publicKey: base64Of(pair.publicKey) });
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
