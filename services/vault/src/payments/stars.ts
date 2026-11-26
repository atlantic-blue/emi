import { accountIdLength, crockfordAlphabet } from '@emi/crypto';

import type { AnsweredBy, AskedOf, ReachesTelegram } from '../telegram/exchange';
import { theBlackFridayOffer, theBlackFridayOfferEnds } from './stripe';

/**
 * What the Emi bot sells, and the two calls that sell it.
 *
 * One payment buys one year. Telegram renews a Stars subscription every 30 days and nothing else,
 * so a year cannot be a subscription here: the invoice carries no `subscription_period`, it renews
 * nothing, and she buys it again when the year runs out.
 *
 * The payload is the whole of what travels there and back. Telegram hands it to us again on the
 * pre checkout and on the payment, so the digest that pays is read off the payload rather than
 * looked up from anything Telegram knows about her.
 *
 * Nothing here reads or writes a Telegram user identifier.
 */

/** The currency a digital good is sold in. Telegram takes this one and no other. */
export const starsCurrency = 'XTR';

/** The price of one year, in Stars. */
export const theYearlyStarsPrice = 2250;

/**
 * Half of it, which is what the coupon of the offer takes off the card price. The two routes sell
 * the same year at the same discount, so the figure is worked out from the one above.
 */
export const theStarsPriceOnTheOffer = theYearlyStarsPrice / 2;

/** Days one payment buys. It does not renew, and there is no free month on this route. */
export const theDaysOneStarsPaymentBuys = 365;

/** What the invoice is called where Telegram draws it. */
export const theInvoiceTitle = 'Emi for a year';

/** What the invoice says under the title. */
export const theInvoiceDescription = 'One year of Emi. Your records stay on your phone.';

/** The label of the one price component. Telegram draws it beside the amount. */
export const thePriceLabel = 'One year';

/** Bytes the payload may take. Telegram refuses a longer one. */
export const theLongestPayloadTelegramTakes = 128;

/**
 * What a payload of ours opens with. A version rather than a bare digest, because the payload of
 * a payment made today is read back by whatever this service is a year from now.
 */
export const starsPayloadVersion = 'emi1';

/** What a payload bought at the full price carries. */
export const theFullPriceMarker = 'f';

/** What a payload bought on the offer carries. */
export const theOfferMarker = 'b';

/** The field the offer travels in on the invoice route, as it does on the card route. */
export const offerField = 'offer';

/** The payload, which names the payer and the price she was shown. */
export interface WhatThePayloadNames {
  readonly payerDigest: string;
  /** Whether she was shown the offer price. The instant decides whether that price still stands. */
  readonly onTheOffer: boolean;
}

/** The payload of one invoice: the version, the digest paying, and the price she was shown. */
export function starsPayloadFor(payerDigest: string, offer: string | undefined): string {
  const marker = offer === theBlackFridayOffer ? theOfferMarker : theFullPriceMarker;

  return `${starsPayloadVersion}:${payerDigest}:${marker}`;
}

/** The payer and the price a payload names, or nothing at all when it is not one of ours. */
export function whatThePayloadNames(payload: string): WhatThePayloadNames | null {
  const parts = payload.split(':');

  if (parts.length !== 3 || parts[0] !== starsPayloadVersion) {
    return null;
  }

  const [, payerDigest, marker] = parts;

  if (payerDigest === undefined || payerDigest.length !== accountIdLength) {
    return null;
  }

  if (![...payerDigest].every((character) => crockfordAlphabet.includes(character))) {
    return null;
  }

  if (marker !== theFullPriceMarker && marker !== theOfferMarker) {
    return null;
  }

  return { payerDigest, onTheOffer: marker === theOfferMarker };
}

/**
 * The price a payload names at one instant, or nothing at all when it names none.
 *
 * A payload carrying the offer after the offer closed is refused rather than charged at the full
 * price. She was shown half, and the amount Telegram collected is the amount she confirmed, so the
 * two must agree or nothing is written.
 */
export function thePriceThePayloadNames(read: WhatThePayloadNames, now: Date): number | null {
  if (!read.onTheOffer) {
    return theYearlyStarsPrice;
  }

  return now.getTime() < theBlackFridayOfferEnds.getTime() ? theStarsPriceOnTheOffer : null;
}

/** The price the invoice route sells at, which is the offer only while the offer is open. */
export function theStarsPriceFor(offer: string | undefined, now: Date): number {
  return offer === theBlackFridayOffer && now.getTime() < theBlackFridayOfferEnds.getTime()
    ? theStarsPriceOnTheOffer
    : theYearlyStarsPrice;
}

/** Every way a call of the bot api fails, as a value, so a caller matches a reason and not words. */
export type BotRefusal = 'the-call-was-refused' | 'the-answer-names-nothing';

/**
 * Raised when the bot api does not answer with what it was asked for. The message names the method
 * and never the address: the token of the bot is in the address of every call, and a message
 * reaches a log line.
 */
export class BotError extends Error {
  readonly refusal: BotRefusal;

  constructor(refusal: BotRefusal, message: string) {
    super(message);
    this.name = 'BotError';
    this.refusal = refusal;
  }
}

/** Where the bot api is. The token of the bot is part of the address of every call it takes. */
export const telegramBotApi = 'https://api.telegram.org';

/** The address of one method. The token is in it because this api reads it nowhere else. */
export function botMethodAddress(botToken: string, method: string): string {
  return `${telegramBotApi}/bot${botToken}/${method}`;
}

/** The method that makes an invoice link. */
export const createInvoiceLinkMethod = 'createInvoiceLink';

/** The method that answers a pre checkout query. */
export const answerPreCheckoutQueryMethod = 'answerPreCheckoutQuery';

/** The method that tells Telegram where to send an update. */
export const setWebhookMethod = 'setWebhook';

/** What a call is bound to: one way of reaching the bot api, and the token it is made with. */
export interface WhatABotCallHolds {
  readonly reaches: ReachesTelegram;
  readonly botToken: string;
}

interface WhatTheBotApiAnswered {
  readonly ok?: unknown;
  readonly result?: unknown;
  readonly description?: unknown;
}

function asked(body: unknown): AskedOf {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function resultIn(answered: AnsweredBy, method: string): unknown {
  let read: WhatTheBotApiAnswered | null = null;

  try {
    read = JSON.parse(answered.body) as WhatTheBotApiAnswered;
  } catch {
    read = null;
  }

  if (answered.status < 200 || answered.status >= 300 || read?.ok !== true) {
    const named = typeof read?.description === 'string' ? read.description : 'nothing';

    throw new BotError(
      'the-call-was-refused',
      `the bot api answered ${answered.status} to ${method} and named ${named}`,
    );
  }

  return read.result;
}

/**
 * The invoice link one woman buys one year on.
 *
 * Exactly one price component, because Telegram refuses a Stars invoice carrying more than one.
 * No provider token, because a digital good is sold in Stars and in no currency a provider holds.
 */
export async function invoiceLinkFor(
  held: WhatABotCallHolds,
  which: { readonly payload: string; readonly amount: number },
): Promise<string> {
  const answered = await held.reaches(
    botMethodAddress(held.botToken, createInvoiceLinkMethod),
    asked({
      title: theInvoiceTitle,
      description: theInvoiceDescription,
      payload: which.payload,
      currency: starsCurrency,
      prices: [{ label: thePriceLabel, amount: which.amount }],
    }),
  );

  const link = resultIn(answered, createInvoiceLinkMethod);

  if (typeof link !== 'string' || link.length === 0) {
    throw new BotError('the-answer-names-nothing', 'the invoice call named no link');
  }

  return link;
}

/**
 * The answer to one pre checkout query. Telegram cancels the payment when it is not answered
 * within 10 seconds, so this call is made before anything is written.
 */
export async function answerThePreCheckout(
  held: WhatABotCallHolds,
  which: { readonly queryId: string; readonly ok: boolean; readonly because?: string },
): Promise<void> {
  const answered = await held.reaches(
    botMethodAddress(held.botToken, answerPreCheckoutQueryMethod),
    asked({
      pre_checkout_query_id: which.queryId,
      ok: which.ok,
      ...(which.because === undefined ? {} : { error_message: which.because }),
    }),
  );

  resultIn(answered, answerPreCheckoutQueryMethod);
}
