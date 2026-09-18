import {
  accountIdFor,
  bytesFromBase64,
  deviceKeyLength,
  instantIsFresh,
  instantWindowSeconds,
  presentedSignatureIn,
  refusalMessages,
  signatureVerifies,
} from '@emi/crypto';

import {
  answer,
  bodyTextOf,
  type HttpRequestEvent,
  type HttpResponse,
  methodOf,
  refusal,
  signedPathOf,
} from '../api';
import { signedBodyRefusal } from '../auth/signedBody';
import type { AccountStore } from '../store/accounts';

/**
 * Contract WIRE-1, registration. This is the one call with no authorizer, because the account does
 * not exist yet and there is no stored key to check a signature against. The body is signed by the
 * key inside it, so the request asserts itself and nothing else.
 *
 * The wrapped vault key and the recovery salt join the body in feature 6 step 4. Until then an
 * account carries a public key and nothing more.
 */

/** Bytes. A body larger than this is refused before it is read, which is contract WIRE-1. */
export const maximumBodyBytes = 4096;

interface RegistrationBody {
  readonly publicKey?: unknown;
}

function publicKeyIn(body: string): Uint8Array | null {
  let parsed: RegistrationBody;

  try {
    parsed = JSON.parse(body) as RegistrationBody;
  } catch {
    return null;
  }

  if (typeof parsed?.publicKey !== 'string') {
    return null;
  }

  let bytes: Uint8Array;

  try {
    bytes = bytesFromBase64(parsed.publicKey);
  } catch {
    return null;
  }

  return bytes.length === deviceKeyLength ? bytes : null;
}

/**
 * She sends a public key, signed by the key she sent. The handler derives the account identifier
 * from that key, so she does not choose it and two women cannot land on one.
 */
export async function registerAccount(
  event: HttpRequestEvent,
  store: AccountStore,
  now: Date,
): Promise<HttpResponse> {
  const body = bodyTextOf(event);

  if (new TextEncoder().encode(body).length > maximumBodyBytes) {
    return refusal(413, `a registration body is at most ${maximumBodyBytes} bytes`);
  }

  const presented = presentedSignatureIn(event.headers);

  if (presented === null) {
    return refusal(403, refusalMessages['header-is-missing']);
  }

  if (!instantIsFresh(presented.instant, now)) {
    return refusal(403, refusalMessages['instant-is-not-fresh']);
  }

  const publicKey = publicKeyIn(body);

  if (publicKey === null) {
    return refusal(
      400,
      `a registration body holds a public key of ${deviceKeyLength} bytes, as base 64`,
    );
  }

  const bodyRefusal = signedBodyRefusal(event);

  if (bodyRefusal !== null) {
    return bodyRefusal;
  }

  const accountId = accountIdFor(publicKey);
  const signedByTheKeyItRegisters =
    presented.accountId === accountId &&
    signatureVerifies(presented, methodOf(event), signedPathOf(event), publicKey);

  if (!signedByTheKeyItRegisters) {
    return refusal(403, refusalMessages['signature-does-not-verify']);
  }

  const expiresAt = Math.floor(now.getTime() / 1000) + instantWindowSeconds;

  if (
    (await store.rememberSignature(accountId, presented.signature, expiresAt)) === 'seen-before'
  ) {
    return refusal(403, refusalMessages['signature-was-used-before']);
  }

  const created = await store.createAccount({
    accountId,
    publicKey,
    createdAt: now.toISOString(),
    recordCount: 0,
  });

  if (created === 'already-registered') {
    return refusal(409, 'that public key is registered already');
  }

  return answer(201, { accountId });
}

/** The route the api calls, with its storage bound to it. */
export function register(
  store: AccountStore,
  clock: () => Date = () => new Date(),
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => registerAccount(event, store, clock());
}
