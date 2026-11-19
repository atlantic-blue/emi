import { payerDigestFor } from '@emi/crypto';

import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { EntitlementStore } from './entitlements';
import { payerNameIn } from './poolToken';
import type { WhatTheAccountPageReads } from './readSubscription';
import { type ReachesStripe, renewalOfSubscription } from './stripe';

/**
 * The press on Cancel renewal, and the press that turns it back on.
 *
 * The year she paid for is never touched. Stripe is told to stop at the end of the period, the
 * item is written with where that leaves her, and `paidUntil` stays exactly as the last event left
 * it, so a woman who cancels keeps every day she bought.
 *
 * A woman who paid with Stars cancels in Telegram, and a press that was never finished has no
 * subscription to stop, so both read as nothing here rather than as a call Stripe would refuse.
 */

/** The one field a body carries, which says what the renewal is to be. */
export const renewingField = 'renewing';

/** What a caller is told when no payer is read. It names neither the pool nor the claim. */
export const thatTokenChangesNothing = 'that token changes no subscription';

/** What a caller is told for a body that is not the one field. It names no field. */
export const thatBodySaysSomethingElse =
  'a body here says whether the renewal is on, and nothing else';

/** What a caller is told when nothing of this site renews under her digest. */
export const nothingHereRenews = 'no subscription of this site renews under that sign in';

/** What a caller is told when Stripe did not answer. It names no account and no key. */
export const theRenewalDidNotChange = 'the payment service did not answer, so nothing changed';

/** What the change is bound to: the payment partition, Stripe, the key, the pool and the clock. */
export interface WhatTheChangeNeeds {
  readonly entitlements: EntitlementStore;
  readonly reaches: ReachesStripe;
  /** The secret key, read from the parameter store rather than held as a value here. */
  readonly secretKey: () => Promise<string>;
  readonly poolId: string;
  readonly clock: () => Date;
}

/**
 * What the body asks for, or nothing at all where it asks for something else. A body carrying a
 * second field is read as nothing: this route takes one answer, and a field it ignored would be a
 * field a caller believed it had set.
 */
export function renewingIn(body: string): boolean | null {
  let read: unknown = null;

  try {
    read = JSON.parse(body);
  } catch {
    return null;
  }

  if (typeof read !== 'object' || read === null || Array.isArray(read)) {
    return null;
  }

  const fields = Object.keys(read);
  const said = (read as Readonly<Record<string, unknown>>)[renewingField];

  return fields.length === 1 && fields[0] === renewingField && typeof said === 'boolean'
    ? said
    : null;
}

/** One press, from the token to the subscription and back to the item. */
export async function changeRenewalFor(
  event: HttpRequestEvent,
  held: WhatTheChangeNeeds,
): Promise<HttpResponse> {
  const read = payerNameIn(event, held.poolId);

  if ('refusal' in read) {
    return refusal(401, thatTokenChangesNothing);
  }

  const renewing = renewingIn(bodyTextOf(event));

  if (renewing === null) {
    return refusal(400, thatBodySaysSomethingElse);
  }

  const payerDigest = payerDigestFor(held.poolId, read.userName);
  const now = held.clock();

  try {
    const paying = await held.entitlements.readEntitlement(payerDigest);

    if (paying?.route !== 'card' || paying.subscriptionRef === undefined) {
      return refusal(404, nothingHereRenews);
    }

    const secretKey = await held.secretKey();
    const renews = await renewalOfSubscription(
      { reaches: held.reaches, secretKey },
      paying.subscriptionRef,
      renewing,
    );
    const state = renews ? 'active' : 'cancelling';

    await held.entitlements.writeEntitlement({
      payerDigest,
      // Nothing from Stripe ordered this write, so it is ordered by the instant it ran at, the
      // same way the start is. The event of this change is made before it, so it is not refused.
      eventAt: Math.floor(now.getTime() / 1000),
      writtenAt: now.toISOString(),
      state,
    });

    return answer(200, {
      ...(paying.paidUntil === undefined ? {} : { paidUntil: paying.paidUntil }),
      state,
      route: paying.route,
    } satisfies WhatTheAccountPageReads);
  } catch {
    // Every way this stops reads the same to her, from a key the parameter store does not hold to
    // a subscription Stripe has already ended, so no caller learns which of them it was.
    return refusal(502, theRenewalDidNotChange);
  }
}

/** The route the api calls, with everything it needs bound to it. */
export function changeRenewal(
  held: WhatTheChangeNeeds,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => changeRenewalFor(event, held);
}
