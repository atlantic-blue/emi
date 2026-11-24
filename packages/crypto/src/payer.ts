import { digestOf } from './signature';

/**
 * Who paid, to Stripe and to the table, and never who she is.
 *
 * The key cannot be the pool subject. The pool makes a subject when it makes a user, and the bot
 * sells a subscription to a woman the pool may hold no user for yet. The pool user name is the one
 * value both sides work out alone. For Apple, Google and Telegram it is also the part that comes
 * back after a delete, so a payment made one way in is found again by that same way in.
 */

/** Every way a digest refuses, as values, so a caller matches a reason and not words. */
export type PayerRefusal =
  'pool-is-missing' | 'user-name-is-missing' | 'store-is-missing' | 'transaction-is-missing';

/** Carries the refusal beside the message, the way the envelope and the signature do. */
export class PayerError extends Error {
  readonly refusal: PayerRefusal;

  constructor(refusal: PayerRefusal, message: string) {
    super(message);
    this.name = 'PayerError';
    this.refusal = refusal;
  }
}

/**
 * What separates the pool from the name. Without it two pairs run into one text, so a pool of
 * `ab` with a name of `cdef` would give the digest of a pool of `abc` with a name of `def`.
 */
export const payerDigestSeparator = '\n';

/**
 * The digest a payment is held under: the pool, a newline, and the pool user name, written in the
 * shape the account identifier is written in. The site reads the name out of the `cognito:username`
 * claim and the bot works the same name out of the Telegram subject, so one woman has one digest
 * whichever side reaches it.
 *
 * An empty part is refused rather than hashed. A digest of a missing value is a key like any
 * other, so two callers that each lost a value would pay into one record.
 */
export function payerDigestFor(poolId: string, userName: string): string {
  if (poolId.length === 0) {
    throw new PayerError('pool-is-missing', 'a payer digest needs the pool identifier');
  }

  if (userName.length === 0) {
    throw new PayerError('user-name-is-missing', 'a payer digest needs the pool user name');
  }

  return digestOf(new TextEncoder().encode(`${poolId}${payerDigestSeparator}${userName}`));
}

/**
 * The digest a purchase in a store is held under: the store name, a newline, and the original
 * transaction identifier, written in the shape the account identifier is written in. The separator
 * is the one above, so two parts cannot run into one text.
 *
 * The identifier itself is written nowhere. One account claims the digest, and a reader who holds
 * that partition cannot work the purchase back out of it.
 */
export function transactionDigestFor(store: string, transactionId: string): string {
  if (store.length === 0) {
    throw new PayerError('store-is-missing', 'a transaction digest needs the name of the store');
  }

  if (transactionId.length === 0) {
    throw new PayerError(
      'transaction-is-missing',
      'a transaction digest needs the original transaction identifier',
    );
  }

  return digestOf(new TextEncoder().encode(`${store}${payerDigestSeparator}${transactionId}`));
}
