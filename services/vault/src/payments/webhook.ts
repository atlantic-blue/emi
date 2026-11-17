import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import { checkedPayerDigest, type EntitlementStore } from './entitlements';
import { payerDigestOfCustomer, type ReachesStripe } from './stripe';
import {
  moneyEventIn,
  readsTheItemFirst,
  whatTheEventWrites,
  type MoneyEvent,
} from './stripeEvents';
import { headerRefusalOf, signatureHeader, signatureRefusalOf } from './stripeSignature';

/**
 * The deliveries of Stripe, which are the only thing that writes a paid until date.
 *
 * It is the one route of the money with no authorizer, because Stripe holds no token of ours. What
 * stands in its place is the signature: the header is verified against the signing secret before
 * one field of the body is read, and a body that fails that check is written nowhere.
 *
 * Every answer is the same shape whatever happened, and none of them names an account.
 */

/** The path Stripe is given as the endpoint of this account. */
export const webhookPath = '/v1/payments/webhook';

/** What a delivery nobody signed is told. It says nothing about which part of the header failed. */
export const thatDeliveryIsNotSigned = 'that delivery carries no signature of this account';

/** What a delivery this service cannot read is told. The body stays out of the message. */
export const thatDeliveryCannotBeRead = 'that delivery carries no event this service can read';

/** What a delivery is told when the secret or Stripe could not be reached, so Stripe sends again. */
export const sendThatDeliveryAgain = 'that delivery was not read, so send it again';

/** What the webhook is bound to: the payment partition, Stripe, the two secrets and the clock. */
export interface WhatTheWebhookNeeds {
  readonly entitlements: EntitlementStore;
  readonly reaches: ReachesStripe;
  /** The signing secret, read from the parameter store rather than held as a value here. */
  readonly signingSecret: () => Promise<string>;
  /** The secret key, which reads the customer of an event and nothing else. */
  readonly secretKey: () => Promise<string>;
  readonly clock: () => Date;
}

/** What a caller reads back: whether the delivery moved the item. */
export interface WhatOneDeliveryDid {
  readonly written: boolean;
}

const nothingWasWritten = answer(200, { written: false } satisfies WhatOneDeliveryDid);

async function writeTheEvent(
  read: MoneyEvent,
  payerDigest: string,
  held: WhatTheWebhookNeeds,
  now: Date,
): Promise<HttpResponse> {
  const heldUntil = readsTheItemFirst(read.type)
    ? (await held.entitlements.readEntitlement(payerDigest))?.paidUntil
    : undefined;

  const outcome = await held.entitlements.writeEntitlement({
    payerDigest,
    writtenAt: now.toISOString(),
    ...whatTheEventWrites(read, heldUntil, now),
  });

  return answer(200, { written: outcome === 'written' } satisfies WhatOneDeliveryDid);
}

/**
 * One delivery, from the header to the item. Nothing of the body is read until the signature
 * holds, and an event this service does not know is taken and dropped.
 */
export async function webhookFor(
  event: HttpRequestEvent,
  held: WhatTheWebhookNeeds,
): Promise<HttpResponse> {
  const presented = event.headers[signatureHeader];
  const body = bodyTextOf(event);
  const now = held.clock();

  // The shape of the header is read first, because that needs no secret: a request nothing signed
  // is then refused without a read of the parameter store and without a field of the body parsed.
  if (headerRefusalOf(presented) !== null) {
    return refusal(400, thatDeliveryIsNotSigned);
  }

  let signingSecret: string;

  try {
    signingSecret = await held.signingSecret();
  } catch {
    // Answered as a failure rather than as a refusal, because Stripe sends a delivery again after
    // one, and the secret may be written a minute after this container started.
    return refusal(500, sendThatDeliveryAgain);
  }

  if (signatureRefusalOf(presented, body, signingSecret, now) !== null) {
    return refusal(400, thatDeliveryIsNotSigned);
  }

  const reading = moneyEventIn(body);

  if ('refusal' in reading) {
    return refusal(400, thatDeliveryCannotBeRead);
  }

  if ('dropped' in reading) {
    return nothingWasWritten;
  }

  let payerDigest: string | null;

  try {
    payerDigest = await payerDigestOfCustomer(
      { reaches: held.reaches, secretKey: await held.secretKey() },
      reading.read.customerRef,
    );
  } catch {
    return refusal(500, sendThatDeliveryAgain);
  }

  if (payerDigest === null) {
    // A customer of this account that no route of Emi made. Nothing was ever written under it, and
    // sending the delivery again would not change that, so it is answered as taken and dropped.
    return nothingWasWritten;
  }

  try {
    checkedPayerDigest(payerDigest);
  } catch {
    return nothingWasWritten;
  }

  return writeTheEvent(reading.read, payerDigest, held, now);
}

/** The route the api calls, with everything it needs bound to it. */
export function webhook(
  held: WhatTheWebhookNeeds,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => webhookFor(event, held);
}
