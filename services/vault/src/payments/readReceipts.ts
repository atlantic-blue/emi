import { payerDigestFor } from '@emi/crypto';

import { answer, type HttpRequestEvent, type HttpResponse, refusal } from '../api';
import type { EntitlementStore } from './entitlements';
import { payerNameIn } from './poolToken';
import { invoicesOf, type ListedInvoice, type ReachesStripe } from './stripe';

/**
 * The receipts row of her account page: every invoice Stripe holds for the customer she pays
 * under, newest first.
 *
 * Four fields leave this route for each one, and Emi writes none of them down. The invoice itself
 * stays with Stripe, and the link is the page Stripe already serves, so nothing here builds an
 * invoice and nothing here keeps a copy of one.
 *
 * A woman who pays another way, and a woman who has never paid, are answered an empty list without
 * Stripe being called at all. Her digest is cut from the claim of her own token, so a request
 * names no account and can reach no customer but her own.
 */

/** The path her account page lists receipts on. */
export const receiptsPath = '/v1/payments/receipts';

/** What a caller is told when no payer is read. It names neither the pool nor the claim. */
export const thatTokenReadsNoReceipts = 'that token reads no receipts';

/** What a caller is told when the cursor is not one this api wrote. */
export const thatCursorIsNotOne = 'that cursor is not a cursor this api wrote';

/** What a caller is told when the cursor was written for another payment. */
export const thatCursorIsForAnotherPayment = 'that cursor was written for another payment';

/** What a caller is told when Stripe did not answer. It names no customer and no invoice. */
export const nothingWasListed = 'the payment service did not answer, so nothing was listed';

/** The name of the parameter the next page is asked with. */
export const receiptsCursorParameter = 'cursor';

/** The name of the parameter a page size is asked with. */
export const receiptsLimitParameter = 'limit';

/** How many receipts a page carries when she asks for no number. */
export const receiptsInOnePage = 10;

/**
 * The most a page carries however large a number is asked for. It is the most this api lists in
 * one call, so a caller cannot turn one request into a read of every invoice she holds.
 */
export const mostReceiptsInOnePage = 100;

/** One receipt, as her page draws it. The four fields are the whole of what this route answers. */
export interface OneReceipt {
  readonly invoicedAt: string;
  /** The amount of the invoice, the tax inside it, in the smallest unit of the currency. */
  readonly amount: number;
  readonly currency: string;
  /** The page Stripe serves for the invoice. Emi serves none of its own. */
  readonly invoiceUrl: string;
}

/** What her page reads back: one page of receipts, and the cursor the next page is asked with. */
export interface WhatTheReceiptsPageReads {
  readonly receipts: readonly OneReceipt[];
  readonly cursor: string | null;
}

/** What the read is bound to: the payment partition, Stripe, the key and the pool. */
export interface WhatTheReceiptsNeed {
  readonly entitlements: Pick<EntitlementStore, 'readEntitlement'>;
  readonly reaches: ReachesStripe;
  /** The secret key, read from the parameter store rather than held as a value here. */
  readonly secretKey: () => Promise<string>;
  /** The pool her token is minted by, which is half of what the payer digest is cut from. */
  readonly poolId: string;
}

/**
 * The cursor of the next page, carried with the digest it was written for. The digest is in there
 * so a cursor kept from another payment is refused rather than read as an invoice: the list is
 * bound to the caller either way, so this catches the page that went wrong and never an attack.
 */
export function receiptsCursorFor(payerDigest: string, invoiceRef: string): string {
  return Buffer.from(`${payerDigest}.${invoiceRef}`, 'utf8').toString('base64url');
}

/** What a cursor says once it is read back: whose it is, and which invoice it stops at. */
export interface ReadReceiptsCursor {
  readonly payerDigest: string;
  readonly invoiceRef: string;
}

/** The two halves of a cursor, or nothing at all when the text is not one. */
export function receiptsCursorParts(cursor: string): ReadReceiptsCursor | null {
  const text = Buffer.from(cursor, 'base64url').toString('utf8');
  const dot = text.indexOf('.');

  return dot < 1 || dot === text.length - 1
    ? null
    : { payerDigest: text.slice(0, dot), invoiceRef: text.slice(dot + 1) };
}

/**
 * How many receipts one page carries. A number larger than the most is held to the most rather
 * than refused, and anything that is not a whole number of receipts reads as the default.
 */
export function receiptsAskedFor(query: string): number {
  const given = new URLSearchParams(query).get(receiptsLimitParameter);

  if (given === null || given.length === 0) {
    return receiptsInOnePage;
  }

  const asked = Number(given);

  return Number.isInteger(asked) && asked >= 1
    ? Math.min(asked, mostReceiptsInOnePage)
    : receiptsInOnePage;
}

const nothingToList = answer(200, {
  receipts: [],
  cursor: null,
} satisfies WhatTheReceiptsPageReads);

function receiptOf(invoice: ListedInvoice): OneReceipt | null {
  // Stripe serves no page for an invoice it has not issued, and a receipt row with no link is a
  // row she can press and reach nothing.
  return invoice.invoiceUrl === null
    ? null
    : {
        invoicedAt: new Date(invoice.created * 1000).toISOString(),
        amount: invoice.total,
        currency: invoice.currency,
        invoiceUrl: invoice.invoiceUrl,
      };
}

/** Her receipts, from the token to the page. */
export async function receiptsFor(
  event: HttpRequestEvent,
  held: WhatTheReceiptsNeed,
): Promise<HttpResponse> {
  const read = payerNameIn(event, held.poolId);

  if ('refusal' in read) {
    return refusal(401, thatTokenReadsNoReceipts);
  }

  const payerDigest = payerDigestFor(held.poolId, read.userName);
  const query = event.rawQueryString ?? '';
  const given = new URLSearchParams(query).get(receiptsCursorParameter);
  let after: string | null = null;

  if (given !== null && given.length > 0) {
    const parts = receiptsCursorParts(given);

    if (parts === null) {
      return refusal(400, thatCursorIsNotOne);
    }

    if (parts.payerDigest !== payerDigest) {
      return refusal(403, thatCursorIsForAnotherPayment);
    }

    after = parts.invoiceRef;
  }

  const paying = await held.entitlements.readEntitlement(payerDigest);

  // A payment made another way holds no customer of Stripe, so there is nothing to ask Stripe
  // about and the question is never put to it.
  if (paying?.route !== 'card' || paying.payerRef === undefined) {
    return nothingToList;
  }

  try {
    const secretKey = await held.secretKey();
    const page = await invoicesOf(
      { reaches: held.reaches, secretKey },
      {
        customerRef: paying.payerRef,
        limit: receiptsAskedFor(query),
        ...(after === null ? {} : { after }),
      },
    );
    // The cursor is the last invoice of the page as Stripe listed it, read before the answer is
    // ordered here: the next page starts after that invoice in Stripe's own order, and an order of
    // ours would ask for a page starting somewhere else.
    const last = page.invoices[page.invoices.length - 1];

    return answer(200, {
      receipts: [...page.invoices]
        .sort((one, other) => other.created - one.created)
        .map((invoice) => receiptOf(invoice))
        .filter((receipt): receipt is OneReceipt => receipt !== null),
      cursor:
        page.moreToCome && last !== undefined
          ? receiptsCursorFor(payerDigest, last.invoiceRef)
          : null,
    } satisfies WhatTheReceiptsPageReads);
  } catch {
    // Every way this stops reads the same to her, from a key the parameter store does not hold to
    // a Stripe that is down, so no caller learns which of them it was.
    return refusal(502, nothingWasListed);
  }
}

/** The route the api calls, with everything it needs bound to it. */
export function readReceipts(
  held: WhatTheReceiptsNeed,
): (event: HttpRequestEvent) => Promise<HttpResponse> {
  return (event) => receiptsFor(event, held);
}
