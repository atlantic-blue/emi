import {
  accountIdFor,
  bytesFromBase64,
  deviceKeyLength,
  instantIsFresh,
  instantWindowSeconds,
  presentedSignatureIn,
  readWrappedVaultKey,
  recoverySaltLength,
  refusalMessages,
  signatureVerifies,
  wrappedVaultKeyLength,
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
 * She sends her wrapped vault key and her recovery salt with it. The service checks that each one
 * is the right shape and the right length and writes it down. It can do nothing else with either:
 * the key that opens the wrapped bytes is derived from 26 characters that exist on her paper and
 * nowhere on this side, and no part of them is in this request.
 */

/** Bytes. A body larger than this is refused before it is read, which is contract WIRE-1. */
export const maximumBodyBytes = 4096;

/**
 * The three fields a registration carries, and the whole of what Emi ever asks of her. There is no
 * email address, no telephone number and no name, and a field added here is a field a reviewer
 * sees in this type.
 */
interface RegistrationBody {
  readonly publicKey?: unknown;
  readonly wrappedVaultKey?: unknown;
  readonly recoverySalt?: unknown;
}

interface Registration {
  readonly publicKey: Uint8Array;
  readonly wrappedVaultKey: Uint8Array;
  readonly recoverySalt: Uint8Array;
}

function bytesOf(value: unknown): Uint8Array | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return bytesFromBase64(value);
  } catch {
    return null;
  }
}

function registrationIn(body: string): Registration | null {
  let parsed: RegistrationBody;

  try {
    parsed = JSON.parse(body) as RegistrationBody;
  } catch {
    return null;
  }

  const publicKey = bytesOf(parsed?.publicKey);
  const wrappedVaultKey = bytesOf(parsed?.wrappedVaultKey);
  const recoverySalt = bytesOf(parsed?.recoverySalt);

  if (publicKey === null || wrappedVaultKey === null || recoverySalt === null) {
    return null;
  }

  if (publicKey.length !== deviceKeyLength || recoverySalt.length !== recoverySaltLength) {
    return null;
  }

  // The shape of the wrapped key, which is the whole of what a service holding no key can check.
  // A length of its own makes that check worth something: nothing else fits in it.
  try {
    readWrappedVaultKey(wrappedVaultKey);
  } catch {
    return null;
  }

  // Sixteen zero bytes are what a generator that is not running gives back, and a salt every
  // account shared would mean one code derived one key for all of them.
  if (recoverySalt.every((byte) => byte === 0)) {
    return null;
  }

  return { publicKey, wrappedVaultKey, recoverySalt };
}

/**
 * She sends a public key, signed by the key she sent, with her wrapped vault key and her salt.
 * The handler derives the account identifier from that key, so she does not choose it and two
 * women cannot land on one.
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

  const registration = registrationIn(body);

  if (registration === null) {
    return refusal(
      400,
      `a registration body holds a public key of ${deviceKeyLength} bytes, a wrapped vault key of ${wrappedVaultKeyLength} bytes and a recovery salt of ${recoverySaltLength} bytes, each as base 64`,
    );
  }

  const bodyRefusal = signedBodyRefusal(event);

  if (bodyRefusal !== null) {
    return bodyRefusal;
  }

  const accountId = accountIdFor(registration.publicKey);
  const signedByTheKeyItRegisters =
    presented.accountId === accountId &&
    signatureVerifies(presented, methodOf(event), signedPathOf(event), registration.publicKey);

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
    publicKey: registration.publicKey,
    wrappedVaultKey: registration.wrappedVaultKey,
    recoverySalt: registration.recoverySalt,
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
