import { type Language, localeOf } from '@/app/words';

import { THE_API_HOST } from './theTelegramSignIn';

/**
 * The receipts of her account page: what Stripe holds for the customer she pays under, newest
 * first, one page at a time.
 *
 * The route answers four fields for each receipt and Emi keeps none of them. The link is the page
 * Stripe already serves, so nothing here builds an invoice and nothing here holds a copy of one.
 */

/** The route her account page lists receipts on, behind the token authorizer of the pool. */
export const WHERE_RECEIPTS_ARE_READ = `${THE_API_HOST}/v1/payments/receipts`;

/** The name of the parameter the next page is asked with, as the route names it. */
export const THE_CURSOR_PARAMETER = 'cursor';

/** One receipt, as her page draws it. */
export interface OneReceipt {
  readonly invoicedAt: string;
  /** The amount of the invoice, in the smallest unit of its currency. */
  readonly amount: number;
  readonly currency: string;
  /** The page Stripe serves for the invoice. */
  readonly invoiceUrl: string;
}

/** One page of receipts, and the cursor the page after it is asked with. */
export interface WhatAPageOfReceiptsHolds {
  readonly receipts: readonly OneReceipt[];
  readonly cursor: string | null;
}

/** How this module reaches the api. A test hands it one that answers without a network. */
export type HowItAsks = typeof fetch;

/** The address of one page, which is the route itself for the first and a cursor after that. */
export function whereThatPageIs(cursor: string | null): string {
  return cursor === null
    ? WHERE_RECEIPTS_ARE_READ
    : `${WHERE_RECEIPTS_ARE_READ}?${new URLSearchParams({ [THE_CURSOR_PARAMETER]: cursor })}`;
}

interface WhatTheRouteSaid {
  readonly receipts?: unknown;
  readonly cursor?: unknown;
}

/**
 * One receipt of the answer, or nothing at all where a field is missing or is of another kind. A
 * row with no link is a row she can press and reach nothing, so it is left out rather than drawn.
 */
function theReceiptIn(said: unknown): OneReceipt | null {
  if (said === null || typeof said !== 'object') {
    return null;
  }

  const { invoicedAt, amount, currency, invoiceUrl } = said as Record<string, unknown>;

  return typeof invoicedAt === 'string' &&
    typeof amount === 'number' &&
    typeof currency === 'string' &&
    typeof invoiceUrl === 'string' &&
    invoiceUrl.length > 0
    ? { invoicedAt, amount, currency, invoiceUrl }
    : null;
}

/**
 * One page of her receipts, or nothing at all where the route would not say.
 *
 * Nothing and an empty page are two different answers here, unlike the subscription read: an
 * empty page is a woman who has no receipts yet, and nothing is a read that failed, and her page
 * says a different line for each.
 */
export async function theReceiptsSheHolds(
  idToken: string,
  cursor: string | null = null,
  asks: HowItAsks = fetch,
): Promise<WhatAPageOfReceiptsHolds | null> {
  let answered: Response;

  try {
    answered = await asks(whereThatPageIs(cursor), {
      method: 'GET',
      headers: { authorization: `Bearer ${idToken}` },
    });
  } catch {
    return null;
  }

  if (!answered.ok) {
    return null;
  }

  let said: WhatTheRouteSaid;

  try {
    said = (await answered.json()) as WhatTheRouteSaid;
  } catch {
    return null;
  }

  if (!Array.isArray(said.receipts)) {
    return null;
  }

  return {
    receipts: said.receipts
      .map((one) => theReceiptIn(one))
      .filter((receipt): receipt is OneReceipt => receipt !== null),
    cursor: typeof said.cursor === 'string' && said.cursor.length > 0 ? said.cursor : null,
  };
}

/** The tag Intl is asked in, which is the language and the region the site writes that language for. */
function theTagOf(language: Language): string {
  return localeOf(language).replace('_', '-');
}

/** The day an invoice was written, in the language the page is drawn in. */
export function theReceiptDay(language: Language, invoicedAt: string): string {
  const instant = new Date(Date.parse(invoicedAt));

  return Number.isNaN(instant.getTime())
    ? ''
    : new Intl.DateTimeFormat(theTagOf(language), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(instant);
}

/**
 * The amount of an invoice, in the language the page is drawn in and in the currency it was
 * charged in.
 *
 * The route answers the smallest unit of the currency, and how many of those make one of it is a
 * thing of the currency rather than of the amount: a yen has no hundredths and a euro has two.
 * Intl holds that number, so it is read from there rather than divided by a hundred here.
 */
export function theReceiptAmount(language: Language, amount: number, currency: string): string {
  const code = currency.toUpperCase();
  let writes: Intl.NumberFormat;

  try {
    writes = new Intl.NumberFormat(theTagOf(language), { style: 'currency', currency: code });
  } catch {
    return `${amount} ${code}`;
  }

  const places = writes.resolvedOptions().maximumFractionDigits ?? 2;

  return writes.format(amount / 10 ** places);
}
