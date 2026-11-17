import { accountIdLength, crockfordAlphabet, instantAt } from '@emi/crypto';

/**
 * The payment record of contract PAY-5, as a port. It answers one question, which is whether a
 * payer digest is paid until a date.
 *
 * It sits in a partition of its own rather than under the account, so a query of an account
 * partition reaches no payment and a read of a payment reaches nothing of hers. The item carries
 * no account identifier and no record identifier, which is what lets a delete of her account leave
 * it exactly where it is.
 */

/** What every payment partition opens with. The role that writes one is held to this prefix. */
export const paymentPartitionPrefix = 'PAY#';

/** The partition one payment sits in, named by the digest and never by a person. */
export function paymentPartitionFor(payerDigest: string): string {
  return `${paymentPartitionPrefix}${payerDigest}`;
}

/** The sort key of the payment item. Its partition holds this item and never a second one. */
export const entitlementSortKey = 'META';

/** What she paid with. The account page is the only reader of it. */
export type EntitlementRoute = 'card' | 'stars';

/**
 * Where the subscription stands. `cancelling` is the renewal stopped while the year she paid for
 * still runs, so it reads as paid until that date passes.
 */
export type EntitlementState = 'active' | 'cancelling' | 'lapsed' | 'refunded';

/**
 * Every attribute this item may carry, which is the list contract PAY-5 names. A reader who holds
 * the table learns that a digest paid until a date, and anything outside this list would be a
 * second fact about a person.
 */
export const entitlementFields: readonly string[] = [
  'pk',
  'sk',
  'paidUntil',
  'route',
  'state',
  'payerRef',
  'subscriptionRef',
  'chargeRef',
  'eventAt',
  'firstSeenAt',
  'updatedAt',
];

/** The payment, as the table holds it. Every field but the three instants arrives from an event. */
export interface StoredEntitlement {
  readonly payerDigest: string;
  /** The instant she is paid until. Absent until the free month or the first payment lands. */
  readonly paidUntil?: string;
  readonly route?: EntitlementRoute;
  readonly state?: EntitlementState;
  /** The Stripe customer. Absent on the Stars route. */
  readonly payerRef?: string;
  /** The Stripe subscription. Absent on the Stars route. */
  readonly subscriptionRef?: string;
  /** The Telegram charge of the last payment. Absent on the card route. */
  readonly chargeRef?: string;
  readonly eventAt: number;
  readonly firstSeenAt: string;
  readonly updatedAt: string;
}

/**
 * One event, as far as it is about the money. A field this event says nothing about is left out
 * and the write keeps whatever an earlier event put there, so reading `invoice.paid` never drops
 * the subscription a `customer.subscription.created` wrote.
 */
export interface EntitlementWrite {
  readonly payerDigest: string;
  /**
   * The seconds of the event itself, which is the order. Stripe promises no order of delivery, so
   * a retry of yesterday's event can arrive after today's and this is the only thing that tells
   * them apart.
   */
  readonly eventAt: number;
  /** The instant of the write. It becomes `updatedAt`, and `firstSeenAt` on the first write. */
  readonly writtenAt: string;
  readonly paidUntil?: string;
  readonly route?: EntitlementRoute;
  readonly state?: EntitlementState;
  readonly payerRef?: string;
  readonly subscriptionRef?: string;
  readonly chargeRef?: string;
}

/** What a write answers. An older event is an outcome here rather than a failure. */
export type EntitlementOutcome = 'written' | 'older-event';

/**
 * The two calls the money needs. Neither one names an account, so nothing that holds this port can
 * reach a day of her history.
 */
export interface EntitlementStore {
  /** The payment, or nothing at all when nobody paid under that digest. */
  readEntitlement(payerDigest: string): Promise<StoredEntitlement | undefined>;
  /** Writes the event down unless the item already carries a newer one, and says which happened. */
  writeEntitlement(write: EntitlementWrite): Promise<EntitlementOutcome>;
}

/**
 * The digest, raised on unless it is the 26 characters a payer digest is. A key built from a value
 * somebody lost would be a partition like any other, so two callers that each lost a value would
 * pay into one record.
 */
export function checkedPayerDigest(payerDigest: string): string {
  const written =
    payerDigest.length === accountIdLength &&
    [...payerDigest].every((character) => crockfordAlphabet.includes(character));

  if (!written) {
    // The digest itself stays out of the message. It names no person, and a value that reaches an
    // error reaches a log line, which carries a request identifier and a duration and nothing else.
    throw new Error(
      `a payment is held under ${accountIdLength} characters of Crockford base 32, and this key is not that`,
    );
  }

  return payerDigest;
}

/**
 * The write, raised on unless every field of it is the shape the item takes. The conditional write
 * stands on `eventAt` alone, so an event carrying something that is not a number of seconds would
 * be ordered against nothing.
 */
export function checkedEntitlementWrite(write: EntitlementWrite): EntitlementWrite {
  checkedPayerDigest(write.payerDigest);

  if (!Number.isSafeInteger(write.eventAt) || write.eventAt < 0) {
    throw new Error(`an event is a whole number of seconds, and ${write.eventAt} is not one`);
  }

  if (instantAt(write.writtenAt) === null) {
    throw new Error(
      `a payment is written at one written instant, and "${write.writtenAt}" is not one`,
    );
  }

  if (write.paidUntil !== undefined && instantAt(write.paidUntil) === null) {
    throw new Error(`a payment runs to one written instant, and "${write.paidUntil}" is not one`);
  }

  return write;
}
