import { timingSafeEqual } from 'node:crypto';

import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { EntitlementStore } from './entitlements';
import {
  answerThePreCheckout,
  starsCurrency,
  theDaysOneStarsPaymentBuys,
  thePriceThePayloadNames,
  whatThePayloadNames,
  type WhatABotCallHolds,
} from './stars';
import type { ReachesTelegram } from '../telegram/exchange';

/**
 * The updates of the Emi bot, which are the only thing that writes a paid until date on this
 * route.
 *
 * It is a route with no authorizer, because Telegram holds no token of ours. What stands in its
 * place is the secret of the webhook: the header is matched against the parameter store before one
 * field of the body is read, and a body that fails that check is written nowhere.
 *
 * Two updates are answered. A pre checkout query is answered within 10 seconds or Telegram cancels
 * the payment, so that call is made before anything is written. A successful payment is written
 * down once for each charge.
 *
 * No Telegram user identifier is read, written or logged. The digest that pays is read off the
 * payload the invoice carried.
 */

/** The path the bot is told to send its updates to. */
export const telegramUpdatesPath = '/v1/telegram/updates';

/** The header every update of a bot with a secret carries. */
export const secretTokenHeader = 'x-telegram-bot-api-secret-token';

/** What a request presenting the wrong secret is told. It says nothing about the value. */
export const thatUpdateIsNotOurs = 'that update carries no secret of this bot';

/** What a request is told when the secret could not be read, so Telegram sends the update again. */
export const sendThatUpdateAgain = 'that update was not read, so send it again';

/** What she is told at the pre checkout when the payload is not one of ours. */
export const thatInvoiceIsNotOurs = 'This invoice was not made by Emi.';

/** What she is told when the amount does not match the price the invoice named. */
export const thatPriceHasChanged = 'The price of this invoice has changed. Please start again.';

/** What the webhook is bound to: the payment partition, the bot api, the secret and the clock. */
export interface WhatTheUpdatesNeed {
  readonly entitlements: EntitlementStore;
  readonly reaches: ReachesTelegram;
  /** The bot token, read from the parameter store rather than held as a value here. */
  readonly botToken: () => Promise<string>;
  /** The secret of the webhook, read the same way. */
  readonly webhookSecret: () => Promise<string>;
  readonly clock: () => Date;
}

/** What a caller reads back: whether the update moved the item. */
export interface WhatOneUpdateDid {
  readonly written: boolean;
}

const nothingWasWritten = answer(200, { written: false } satisfies WhatOneUpdateDid);

interface APreCheckoutQuery {
  readonly id?: unknown;
  readonly currency?: unknown;
  readonly total_amount?: unknown;
  readonly invoice_payload?: unknown;
}

interface ASuccessfulPayment {
  readonly currency?: unknown;
  readonly total_amount?: unknown;
  readonly invoice_payload?: unknown;
  readonly telegram_payment_charge_id?: unknown;
}

interface AnUpdate {
  readonly pre_checkout_query?: APreCheckoutQuery;
  readonly message?: { readonly date?: unknown; readonly successful_payment?: ASuccessfulPayment };
}

function updateIn(body: string): AnUpdate | null {
  let read: unknown;

  try {
    read = JSON.parse(body);
  } catch {
    return null;
  }

  return typeof read === 'object' && read !== null && !Array.isArray(read)
    ? (read as AnUpdate)
    : null;
}

const textIn = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/** Whether the header is the secret, compared in constant time once the lengths agree. */
export function theSecretMatches(presented: string | undefined, secret: string): boolean {
  if (presented === undefined || secret.length === 0) {
    return false;
  }

  const owed = Buffer.from(secret, 'utf8');
  const given = Buffer.from(presented, 'utf8');

  // The comparison raises on two buffers of different lengths, and a length is not a secret.
  return owed.length === given.length && timingSafeEqual(owed, given);
}

/** The instant a payment buys her: a year on top of whatever she already holds. */
export function paidUntilAfter(paidUntil: string | undefined, now: Date): string {
  const held = paidUntil === undefined ? Number.NaN : Date.parse(paidUntil);
  const from = Number.isNaN(held) || held < now.getTime() ? now.getTime() : held;

  return new Date(from + theDaysOneStarsPaymentBuys * 86_400 * 1000).toISOString();
}

/**
 * One pre checkout query. The amount Telegram is about to take must be the amount the payload she
 * confirmed names, so a payload of another bot, a currency that is not Stars and a figure that
 * moved are each refused before the money is taken.
 */
async function answerTheQuery(
  query: APreCheckoutQuery,
  calling: WhatABotCallHolds,
  now: Date,
): Promise<HttpResponse> {
  const queryId = textIn(query.id);

  if (queryId === null) {
    return nothingWasWritten;
  }

  const payload = textIn(query.invoice_payload);
  const read = payload === null ? null : whatThePayloadNames(payload);

  if (read === null) {
    await answerThePreCheckout(calling, { queryId, ok: false, because: thatInvoiceIsNotOurs });

    return nothingWasWritten;
  }

  const price = thePriceThePayloadNames(read, now);

  if (query.currency !== starsCurrency || price === null || query.total_amount !== price) {
    await answerThePreCheckout(calling, { queryId, ok: false, because: thatPriceHasChanged });

    return nothingWasWritten;
  }

  await answerThePreCheckout(calling, { queryId, ok: true });

  return nothingWasWritten;
}

/**
 * One payment, written down. The charge is the key of it: an update Telegram sends twice names the
 * same charge, and the second one writes nothing, so a year is never added twice for one payment.
 */
async function writeThePayment(
  paid: ASuccessfulPayment,
  at: number,
  held: WhatTheUpdatesNeed,
  now: Date,
): Promise<HttpResponse> {
  const payload = textIn(paid.invoice_payload);
  const read = payload === null ? null : whatThePayloadNames(payload);
  const chargeRef = textIn(paid.telegram_payment_charge_id);

  if (read === null || chargeRef === null) {
    return nothingWasWritten;
  }

  const paying = await held.entitlements.readEntitlement(read.payerDigest);

  if (paying?.chargeRef === chargeRef) {
    return nothingWasWritten;
  }

  const outcome = await held.entitlements.writeEntitlement({
    payerDigest: read.payerDigest,
    // The instant of the message is the order. An update Telegram sends again carries the instant
    // it carried the first time, so the table refuses the second write as an older event.
    eventAt: at,
    writtenAt: now.toISOString(),
    paidUntil: paidUntilAfter(paying?.paidUntil, now),
    route: 'stars',
    state: 'active',
    chargeRef,
  });

  return answer(200, { written: outcome === 'written' } satisfies WhatOneUpdateDid);
}

/**
 * One update, from the header to the item. Nothing of the body is read until the secret matches,
 * and an update this service does not answer is taken and dropped.
 */
export async function telegramUpdatesFor(
  event: HttpRequestEvent,
  held: WhatTheUpdatesNeed,
): Promise<HttpResponse> {
  const presented = event.headers[secretTokenHeader];

  // A request carrying no secret at all is refused first, because that needs no secret to decide:
  // nothing of the body is parsed and the parameter store is never read for it.
  if (presented === undefined || presented.length === 0) {
    return refusal(401, thatUpdateIsNotOurs);
  }

  let secret: string;

  try {
    secret = await held.webhookSecret();
  } catch {
    // Answered as a failure rather than as a refusal, because Telegram sends an update again after
    // one, and the secret may be written a minute after this container started.
    return refusal(500, sendThatUpdateAgain);
  }

  if (!theSecretMatches(presented, secret)) {
    return refusal(401, thatUpdateIsNotOurs);
  }

  const update = updateIn(bodyTextOf(event));

  if (update === null) {
    return nothingWasWritten;
  }

  const now = held.clock();
  const query = update.pre_checkout_query;
  const paid = update.message?.successful_payment;

  try {
    if (query !== undefined) {
      const botToken = await held.botToken();

      return await answerTheQuery(query, { reaches: held.reaches, botToken }, now);
    }

    if (paid !== undefined) {
      const at = update.message?.date;

      return await writeThePayment(
        paid,
        typeof at === 'number' && Number.isSafeInteger(at) && at >= 0
          ? at
          : Math.floor(now.getTime() / 1000),
        held,
        now,
      );
    }
  } catch {
    // Telegram sends an update again after a failure, so a token it could not read and a write the
    // table refused both cost a retry rather than a payment.
    return refusal(500, sendThatUpdateAgain);
  }

  return nothingWasWritten;
}

/** The route the api calls, with everything it needs bound to it. */
export function telegramUpdates(
  held: WhatTheUpdatesNeed,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => telegramUpdatesFor(event, held);
}
