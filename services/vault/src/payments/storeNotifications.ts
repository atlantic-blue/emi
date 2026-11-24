import { transactionDigestFor } from '@emi/crypto';

import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { PurchasePointerStore, SubscriptionStore } from '../store/accounts';
import {
  type StoreEnvironment,
  theAppleStore,
  theProductsOnSale,
  type TheTransactionAppleSigned,
  transactionAppleSigned,
} from './appStore';
import { payloadSignedByApple } from './signedByApple';
import {
  type NotificationTheRouteReads,
  readsThisNotification,
  whatTheNotificationWrites,
} from './storeEvents';

/**
 * The notifications of the App Store, version 2, which are how the server learns about a renewal, a
 * refund and a lapse while nothing of Emi is running on her phone.
 *
 * It is the one route of the store with no authorizer, because Apple holds no token of this
 * account. What stands in its place is the signature: the chain of certificates on the body is
 * verified against the pinned root before one field of the body is read, and a body that fails that
 * check is written nowhere.
 *
 * A notification names a transaction and never an account, so the pointer item of contract PAY-9 is
 * what turns one into the other. Every write is conditional on a newer event instant, because Apple
 * retries a notification five times over three days and a retried expiry can arrive after the
 * renewal that followed it.
 *
 * Every answer is the same shape whatever happened, and none of them names an account.
 */

/** The path App Store Connect is given as the notification address of this application. */
export const storeNotificationsPath = '/v1/payments/store/notifications';

/**
 * Bytes. A notification carries a chain of three certificates twice over, once for the body and
 * once for the transaction inside it, so the bound is generous. A body larger than this is refused
 * before anything reads it.
 */
export const maximumNotificationBodyBytes = 32 * 1024;

/** What a body nobody signed is told. It says nothing about which part of the check failed. */
export const thatNotificationIsNotSigned =
  'that notification carries no signature of the App Store';

/** What a body Apple signed is told when this service can read nothing in it. */
export const thatNotificationCannotBeRead =
  'that notification carries nothing this service can read';

/** What a notification is told when the table could not be reached, so the App Store sends again. */
export const sendThatNotificationAgain = 'that notification was not written, so send it again';

/** What the route is bound to: the account partition, the pinned roots, and the clock. */
export interface WhatTheNotificationsNeed {
  readonly store: SubscriptionStore & PurchasePointerStore;
  /** The roots a chain must reach, passed in so a test stands up a chain of its own. */
  readonly roots: readonly string[];
  readonly clock: () => Date;
}

/** What a caller reads back: whether this notification moved the account item. */
export interface WhatOneNotificationDid {
  readonly written: boolean;
}

/** One notification, as far as this route reads it, with its transaction already read out of it. */
export interface TheNotificationAppleSent {
  readonly type: NotificationTheRouteReads;
  /** Apple's own word for which case of that kind it is, where it names one. */
  readonly subtype: string | null;
  /** The seconds Apple signed the notification at, which is the order of two writes. */
  readonly notifiedAt: number;
  readonly transaction: TheTransactionAppleSigned;
}

/** A notification to act on, one to take and drop, or a body that carries nothing readable. */
export type NotificationReading =
  | { readonly read: TheNotificationAppleSent }
  | { readonly dropped: string }
  | { readonly unreadable: string };

const nothingWasWritten = answer(200, { written: false } satisfies WhatOneNotificationDid);

function textIn(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function mapIn(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function environmentIn(value: unknown): StoreEnvironment | null {
  return value === 'Production' || value === 'Sandbox' ? value : null;
}

/**
 * One notification, read out of a payload whose chain already verified.
 *
 * The environment is read off the body and the transaction inside it is read against that same
 * environment, so a notification of the sandbox is never read as a transaction of production. Apple
 * sends the two from different places and signs both, and nothing here guesses which one it holds.
 */
export function notificationIn(payload: Readonly<Record<string, unknown>>): NotificationReading {
  const type = textIn(payload.notificationType);
  const notifiedAt = typeof payload.signedDate === 'number' ? payload.signedDate : null;
  const data = mapIn(payload.data);

  if (type === null || notifiedAt === null || data === null) {
    return { unreadable: 'a notification names its kind, its instant and its data' };
  }

  if (!readsThisNotification(type)) {
    return { dropped: type };
  }

  const environment = environmentIn(data.environment);

  if (environment === null) {
    return { unreadable: 'a notification names the environment it comes from' };
  }

  const transaction = transactionAppleSigned(data.signedTransactionInfo, environment);

  if (transaction === null) {
    return { unreadable: 'a notification carries one transaction of this application' };
  }

  return {
    read: {
      type,
      subtype: textIn(payload.subtype),
      notifiedAt: Math.floor(notifiedAt / 1000),
      transaction,
    },
  };
}

async function writeTheNotification(
  read: TheNotificationAppleSent,
  held: WhatTheNotificationsNeed,
  now: Date,
): Promise<HttpResponse> {
  const writes = whatTheNotificationWrites(read.type, read.subtype);

  if (writes === 'nothing') {
    return nothingWasWritten;
  }

  if (!theProductsOnSale.includes(read.transaction.productId)) {
    return nothingWasWritten;
  }

  const paidUntil = writes.takesTheRevocation
    ? (read.transaction.revokedAt ?? read.transaction.expiresAt)
    : read.transaction.expiresAt;

  if (paidUntil === null) {
    return refusal(400, thatNotificationCannotBeRead);
  }

  const accountId = await held.store.accountOfPurchase(
    transactionDigestFor(theAppleStore, read.transaction.originalTransactionId),
  );

  // A transaction no account ever filed. There is nowhere to write it, and sending it again would
  // not make a pointer, so it is taken and dropped rather than refused.
  if (accountId === undefined) {
    return nothingWasWritten;
  }

  const outcome = await held.store.writeSubscription({
    accountId,
    subscribedUntil: paidUntil,
    subscriptionStore: theAppleStore,
    subscriptionTransaction: read.transaction.originalTransactionId,
    // The server did not ask Apple here, Apple spoke first, and a verified notification is the
    // same word from the same place. So the read of section 8 that asks again after six hours
    // counts this as an answer and not as a gap.
    subscriptionCheckedAt: now.toISOString(),
    subscriptionState: writes.state,
    // The instant Apple signed this notification, and never the instant it arrived. A retried
    // expiry therefore loses to the renewal that followed it, whichever one reaches this route
    // first.
    subscriptionEventAt: read.notifiedAt,
    subscriptionPlan: read.transaction.productId,
  });

  return answer(200, { written: outcome === 'written' } satisfies WhatOneNotificationDid);
}

/** The body as the object it should be, or nothing at all where it is not one. */
function bodyIn(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

/**
 * One notification, from the signature to the account item. Nothing of the body is read until the
 * chain holds, and a kind this service does not act on is taken and dropped.
 */
export async function storeNotificationsFor(
  event: HttpRequestEvent,
  held: WhatTheNotificationsNeed,
): Promise<HttpResponse> {
  const body = bodyTextOf(event);

  if (new TextEncoder().encode(body).length > maximumNotificationBodyBytes) {
    return refusal(413, `a notification body is at most ${maximumNotificationBodyBytes} bytes`);
  }

  const now = held.clock();
  const signedPayload = mapIn(bodyIn(body))?.signedPayload;
  const said = payloadSignedByApple(signedPayload, { roots: held.roots, now });

  if ('refusal' in said) {
    return refusal(400, thatNotificationIsNotSigned);
  }

  const reading = notificationIn(said.payload);

  if ('unreadable' in reading) {
    // Refused rather than dropped, and Apple sends a refused notification again. A body this
    // service cannot read is a body it may be able to read after the next merge, and the kinds it
    // knowingly does nothing with are dropped above this line rather than here.
    return refusal(400, thatNotificationCannotBeRead);
  }

  if ('dropped' in reading) {
    return nothingWasWritten;
  }

  try {
    return await writeTheNotification(reading.read, held, now);
  } catch {
    return refusal(500, sendThatNotificationAgain);
  }
}

/** The route the api calls, with everything it needs bound to it. */
export function storeNotifications(
  held: WhatTheNotificationsNeed,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => storeNotificationsFor(event, held);
}
