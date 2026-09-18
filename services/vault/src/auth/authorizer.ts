import {
  decoyPublicKey,
  instantIsFresh,
  instantWindowSeconds,
  presentedSignatureIn,
  signatureVerifies,
} from '@emi/crypto';

import {
  type AuthorizerEvent,
  type AuthorizerResult,
  methodOf,
  refused,
  signedPathOf,
} from '../api';
import type { AccountStore } from '../store/accounts';

/**
 * Contract AUTH-1. Every request but registration passes through here first, and the function
 * behind the api never sees one that did not.
 */

/** What an allowed request hands on to the function: the account, and nothing else about her. */
export const accountIdContextKey = 'accountId';

/**
 * The order of the checks is the contract. The signature is verified before the replay store is
 * written, so a caller who cannot sign can never fill the store. An unknown account is verified
 * against a decoy key instead of being answered early, so the work, and therefore the time, is the
 * same as a bad signature on an account that does exist.
 */
export async function authorizeRequest(
  event: AuthorizerEvent,
  store: AccountStore,
  now: Date,
): Promise<AuthorizerResult> {
  const presented = presentedSignatureIn(event.headers);

  if (presented === null || !instantIsFresh(presented.instant, now)) {
    return refused;
  }

  const account = await store.readAccount(presented.accountId);
  const publicKey = account?.publicKey ?? decoyPublicKey;
  const verified = signatureVerifies(presented, methodOf(event), signedPathOf(event), publicKey);

  if (!verified || account === undefined) {
    return refused;
  }

  const expiresAt = Math.floor(now.getTime() / 1000) + instantWindowSeconds;
  const remembered = await store.rememberSignature(
    account.accountId,
    presented.signature,
    expiresAt,
  );

  if (remembered === 'seen-before') {
    return refused;
  }

  return { isAuthorized: true, context: { [accountIdContextKey]: account.accountId } };
}

/** The function the api calls, with its storage bound to it. */
export function authorizer(
  store: AccountStore,
  clock: () => Date = () => new Date(),
): (event: AuthorizerEvent) => Promise<AuthorizerResult> {
  return (event) => authorizeRequest(event, store, clock());
}
