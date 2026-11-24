import { refusalMessages, transactionDigestFor } from '@emi/crypto';

import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import { authorizedAccountIn } from '../auth/authorizer';
import { signedBodyRefusal } from '../auth/signedBody';
import type { SubscriptionStore } from '../store/accounts';
import {
  AppStoreError,
  credentialIn,
  type ReachesTheAppStore,
  theAppleStore,
  type TheSubscriptionAppleHolds,
  theSubscriptionFor,
} from './appStore';

/**
 * The filing of a purchase she made in the App Store, which is contract PAY-3.
 *
 * The phone saying it paid is not evidence, so the body carries one transaction identifier and
 * nothing the server reads as a date. Apple is asked, every time, before one field is written. What
 * is written down is the answer Apple gave: the instant she is paid until, where the subscription
 * stands, which product she holds, which store took the money, and when the server asked.
 *
 * The request is signed by her device key under contract AUTH-1, so the account is known without a
 * sign in and without a token. The pointer item of contract PAY-9 is claimed before the date is
 * written, so one purchase pays for one vault.
 */

/** The path the phone files a transaction on. */
export const storeSubscriptionPath = '/v1/payments/store';

/** Bytes. A body larger than this is refused before it is read. */
export const maximumFilingBodyBytes = 1024;

/**
 * The shape a transaction identifier is held to. It travels inside the address of an Apple call and
 * into the digest the pointer item is named by, so it is bounded and it carries no separator.
 */
export const transactionIdPattern = /^[0-9A-Za-z._-]{1,64}$/;

/** What a caller is told when the body carries no identifier of that shape. */
export const thatIsNoTransaction = 'a filing carries one store transaction identifier';

/** What a caller is told when the App Store holds no subscription for the transaction it sent. */
export const theStoreHoldsNoSuchSubscription =
  'the App Store holds no subscription Emi sells for that transaction';

/**
 * What the second account to file one purchase is told. It is the sentence the screen shows her,
 * because a refusal she reads as a fault is a refusal she cannot act on.
 */
export const thatPurchaseBelongsToAnotherAccount =
  'that subscription belongs to another Emi account';

/** What a caller is told when Apple was not reached, so the phone files again rather than giving up. */
export const nothingWasFiled = 'the App Store was not reached, so nothing was written';

/** What the filing is bound to: the account partition, Apple, the credential and the clock. */
export interface WhatTheFilingNeeds {
  readonly store: SubscriptionStore;
  readonly reaches: ReachesTheAppStore;
  /** The store credential, read from the parameter store rather than held as a value here. */
  readonly apiKey: () => Promise<string>;
  readonly clock: () => Date;
}

/** What the phone reads back: the instant she is paid until, and where that leaves her. */
export interface WhatTheFilingWrote {
  readonly subscribedUntil: string;
  readonly state: string;
  /** Whether this filing moved the account item, which an older event leaves false. */
  readonly written: boolean;
}

/**
 * The identifier in the body, or nothing at all when the body carries none of that shape. Every
 * other field of the body is ignored rather than refused: a phone that sends a date sends it to
 * nowhere, because no date the phone writes is read here.
 */
export function transactionIdIn(body: string): string | null {
  let parsed: { readonly transactionId?: unknown };

  try {
    parsed = JSON.parse(body) as { readonly transactionId?: unknown };
  } catch {
    return null;
  }

  const held = parsed?.transactionId;

  return typeof held === 'string' && transactionIdPattern.test(held) ? held : null;
}

/** The status a refusal of Apple's answer is told to the phone as. */
function refusalFor(thrown: AppStoreError): HttpResponse {
  const noSuchSubscription =
    thrown.refusal === 'that-transaction-is-in-no-environment' ||
    thrown.refusal === 'the-product-is-not-one-emi-sells' ||
    thrown.refusal === 'the-answer-names-no-subscription' ||
    thrown.refusal === 'the-answer-names-another-application';

  // Everything else reads the same to her, from a credential the parameter store does not hold yet
  // to an App Store that is down, so no caller learns which of them it was.
  return noSuchSubscription
    ? refusal(400, theStoreHoldsNoSuchSubscription)
    : refusal(502, nothingWasFiled);
}

/**
 * One filing, from the signature to the two items. Apple is asked first, the pointer is claimed
 * second, and the date is written last, so nothing at all is written for a transaction Apple does
 * not stand behind.
 */
export async function fileTransactionFor(
  event: HttpRequestEvent,
  held: WhatTheFilingNeeds,
): Promise<HttpResponse> {
  const accountId = authorizedAccountIn(event);

  if (accountId === null) {
    return refusal(403, refusalMessages['signature-does-not-verify']);
  }

  const body = bodyTextOf(event);

  if (new TextEncoder().encode(body).length > maximumFilingBodyBytes) {
    return refusal(413, `a filing body is at most ${maximumFilingBodyBytes} bytes`);
  }

  const bodyRefusal = signedBodyRefusal(event);

  if (bodyRefusal !== null) {
    return bodyRefusal;
  }

  const transactionId = transactionIdIn(body);

  if (transactionId === null) {
    return refusal(400, thatIsNoTransaction);
  }

  const now = held.clock();
  let subscription: TheSubscriptionAppleHolds;

  try {
    subscription = await theSubscriptionFor(
      { reaches: held.reaches, credential: credentialIn(await held.apiKey()), now },
      transactionId,
    );
  } catch (thrown) {
    return thrown instanceof AppStoreError ? refusalFor(thrown) : refusal(502, nothingWasFiled);
  }

  const claimed = await held.store.claimTransaction(
    transactionDigestFor(theAppleStore, subscription.originalTransactionId),
    accountId,
  );

  if (claimed === 'another-account') {
    return refusal(409, thatPurchaseBelongsToAnotherAccount);
  }

  const outcome = await held.store.writeSubscription({
    accountId,
    subscribedUntil: subscription.paidUntil,
    subscriptionStore: theAppleStore,
    subscriptionTransaction: subscription.originalTransactionId,
    subscriptionCheckedAt: now.toISOString(),
    subscriptionState: subscription.state,
    // The instant Apple signed what it just said, and never the instant of this request. A
    // notification Apple signed later therefore wins over this filing, whichever arrives first.
    subscriptionEventAt: subscription.signedAt,
    subscriptionPlan: subscription.productId,
  });

  return answer(200, {
    subscribedUntil: subscription.paidUntil,
    state: subscription.state,
    written: outcome === 'written',
  } satisfies WhatTheFilingWrote);
}

/** The route the api calls, with everything it needs bound to it. */
export function fileTransaction(
  held: WhatTheFilingNeeds,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => fileTransactionFor(event, held);
}
