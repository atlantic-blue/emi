import { THE_EMI_COMMUNITY } from './addresses';
import type { AnOffer } from './theOfferSheArrivedWith';
import { THE_API_HOST } from './theTelegramSignIn';
import { THE_FIELD_AN_OFFER_TRAVELS_IN } from './theSubscriptionSheStarts';

/**
 * The one call the Telegram Stars choice makes: ask for an invoice, and open it.
 *
 * It carries her identity token and the offer the page was showing, and nothing else. The route
 * cuts the payer digest from a claim of that token, so the page sends no account identifier and no
 * name. The price is not sent either: the route reads the offer and its own clock, so the page asks
 * for an invoice and never for an amount.
 *
 * A payment in Stars buys one year and renews nothing. There is no free month on it, because the
 * free month belongs to the one price of the card route.
 */

/** What a year of Emi costs in Telegram Stars. Every sentence that says it reads this figure. */
export const THE_PRICE_IN_STARS = 2250;

/**
 * What the Black Friday offer asks for, which is half of the year. It is held to being half rather
 * than written twice, so the two figures cannot drift apart.
 */
export const THE_OFFER_PRICE_IN_STARS = THE_PRICE_IN_STARS / 2;

/** The route that makes the invoice, behind the token authorizer of the pool. */
export const WHERE_A_STARS_INVOICE_IS_MADE = `${THE_API_HOST}/v1/payments/stars/invoice`;

/** What the route answers when she already holds a paid year or a running card subscription. */
export const SHE_ALREADY_HOLDS_EMI = 409;

/**
 * Where Telegram is, taken from the one address this site already names it at.
 *
 * The press leaves this site, which no other press of the site does, so the address the route
 * answered is read before her browser is given it. An invoice anywhere else is refused as no
 * invoice at all, and this page is then no way to reach a host nobody approved.
 */
export const WHERE_AN_INVOICE_MAY_OPEN = `${new URL(THE_EMI_COMMUNITY).origin}/`;

/** How this module reaches the api. A test hands it one that answers without a network. */
export type HowItAsks = typeof fetch;

/** Why nothing opened: she holds Emi already, or nothing was taken and she may press again. */
export type WhyNothingOpened = 'sheAlreadyHoldsEmi' | 'nothingWasTaken';

/** What the route answered: the invoice her browser opens, or why it opened nothing. */
export type WhatTheStarsRouteSaid =
  { readonly opens: string } | { readonly refused: WhyNothingOpened };

interface WhatTheRouteSaid {
  readonly invoiceLink?: unknown;
}

/** What she pays in Stars, which is half of the year while she is reading the offer. */
export function theStarsSheWouldPay(offer: AnOffer | null): number {
  return offer === null ? THE_PRICE_IN_STARS : THE_OFFER_PRICE_IN_STARS;
}

/**
 * The invoice she opens in Telegram, or why she opens nothing.
 *
 * A woman who already holds Emi reads that she does, because pressing again would charge her for a
 * year she has. Every other refusal reads the same to her: nothing was taken, and the press is
 * still there.
 */
export async function anInvoiceInStars(
  idToken: string,
  asks: HowItAsks = fetch,
  offer?: AnOffer | null,
): Promise<WhatTheStarsRouteSaid> {
  let answered: Response;

  try {
    answered = await asks(WHERE_A_STARS_INVOICE_IS_MADE, {
      method: 'POST',
      headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(
        offer === undefined || offer === null ? {} : { [THE_FIELD_AN_OFFER_TRAVELS_IN]: offer },
      ),
    });
  } catch {
    return { refused: 'nothingWasTaken' };
  }

  if (answered.status === SHE_ALREADY_HOLDS_EMI) {
    return { refused: 'sheAlreadyHoldsEmi' };
  }

  if (!answered.ok) {
    return { refused: 'nothingWasTaken' };
  }

  let said: WhatTheRouteSaid;

  try {
    said = (await answered.json()) as WhatTheRouteSaid;
  } catch {
    return { refused: 'nothingWasTaken' };
  }

  const opens = said.invoiceLink;

  return typeof opens === 'string' && opens.startsWith(WHERE_AN_INVOICE_MAY_OPEN)
    ? { opens }
    : { refused: 'nothingWasTaken' };
}
