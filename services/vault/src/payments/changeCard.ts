import { payerDigestFor } from '@emi/crypto';

import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { EntitlementStore, StoredEntitlement } from './entitlements';
import { payerNameIn } from './poolToken';
import {
  chargeTheCustomerTo,
  chargeTheSubscriptionTo,
  defaultPaymentMethodOf,
  detachPaymentMethod,
  type ReachesStripe,
  setupAsItStands,
  setupIntentFor,
  type WhatACallHolds,
  whatASetupCollected,
} from './stripe';

/**
 * The Change card row of her account page, as far as the server is concerned: a second setup to
 * collect a payment method, and a call that makes what she collected the one every charge goes to.
 *
 * The press and the confirmation are two calls because the confirmation happens in her browser,
 * between them. She presses, the page mounts the elements on the secret the press answers, Stripe
 * takes her card or her wallet, and the page then tells this service which setup it was.
 *
 * Nothing here takes a customer or a subscription from the caller. Both are read off the item
 * under her own payer digest, and the setup she names is read back from Stripe to see whose it is,
 * so a caller holding somebody else's setup identifier moves nobody's card.
 */

/** The path both calls of a card change answer on. */
export const paymentMethodPath = '/v1/payments/payment-method';

/** The one field the confirmation carries: the setup her browser finished. */
export const setupField = 'setupRef';

/** What a caller is told when no payer is read. Every refusal of the token reads the same. */
export const thatTokenChangesNoCard = 'that token changes no card';

/**
 * What a caller is told when nothing of hers is paying by card. A woman who never paid, a woman
 * paying with Stars and a woman whose record names no subscription all read this one sentence.
 */
export const nothingOfHersIsPaidByCard = 'nothing of yours is paid by card';

/** What a caller is told when the body is not the one field. It names the field and nothing else. */
export const theBodyACardChangeTakes = `a card change carries ${setupField}, as text, and nothing else`;

/** What a caller is told when the setup was made for somebody else. It names neither customer. */
export const thatSetupIsNotHers = 'that setup was not made for you';

/** What a caller is told when she has not finished the setup she named. It names no status. */
export const thatSetupIsNotFinished = 'that setup collected no payment method';

/** What a caller is told when Stripe did not answer. Nothing of hers moved when this is read. */
export const theCardWasNotChanged = 'the payment service did not answer, so the card is unchanged';

/** What the two calls are bound to: the payment partition, Stripe, the key and the pool. */
export interface WhatACardChangeNeeds {
  readonly entitlements: Pick<EntitlementStore, 'readEntitlement'>;
  readonly reaches: ReachesStripe;
  /** The secret key, read from the parameter store rather than held as a value here. */
  readonly secretKey: () => Promise<string>;
  /** The pool her token is minted by, which is half of what the payer digest is cut from. */
  readonly poolId: string;
}

/** What the page mounts the elements on, which is the whole of what the press answers. */
export interface WhatTheCardFormConfirms {
  readonly clientSecret: string;
}

/** What the page reads once the new payment method is the one every charge goes to. */
export interface WhatTheChangeConfirms {
  readonly changed: boolean;
}

/** The two objects of hers a card change moves, read off the item and never off the caller. */
interface WhatSheIsPayingWith {
  readonly payerRef: string;
  readonly subscriptionRef: string;
}

/**
 * The customer and the subscription of a woman paying by card, or nothing at all.
 *
 * Both are required. A change that moved the customer and not the subscription would leave the
 * yearly charge on the card she replaced, because the default of a subscription wins over the
 * default of its customer.
 */
function payingByCard(paying: StoredEntitlement | undefined): WhatSheIsPayingWith | null {
  if (paying === undefined || paying.route !== 'card') {
    return null;
  }

  const { payerRef, subscriptionRef } = paying;

  return payerRef === undefined || subscriptionRef === undefined
    ? null
    : { payerRef, subscriptionRef };
}

/** What she is paying by card with, or the refusal the caller reads instead. */
async function whatSheIsPayingWith(
  event: HttpRequestEvent,
  held: WhatACardChangeNeeds,
): Promise<WhatSheIsPayingWith | HttpResponse> {
  const read = payerNameIn(event, held.poolId);

  if ('refusal' in read) {
    return refusal(401, thatTokenChangesNoCard);
  }

  const paying = await held.entitlements.readEntitlement(
    payerDigestFor(held.poolId, read.userName),
  );
  const byCard = payingByCard(paying);

  return byCard ?? refusal(404, nothingOfHersIsPaidByCard);
}

/** The setup her browser finished, read out of the body and held to the one field it carries. */
export function setupRefIn(body: string): string | null {
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

  if (Object.keys(fields).some((name) => name !== setupField)) {
    return null;
  }

  const setupRef = fields[setupField];

  return typeof setupRef === 'string' && setupRef.length > 0 ? setupRef : null;
}

/**
 * The press on Change card. It makes a second setup for the customer she already pays under and
 * answers the secret her browser mounts the elements on, and it writes nothing: the item carries
 * no payment method, so a woman who presses and closes the page has changed nothing.
 */
export async function startCardChangeFor(
  event: HttpRequestEvent,
  held: WhatACardChangeNeeds,
): Promise<HttpResponse> {
  const byCard = await whatSheIsPayingWith(event, held);

  if ('statusCode' in byCard) {
    return byCard;
  }

  try {
    const paying: WhatACallHolds = { reaches: held.reaches, secretKey: await held.secretKey() };
    const setup = await setupIntentFor(paying, byCard.payerRef);

    return answer(200, { clientSecret: setup.clientSecret } satisfies WhatTheCardFormConfirms);
  } catch {
    // Every way this stops reads the same to her, from a key the parameter store does not hold to
    // a card network that is down, so no caller learns which of them it was.
    return refusal(502, theCardWasNotChanged);
  }
}

/**
 * The setup she finished, made the default on the customer and on the subscription, and then the
 * old payment method taken off the customer.
 *
 * The order is the whole of the safety. The new default is in place before the old one is
 * detached, so a detach that fails leaves her paying with the card she just gave rather than with
 * nothing at all.
 */
export async function finishCardChangeFor(
  event: HttpRequestEvent,
  held: WhatACardChangeNeeds,
): Promise<HttpResponse> {
  const byCard = await whatSheIsPayingWith(event, held);

  if ('statusCode' in byCard) {
    return byCard;
  }

  const setupRef = setupRefIn(bodyTextOf(event));

  if (setupRef === null) {
    return refusal(400, theBodyACardChangeTakes);
  }

  try {
    const paying: WhatACallHolds = { reaches: held.reaches, secretKey: await held.secretKey() };
    const setup = whatASetupCollected(await setupAsItStands(paying, setupRef), byCard.payerRef);

    if ('refusal' in setup) {
      return setup.refusal === 'another-customer'
        ? refusal(403, thatSetupIsNotHers)
        : refusal(400, thatSetupIsNotFinished);
    }

    const collected = setup.paymentMethodRef;
    const wasCharged = await defaultPaymentMethodOf(paying, byCard.payerRef);

    await chargeTheCustomerTo(paying, byCard.payerRef, collected);
    await chargeTheSubscriptionTo(paying, byCard.subscriptionRef, collected);

    // A woman who confirmed the card she was already paying with keeps it. Detaching here would
    // take away the one payment method she has.
    if (wasCharged !== null && wasCharged !== collected) {
      // The card is already changed by this line, so a detach that fails leaves a card on file
      // and leaves nothing broken. Answering a failure here would tell her a change that worked
      // did not, and she would press again, which detaches nothing the second time either.
      await detachPaymentMethod(paying, wasCharged).catch(() => undefined);
    }

    return answer(200, { changed: true } satisfies WhatTheChangeConfirms);
  } catch {
    return refusal(502, theCardWasNotChanged);
  }
}

/** The press, with everything it needs bound to it. */
export function startCardChange(
  held: WhatACardChangeNeeds,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => startCardChangeFor(event, held);
}

/** The confirmation, with everything it needs bound to it. */
export function finishCardChange(
  held: WhatACardChangeNeeds,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => finishCardChangeFor(event, held);
}
