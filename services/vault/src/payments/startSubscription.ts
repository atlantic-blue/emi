import { payerDigestFor } from '@emi/crypto';

import { answer, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { EntitlementStore } from './entitlements';
import { payerNameIn } from './poolToken';
import { customerFor, type ReachesStripe, setupIntentFor } from './stripe';

/**
 * The press on Buy Emi, as far as the server is concerned: one customer, one setup to collect her
 * payment method, and one line in the payment partition saying a digest is paying.
 *
 * It writes no date. She is paid until nothing yet, and only an event from Stripe moves that, so a
 * woman who reaches this route and closes the page is left with an item that opens nothing.
 *
 * The payer digest is cut from the claim of her token, so this route needs no link endpoint and
 * learns nothing about her beyond which pool user is paying.
 */

/** The path the site asks to start a subscription on. */
export const subscriptionPath = '/v1/payments/subscription';

/**
 * What a caller is told when no payer is read. Every refusal reads the same, from a token of
 * another pool to a token carrying no user name, so nobody can ask this api which check said no.
 */
export const thatTokenStartsNothing = 'that token starts no subscription';

/** What a caller is told when Stripe did not answer with the objects. It names no account. */
export const nothingWasStarted = 'the payment service did not answer, so nothing was started';

/** What the start is bound to: the payment partition, Stripe, the key, the pool and the clock. */
export interface WhatTheStartNeeds {
  readonly entitlements: EntitlementStore;
  readonly reaches: ReachesStripe;
  /** The secret key, read from the parameter store rather than held as a value here. */
  readonly secretKey: () => Promise<string>;
  /** The pool her token is minted by, which is half of what the payer digest is cut from. */
  readonly poolId: string;
  readonly clock: () => Date;
}

/** What the site reads back: the secret both elements of the page are mounted on. */
export interface WhatTheSiteConfirms {
  readonly clientSecret: string;
}

/**
 * One press, from the token to the item. The customer is made once for a digest, so a woman who
 * presses twice pays under one customer and confirms whichever setup she finishes.
 */
export async function startSubscriptionFor(
  event: HttpRequestEvent,
  held: WhatTheStartNeeds,
): Promise<HttpResponse> {
  const read = payerNameIn(event, held.poolId);

  if ('refusal' in read) {
    return refusal(401, thatTokenStartsNothing);
  }

  const payerDigest = payerDigestFor(held.poolId, read.userName);
  const now = held.clock();

  try {
    const secretKey = await held.secretKey();
    const paying = { reaches: held.reaches, secretKey };
    const alreadyPaying = await held.entitlements.readEntitlement(payerDigest);
    const payerRef = alreadyPaying?.payerRef ?? (await customerFor(paying, payerDigest));
    const setup = await setupIntentFor(paying, payerRef);

    await held.entitlements.writeEntitlement({
      payerDigest,
      // Nothing from Stripe ordered this write, so it is ordered by the instant it ran at. Every
      // event of this subscription is made after the press, so none of them is refused as older.
      eventAt: Math.floor(now.getTime() / 1000),
      writtenAt: now.toISOString(),
      payerRef,
    });

    return answer(200, { clientSecret: setup.clientSecret } satisfies WhatTheSiteConfirms);
  } catch {
    // Every way this stops reads the same to her, from a key the parameter store does not hold
    // yet to a card network that is down, so no caller learns which of them it was.
    return refusal(502, nothingWasStarted);
  }
}

/** The route the api calls, with everything it needs bound to it. */
export function startSubscription(
  held: WhatTheStartNeeds,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => startSubscriptionFor(event, held);
}
