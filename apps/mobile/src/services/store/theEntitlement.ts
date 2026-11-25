import { theProductsEmiSells } from './theProducts';

/**
 * Contract PAY-2. What the App Store says she holds, worked out into the one word a screen needs.
 *
 * Nothing here asks the store and nothing here writes. The reckoning is a function of what the
 * store said and the instant it was asked, so a test states a transaction and reads a state back.
 *
 * The server owns the date under contract PAY-3, because a date the phone works out is a date she
 * can move by moving the clock. This answer is what the application uses between two server reads,
 * and the paid states it names are the states a write gate may trust.
 */

/**
 * The six states of the design. Two more exist in the App Store and are not here: a billing retry
 * and a billing grace period both read as `paid`, because Apple is still trying her card and she
 * cannot tell either one apart from an ordinary paid month.
 */
export type WhatSheIsEntitledTo =
  'neverPaid' | 'freeMonth' | 'paid' | 'cancelling' | 'lapsed' | 'refunded';

export const theStatesSheCanBeIn: readonly WhatSheIsEntitledTo[] = [
  'neverPaid',
  'freeMonth',
  'paid',
  'cancelling',
  'lapsed',
  'refunded',
];

/** The offer kind App Store Connect writes for the one free month of contract PAY-1. */
export const THE_FREE_MONTH_IS_AN_OFFER_OF_KIND = 'introductory';

/** The payment mode of that offer, which is what makes the first period cost nothing. */
export const THE_FREE_MONTH_IS_PAID_AS = 'free-trial';

/**
 * One transaction, as the store describes it. Every instant is in milliseconds since the start of
 * 1970, which is the unit StoreKit answers in.
 */
export interface WhatTheStoreSaysAboutATransaction {
  readonly productIdentifier: string;
  /** The identifier that survives every renewal, which is the one the server asks Apple about. */
  readonly originalTransactionIdentifier: string;
  readonly expiresAtInMilliseconds: number | null;
  /** Set where the App Store refunded the transaction or took it back. */
  readonly revokedAtInMilliseconds: number | null;
  readonly renewsItself: boolean;
  readonly inBillingRetry: boolean;
  readonly graceEndsAtInMilliseconds: number | null;
  readonly offerKind: string | null;
  readonly offerPaymentMode: string | null;
}

/** The answer, as the phone holds it and as a screen reads it. */
export interface WhatSheIsEntitledToNow {
  readonly state: WhatSheIsEntitledTo;
  /** The instant she is covered to, or the instant the cover stopped. Absent where she never paid. */
  readonly until: string | null;
  /** One of the product identifiers of contract PAY-1. */
  readonly plan: string | null;
  readonly transaction: string | null;
  /** When this answer was worked out, so a stale answer can be told from a fresh one. */
  readonly readAt: string;
}

function emiSells(one: WhatTheStoreSaysAboutATransaction): boolean {
  return theProductsEmiSells.some((product) => product.identifier === one.productIdentifier);
}

function wasTakenBack(one: WhatTheStoreSaysAboutATransaction, atMilliseconds: number): boolean {
  return one.revokedAtInMilliseconds !== null && one.revokedAtInMilliseconds <= atMilliseconds;
}

/**
 * A transaction the App Store took back entitles her to nothing from the instant of the refund,
 * which is Apple's own rule: a refunded or revoked product is not a current entitlement.
 */
function coversHerAt(one: WhatTheStoreSaysAboutATransaction, atMilliseconds: number): boolean {
  if (wasTakenBack(one, atMilliseconds)) {
    return false;
  }

  if (one.expiresAtInMilliseconds === null || one.expiresAtInMilliseconds > atMilliseconds) {
    return true;
  }

  if (one.inBillingRetry) {
    return true;
  }

  return one.graceEndsAtInMilliseconds !== null && one.graceEndsAtInMilliseconds > atMilliseconds;
}

function isTheFreeMonth(one: WhatTheStoreSaysAboutATransaction): boolean {
  return (
    one.offerKind === THE_FREE_MONTH_IS_AN_OFFER_OF_KIND &&
    one.offerPaymentMode === THE_FREE_MONTH_IS_PAID_AS
  );
}

/** A transaction with no expiry covers her for ever, so it sorts ahead of every dated one. */
function theFurthestOf(
  these: readonly WhatTheStoreSaysAboutATransaction[],
): WhatTheStoreSaysAboutATransaction | undefined {
  return [...these].sort((left, right) => {
    const of = (one: WhatTheStoreSaysAboutATransaction): number =>
      one.expiresAtInMilliseconds ?? Number.POSITIVE_INFINITY;

    return of(right) - of(left);
  })[0];
}

function whenItStopped(
  one: WhatTheStoreSaysAboutATransaction,
  atMilliseconds: number,
): number | null {
  return wasTakenBack(one, atMilliseconds)
    ? one.revokedAtInMilliseconds
    : one.expiresAtInMilliseconds;
}

/**
 * The transaction that stopped last, which decides whether she reads a lapse or a refund. A refund
 * from a year ago must not make this month's ordinary lapse read as a refund. Where two stopped on
 * the same instant the refund decides, because money went back to her.
 */
function theLastToStop(
  these: readonly WhatTheStoreSaysAboutATransaction[],
  atMilliseconds: number,
): WhatTheStoreSaysAboutATransaction | undefined {
  return [...these]
    .filter((one) => whenItStopped(one, atMilliseconds) !== null)
    .sort((left, right) => {
      const apart =
        (whenItStopped(right, atMilliseconds) ?? 0) - (whenItStopped(left, atMilliseconds) ?? 0);

      if (apart !== 0) {
        return apart;
      }

      return (
        Number(wasTakenBack(right, atMilliseconds)) - Number(wasTakenBack(left, atMilliseconds))
      );
    })[0];
}

function anInstantOf(milliseconds: number | null): string | null {
  return milliseconds === null ? null : new Date(milliseconds).toISOString();
}

/** What these transactions entitle her to at this instant. */
export function whatTheseTransactionsEntitleHerTo(
  said: readonly WhatTheStoreSaysAboutATransaction[],
  now: Date,
): WhatSheIsEntitledToNow {
  const atMilliseconds = now.getTime();
  const readAt = now.toISOString();
  const hers = said.filter(emiSells);
  const covering = hers.filter((one) => coversHerAt(one, atMilliseconds));
  const furthest = theFurthestOf(covering);

  if (furthest !== undefined) {
    return {
      state: !furthest.renewsItself
        ? 'cancelling'
        : isTheFreeMonth(furthest)
          ? 'freeMonth'
          : 'paid',
      until: anInstantOf(furthest.expiresAtInMilliseconds),
      plan: furthest.productIdentifier,
      transaction: furthest.originalTransactionIdentifier,
      readAt,
    };
  }

  const last = theLastToStop(hers, atMilliseconds);

  if (last === undefined) {
    return { state: 'neverPaid', until: null, plan: null, transaction: null, readAt };
  }

  return {
    state: wasTakenBack(last, atMilliseconds) ? 'refunded' : 'lapsed',
    until: anInstantOf(whenItStopped(last, atMilliseconds)),
    plan: last.productIdentifier,
    transaction: last.originalTransactionIdentifier,
    readAt,
  };
}

/**
 * How this half reaches the store. A test hands it one that answers without a store, and the phone
 * hands it the purchase library.
 *
 * The connection is opened before the read, because the store refuses a read on a connection
 * nobody opened and the refusal reads the same as a store that is down.
 */
export interface ReadsWhatSheHoldsInTheStore {
  readonly open: () => Promise<unknown>;
  readonly whatSheHolds: () => Promise<readonly WhatTheStoreSaysAboutATransaction[]>;
  /**
   * A renewal, a purchase on another device and a refund all reach the application this way, with
   * nobody pressing anything. The call raises where the native module is absent, which is every
   * build without it, so a caller treats a watch it cannot attach as a watch that sees nothing.
   */
  readonly whenATransactionArrives: (tell: () => void) => { readonly remove: () => void };
}
