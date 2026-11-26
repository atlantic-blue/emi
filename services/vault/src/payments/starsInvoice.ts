import { payerDigestFor } from '@emi/crypto';

import { answer, bodyTextOf, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { EntitlementStore, StoredEntitlement } from './entitlements';
import { alreadyPaying } from './finishSubscription';
import { payerNameIn } from './poolToken';
import {
  invoiceLinkFor,
  offerField,
  starsPayloadFor,
  theStarsPriceFor,
  type WhatABotCallHolds,
} from './stars';
import { theBlackFridayOffer } from './stripe';
import type { ReachesTelegram } from '../telegram/exchange';

/**
 * The press on Buy with Stars: one invoice link for one year, made for the digest her own token
 * names.
 *
 * It writes nothing. The payment itself is the only thing that writes a paid until date, and it
 * arrives as an update of the bot, so a woman who asks for a link and never pays leaves nothing
 * behind at all.
 *
 * The payload carries her digest and the price she was shown, because Telegram hands the payload
 * back on the pre checkout and on the payment and hands nothing else of ours back.
 */

/** The path the site asks for an invoice link on. */
export const starsInvoicePath = '/v1/payments/stars/invoice';

/**
 * What a caller is told when no payer is read. Every refusal reads the same, from a token of
 * another pool to a token carrying no user name, so nobody can ask this api which check said no.
 */
export const thatTokenBuysNothing = 'that token buys no year';

/** What a caller is told when the body is not one of the two it takes. It names them both. */
export const theBodyAnInvoiceTakes = `an invoice carries no field, or ${offerField}, which is "${theBlackFridayOffer}"`;

/** What a caller is told when a year she already paid for is still running. */
export const aYearIsAlreadyRunning = 'a year you paid for is still running';

/** What a caller is told when the bot api did not answer. She is charged nothing when this reads. */
export const noInvoiceWasMade = 'the bot did not answer, so no invoice was made';

/** What the site reads back: the link Telegram draws the invoice on. */
export interface WhatTheSiteBuysOn {
  readonly invoiceLink: string;
}

/** What the route is bound to: the payment partition, the bot api, the token, the pool, the clock. */
export interface WhatTheInvoiceNeeds {
  readonly entitlements: Pick<EntitlementStore, 'readEntitlement'>;
  readonly reaches: ReachesTelegram;
  /** The bot token, read from the parameter store rather than held as a value here. */
  readonly botToken: () => Promise<string>;
  /** The pool her token is minted by, which is half of what the payer digest is cut from. */
  readonly poolId: string;
  /** Read once a press arrives, because it is what says whether the offer is still open. */
  readonly clock: () => Date;
}

/** What one press carries: the offer she arrived with, and nothing else. */
export interface WhatAnInvoiceCarries {
  readonly offer?: string;
}

/**
 * The one field this call takes, read off the body, or nothing at all where the body is something
 * else. A press with no body at all is the full price, which is what a client that sends no body
 * means by it.
 *
 * The offer is held to the one value rather than handed on, so a caller naming a discount of its
 * own is refused here and the bot api is never reached.
 */
export function whatAnInvoiceCarries(body: string): WhatAnInvoiceCarries | null {
  if (body.trim().length === 0) {
    return {};
  }

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

  if (Object.keys(fields).some((name) => name !== offerField)) {
    return null;
  }

  const offer = fields[offerField];

  if (offer === undefined) {
    return {};
  }

  return offer === theBlackFridayOffer ? { offer } : null;
}

/**
 * Whether a year she already holds is still being paid for. The date is read first, because a
 * payment of either route writes one, and the subscription after it, because a card subscription
 * whose first invoice has not landed yet carries no date.
 */
export function aYearOfHersIsRunning(paying: StoredEntitlement, now: Date): boolean {
  const until = paying.paidUntil === undefined ? Number.NaN : Date.parse(paying.paidUntil);

  if (!Number.isNaN(until) && until > now.getTime()) {
    return true;
  }

  return alreadyPaying(paying);
}

/** One press, from the token to the link. */
export async function starsInvoiceFor(
  event: HttpRequestEvent,
  held: WhatTheInvoiceNeeds,
): Promise<HttpResponse> {
  const read = payerNameIn(event, held.poolId);

  if ('refusal' in read) {
    return refusal(401, thatTokenBuysNothing);
  }

  const carried = whatAnInvoiceCarries(bodyTextOf(event));

  if (carried === null) {
    return refusal(400, theBodyAnInvoiceTakes);
  }

  const payerDigest = payerDigestFor(held.poolId, read.userName);
  const now = held.clock();
  const paying = await held.entitlements.readEntitlement(payerDigest);

  if (paying !== undefined && aYearOfHersIsRunning(paying, now)) {
    return refusal(409, aYearIsAlreadyRunning);
  }

  try {
    const calling: WhatABotCallHolds = { reaches: held.reaches, botToken: await held.botToken() };
    const invoiceLink = await invoiceLinkFor(calling, {
      payload: starsPayloadFor(payerDigest, carried.offer),
      amount: theStarsPriceFor(carried.offer, now),
    });

    return answer(200, { invoiceLink } satisfies WhatTheSiteBuysOn);
  } catch {
    // Every way this stops reads the same to her, from a token the parameter store does not hold
    // yet to a bot api that is down, so no caller learns which of them it was.
    return refusal(502, noInvoiceWasMade);
  }
}

/** The route the api calls, with everything it needs bound to it. */
export function starsInvoice(
  held: WhatTheInvoiceNeeds,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => starsInvoiceFor(event, held);
}
