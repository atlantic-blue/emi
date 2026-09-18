import { bodyHashOf, signedHeaders } from '@emi/crypto';

import type { DeviceKey } from './deviceKey';

/**
 * What the phone puts on a request. Every call to the vault carries these, including the one that
 * registers the account, which is signed by the key it is registering.
 */

/** A request as the phone has it, before it is signed. */
export interface OutgoingRequest {
  readonly method: string;
  readonly path: string;
  readonly body?: string;
}

/**
 * The headers for that request, signed at that instant. The instant is passed in rather than read
 * here, so the caller owns the clock and a test can sign for a moment that has gone.
 */
export function signRequestHeaders(
  key: DeviceKey,
  request: OutgoingRequest,
  instant: Date,
): Readonly<Record<string, string>> {
  return signedHeaders(key, {
    method: request.method,
    path: request.path,
    instant: instant.toISOString(),
    bodyHash: bodyHashOf(request.body ?? ''),
  });
}
