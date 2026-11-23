import { instantAt } from '@emi/crypto';

import type { EntitlementRoute, EntitlementState } from './entitlements';

/**
 * What one delivery of Stripe says about the money, read out of a body whose signature already
 * held.
 *
 * Five events are read and every other one is dropped. An endpoint that fails on an event it does
 * not know turns every new feature of Stripe into an outage, and Stripe sends the whole account's
 * events to one endpoint.
 */

/** The five events the money is written from, in the order section 3 of the design names them. */
export const eventsTheWebhookReads = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.deleted',
] as const;

/** One of those five, as a type, so a reader of an event is held to the list above. */
export type EventTheWebhookReads = (typeof eventsTheWebhookReads)[number];

/** Every way a delivery Stripe signed still carries nothing this service can write. */
export type EventRefusal =
  | 'the-body-is-not-readable'
  | 'the-event-names-no-customer'
  | 'the-period-is-not-on-the-subscription-item'
  | 'the-invoice-line-carries-no-period';

/** One event, as far as it is about the money. */
export interface MoneyEvent {
  readonly type: EventTheWebhookReads;
  /** The seconds the event itself was made at, which is the order of the writes. */
  readonly eventAt: number;
  /** The customer the event is about. Its metadata names the digest that paid. */
  readonly customerRef: string;
  /** The subscription, on the three subscription events. */
  readonly subscriptionRef?: string;
  /** The instant the period she has paid for ends, where the event carries one. */
  readonly paidUntil?: string;
  /** Whether she has stopped the renewal, read from the subscription itself. */
  readonly stoppedTheRenewal?: boolean;
  /** The state Stripe holds the subscription in, on the three subscription events. */
  readonly subscriptionState?: string;
}

/** An event to write, an event to drop, or a body that cannot be read. */
export type EventReading =
  { readonly read: MoneyEvent } | { readonly dropped: string } | { readonly refusal: EventRefusal };

interface AnEvent {
  readonly type?: unknown;
  readonly created?: unknown;
  readonly data?: { readonly object?: Readonly<Record<string, unknown>> };
}

function textIn(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function secondsIn(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** An instant of a number of seconds, which is how every date of this api travels. */
export function instantOfSeconds(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

function mapIn(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function listIn(value: unknown): readonly unknown[] {
  const map = mapIn(value);

  return map !== null && Array.isArray(map.data) ? (map.data as readonly unknown[]) : [];
}

/**
 * The instant a subscription is paid until, read off its first item.
 *
 * It is not on the subscription any more. Stripe moved it onto each subscription item, so code
 * that reads the old place reads nothing, writes nothing, and the account page then says she never
 * paid. Nothing here falls back to the old place: a fallback would hide the move again the next
 * time it happens.
 */
function periodEndOfSubscription(subscription: Readonly<Record<string, unknown>>): number | null {
  const item = mapIn(listIn(subscription.items)[0]);

  return item === null ? null : secondsIn(item.current_period_end);
}

/** The instant an invoice is paid until, read off the period of its first line. */
function periodEndOfInvoice(invoice: Readonly<Record<string, unknown>>): number | null {
  const line = mapIn(listIn(invoice.lines)[0]);
  const period = line === null ? null : mapIn(line.period);

  return period === null ? null : secondsIn(period.end);
}

function readsThisEvent(type: string): type is EventTheWebhookReads {
  return (eventsTheWebhookReads as readonly string[]).includes(type);
}

/** The event, read from the body as it arrived, or the reason this service writes nothing for it. */
export function moneyEventIn(body: string): EventReading {
  let held: AnEvent | null = null;

  try {
    held = JSON.parse(body) as AnEvent;
  } catch {
    return { refusal: 'the-body-is-not-readable' };
  }

  const type = textIn(held?.type);
  const eventAt = secondsIn(held?.created);
  const object = mapIn(held?.data?.object);

  if (type === null || eventAt === null || object === null) {
    return { refusal: 'the-body-is-not-readable' };
  }

  if (!readsThisEvent(type)) {
    return { dropped: type };
  }

  const customerRef = textIn(object.customer);

  if (customerRef === null) {
    return { refusal: 'the-event-names-no-customer' };
  }

  if (type === 'customer.subscription.deleted') {
    return {
      read: { type, eventAt, customerRef, subscriptionRef: textIn(object.id) ?? undefined },
    };
  }

  if (type === 'invoice.payment_failed') {
    return { read: { type, eventAt, customerRef } };
  }

  if (type === 'invoice.paid') {
    const end = periodEndOfInvoice(object);

    return end === null
      ? { refusal: 'the-invoice-line-carries-no-period' }
      : { read: { type, eventAt, customerRef, paidUntil: instantOfSeconds(end) } };
  }

  const end = periodEndOfSubscription(object);

  return end === null
    ? { refusal: 'the-period-is-not-on-the-subscription-item' }
    : {
        read: {
          type,
          eventAt,
          customerRef,
          subscriptionRef: textIn(object.id) ?? undefined,
          paidUntil: instantOfSeconds(end),
          stoppedTheRenewal: object.cancel_at_period_end === true,
          subscriptionState: textIn(object.status) ?? undefined,
        },
      };
}

/**
 * The state of a subscription whose first invoice is made and not paid, which is what a create
 * with no free month leaves behind until her browser confirms the charge.
 *
 * It carries a period that has already started, so an event about it names a date she is not paid
 * until. The write below leaves her where she was, and `invoice.paid` grants her the year the
 * moment the money lands.
 */
export const nothingHasBeenPaidYet = 'incomplete';

/** The fields one event writes onto the payment item, beside the digest and the instant. */
export interface WhatOneEventWrites {
  readonly eventAt: number;
  readonly paidUntil?: string;
  readonly route?: EntitlementRoute;
  readonly state?: EntitlementState;
  readonly subscriptionRef?: string;
}

function hasPassed(paidUntil: string | undefined, now: Date): boolean {
  const held = paidUntil === undefined ? null : instantAt(paidUntil);

  return held !== null && held <= now.getTime();
}

/**
 * What one event writes. A field the event says nothing about is left out, so the write keeps
 * whatever an earlier event put there.
 *
 * A failed payment is the one event that reads the item first. It leaves the date alone and lapses
 * her only once that date has passed, because a bank that blocked one attempt of a retry has not
 * taken away the year she already paid for.
 */
export function whatTheEventWrites(
  read: MoneyEvent,
  heldUntil: string | undefined,
  now: Date,
): WhatOneEventWrites {
  const { type, eventAt, paidUntil, subscriptionRef } = read;

  // A subscription waiting for its first payment carries a period that has already started, so a
  // write from it would hand her the year before the charge lands, and a woman who closed the page
  // on the card form would keep it.
  if (read.subscriptionState === nothingHasBeenPaidYet) {
    return { eventAt };
  }

  if (type === 'customer.subscription.created') {
    return { eventAt, paidUntil, route: 'card', state: 'active', subscriptionRef };
  }

  if (type === 'customer.subscription.updated') {
    return {
      eventAt,
      paidUntil,
      state: read.stoppedTheRenewal === true ? 'cancelling' : 'active',
      subscriptionRef,
    };
  }

  if (type === 'invoice.paid') {
    return { eventAt, paidUntil, state: 'active' };
  }

  if (type === 'customer.subscription.deleted') {
    return { eventAt, state: 'lapsed' };
  }

  return hasPassed(heldUntil, now) ? { eventAt, state: 'lapsed' } : { eventAt };
}

/** Whether an event needs the item read before it is written, which the failed payment alone does. */
export function readsTheItemFirst(type: EventTheWebhookReads): boolean {
  return type === 'invoice.payment_failed';
}
