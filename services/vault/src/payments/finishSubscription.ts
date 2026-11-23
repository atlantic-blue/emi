import { payerDigestFor } from '@emi/crypto';

import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import { setupField } from './changeCard';
import type { EntitlementState, EntitlementStore, StoredEntitlement } from './entitlements';
import { payerNameIn } from './poolToken';
import {
  chargeTheCustomerTo,
  setupAsItStands,
  type ReachesStripe,
  theBlackFridayOffer,
  type WhatACallHolds,
  whatASetupCollected,
  yearlySubscriptionFor,
} from './stripe';

/**
 * The second half of the press on Buy Emi: the setup her browser finished, made the card every
 * invoice goes to, and the yearly subscription created on the customer the press already made.
 *
 * The two halves are two calls because the card is taken in her browser between them. The first
 * answers the secret her browser confirms on, and this one is told which setup that was.
 *
 * Nothing here takes a customer from the caller. It is read off the item under her own payer
 * digest, and the setup she names is read back from Stripe to see whose it is, so a caller holding
 * somebody else's setup identifier buys nobody a subscription.
 *
 * It writes no date. The deliveries of Stripe are the only thing that writes `paidUntil`, so a
 * woman who closes the page here is paid until nothing until the first event arrives.
 *
 * The offer the page was showing rides in the body, and it buys a coupon rather than an amount.
 * The discount is worked out from the one offer this service sells and the instant the create is
 * made at, so a caller can ask for the offer and never for a price.
 *
 * The free month belongs to the one price. A subscription bought on the offer is charged at once,
 * so this call answers the secret her browser confirms that charge on, and she is paid until
 * nothing until the payment lands.
 */

/** What a caller is told when no payer is read. It reads as the press on the same path does. */
export const thatTokenFinishesNothing = 'that token starts no subscription';

/**
 * What a caller is told when nothing of hers was started. A woman who never pressed Buy Emi and a
 * woman whose record names no customer read the same sentence.
 */
export const nothingOfHersWasStarted = 'nothing of yours has started a payment yet';

/** The field the offer travels in. The page sends it only when it drew the offer to her. */
export const offerField = 'offer';

/** What a caller is told when the body is not those fields. It names them and nothing else. */
export const theBodyASubscriptionTakes =
  `a subscription carries ${setupField}, as text, and may carry ` +
  `${offerField}, which is "${theBlackFridayOffer}"`;

/**
 * What a caller is told about a setup that buys her nothing. A setup made for another customer and
 * a setup she never finished read the same, so nobody learns which check said no.
 */
export const thatSetupStartsNothing = 'that setup starts no subscription';

/** What a caller is told when Stripe did not answer. She is charged nothing when this is read. */
export const nothingWasCreated =
  'the payment service did not answer, so no subscription was created';

/** What the page reads once she is on the free month of a subscription. */
export interface WhatTheSubscriptionConfirms {
  readonly started: boolean;
  /**
   * The secret her browser confirms the first charge on, where one is waiting. It is absent on the
   * one price, which pays nothing for a month, and on a press that bought her nothing new.
   */
  readonly paymentSecret?: string;
}

/** What the call is bound to: the payment partition, Stripe, the key, the pool and the clock. */
export interface WhatFinishingNeeds {
  readonly entitlements: Pick<EntitlementStore, 'readEntitlement'>;
  readonly reaches: ReachesStripe;
  /** The secret key, read from the parameter store rather than held as a value here. */
  readonly secretKey: () => Promise<string>;
  /** The pool her token is minted by, which is half of what the payer digest is cut from. */
  readonly poolId: string;
  /** Read once a press arrives, because it is what says whether an offer is still open. */
  readonly clock: () => Date;
}

/** What one call carries: the setup her browser finished, and the offer she arrived with. */
export interface WhatASubscriptionCarries {
  readonly setupRef: string;
  readonly offer?: string;
}

/**
 * The two fields this call takes, read off the body, or nothing at all where the body is
 * something else.
 *
 * The offer is held to the one value rather than handed on, so a caller naming a discount of its
 * own is refused here and Stripe is never reached. A card change reads its own body with its own
 * function, which takes no offer, so neither call can be made looser by the other.
 */
export function whatASubscriptionCarries(body: string): WhatASubscriptionCarries | null {
  let read: unknown;

  try {
    read = JSON.parse(body);
  } catch {
    return null;
  }

  if (typeof read !== 'object' || read === null || Array.isArray(read)) {
    return null;
  }

  const fields = read as Readonly<Record<string, unknown>>;

  if (Object.keys(fields).some((name) => name !== setupField && name !== offerField)) {
    return null;
  }

  const setupRef = fields[setupField];
  const offer = fields[offerField];

  if (typeof setupRef !== 'string' || setupRef.length === 0) {
    return null;
  }

  if (offer === undefined) {
    return { setupRef };
  }

  return offer === theBlackFridayOffer ? { setupRef, offer } : null;
}

/**
 * The states a subscription she already holds is still being paid under. `cancelling` is the
 * renewal stopped while the year she paid for runs, so a second subscription made for her then
 * would charge her twice for one year.
 */
export const theStatesThatStillPay: readonly EntitlementState[] = ['active', 'cancelling'];

/** Whether the item already names a subscription that is running, which this call leaves alone. */
export function alreadyPaying(paying: StoredEntitlement): boolean {
  return (
    paying.subscriptionRef !== undefined &&
    paying.state !== undefined &&
    theStatesThatStillPay.includes(paying.state)
  );
}

/**
 * The key the create carries, which is cut from the setup she confirmed. A press she makes twice
 * and a retry of one press both name the same setup, so Stripe answers both with one subscription.
 */
export function oneSubscriptionPer(setupRef: string): string {
  return `the-subscription-of-${setupRef}`;
}

/**
 * One press, finished. The order is the whole of the safety: the card is the default on the
 * customer before the subscription exists, so the subscription takes that card as its own and the
 * renewal a year later is charged to it.
 */
export async function finishSubscriptionFor(
  event: HttpRequestEvent,
  held: WhatFinishingNeeds,
): Promise<HttpResponse> {
  const read = payerNameIn(event, held.poolId);

  if ('refusal' in read) {
    return refusal(401, thatTokenFinishesNothing);
  }

  const payerDigest = payerDigestFor(held.poolId, read.userName);
  const paying = await held.entitlements.readEntitlement(payerDigest);
  const payerRef = paying?.payerRef;

  if (paying === undefined || payerRef === undefined) {
    return refusal(404, nothingOfHersWasStarted);
  }

  const carried = whatASubscriptionCarries(bodyTextOf(event));

  if (carried === null) {
    return refusal(400, theBodyASubscriptionTakes);
  }

  const { setupRef } = carried;

  if (alreadyPaying(paying)) {
    return answer(200, { started: true } satisfies WhatTheSubscriptionConfirms);
  }

  try {
    const calling: WhatACallHolds = { reaches: held.reaches, secretKey: await held.secretKey() };
    const collected = whatASetupCollected(await setupAsItStands(calling, setupRef), payerRef);

    if ('refusal' in collected) {
      return refusal(403, thatSetupStartsNothing);
    }

    await chargeTheCustomerTo(calling, payerRef, collected.paymentMethodRef);

    const made = await yearlySubscriptionFor(calling, {
      customerRef: payerRef,
      payerDigest,
      oneOfAKind: oneSubscriptionPer(setupRef),
      ...(carried.offer === undefined ? {} : { offer: carried.offer }),
      now: held.clock(),
    });

    return answer(200, {
      started: true,
      ...(made.paymentSecret === null ? {} : { paymentSecret: made.paymentSecret }),
    } satisfies WhatTheSubscriptionConfirms);
  } catch {
    // Every way this stops reads the same to her, from a key the parameter store does not hold
    // yet to a card network that is down, so no caller learns which of them it was.
    return refusal(502, nothingWasCreated);
  }
}

/** The route the api calls, with everything it needs bound to it. */
export function finishSubscription(
  held: WhatFinishingNeeds,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => finishSubscriptionFor(event, held);
}
