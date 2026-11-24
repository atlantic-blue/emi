/**
 * What the service asks of its storage, as a port. Naming the port rather than a client keeps the
 * handlers testable against a real engine without the handlers changing at all.
 */

/** The account item of section 6.4 of the design, as far as this step builds it. */
export interface StoredAccount {
  readonly accountId: string;
  readonly publicKey: Uint8Array;
  /**
   * Her vault key, sealed under the key her 26 written characters derive. The service holds these
   * bytes and no way at all to open them, which is the same sentence as the one about her days.
   */
  readonly wrappedVaultKey: Uint8Array;
  /** The sixteen bytes her code was derived with. Useless on its own, and useless with these. */
  readonly recoverySalt: Uint8Array;
  readonly createdAt: string;
  readonly recordCount: number;
}

/**
 * What a create answers. A conditional write refuses a second account under one identifier, so the
 * caller reads an outcome rather than catching the store's own error.
 */
export type CreateOutcome = 'created' | 'already-registered';

/** What a remember answers. A signature that was already written back is a replayed request. */
export type RememberOutcome = 'remembered' | 'seen-before';

/**
 * The three things this step needs from storage. Every one of them is a single item operation, so
 * nothing here needs a scan and nothing here reads another account.
 */
export interface AccountStore {
  /** The account, or nothing at all when no account holds that identifier. */
  readAccount(accountId: string): Promise<StoredAccount | undefined>;
  /** Writes the account only when the identifier is free, and says which of the two happened. */
  createAccount(account: StoredAccount): Promise<CreateOutcome>;
  /**
   * Writes the signature down and says whether it was already there. The instant window is what
   * bounds how long a signature has to be remembered for, so `expiresAt` is a cleanup and never the
   * defence: a store that forgot early would still refuse the request, because the window refuses
   * it first.
   */
  rememberSignature(
    accountId: string,
    signature: string,
    expiresAt: number,
  ): Promise<RememberOutcome>;
}

/**
 * What a delete took. The count is what storage removed, and it is an outcome rather than a proof:
 * contract WIRE-4 is proved by reading the table afterwards, because a service saying it deleted
 * something is the one claim that cannot check itself.
 */
export interface AccountDeletion {
  readonly itemsRemoved: number;
}

/**
 * The one thing a delete asks of storage. It is a port of its own rather than a fourth method on
 * `AccountStore`, so the authorizer, which is handed an `AccountStore` on every single request,
 * cannot reach a call that empties a partition.
 */
export interface AccountDeleteStore {
  /**
   * Who paid for the ways in that this account holds, read off the identity items before they go.
   * The link between an account and a payment lives on those items and nowhere else, so a delete
   * that removed them first would have no way left to find the renewal it has to stop.
   */
  payerDigestsOf(accountId: string): Promise<readonly string[]>;
  /**
   * Everything under one account, gone: the account item, every record, every identity, and every
   * signature the authorizer remembered, including the signature on the request that asked for
   * this.
   */
  deleteEverything(accountId: string): Promise<AccountDeletion>;
}

/**
 * The subscription an App Store purchase writes, which is the store half of contract PAY-5. Every
 * field of it comes from the answer Apple gave, and none of them from the body the phone sent.
 */
export interface StoredSubscription {
  readonly accountId: string;
  /** The instant she is paid until, or the instant of the refund where there was one. */
  readonly subscribedUntil: string;
  /** Which store took the money, so a second store can write its own name without a second shape. */
  readonly subscriptionStore: string;
  /** The original transaction identifier, which is what survives every renewal. */
  readonly subscriptionTransaction: string;
  /** When the server last asked the store, which is the instant of this write. */
  readonly subscriptionCheckedAt: string;
  /** Where the subscription stands, in the four words contract PAY-5 names. */
  readonly subscriptionState: string;
  /** The seconds of the store event that wrote these fields, which is the order of two writes. */
  readonly subscriptionEventAt: number;
  /** The product identifier she holds, which is one of the three contract PAY-1 names. */
  readonly subscriptionPlan: string;
}

/** What a subscription write answers. An older event is an outcome here rather than a failure. */
export type SubscriptionOutcome = 'written' | 'older-event';

/**
 * What claiming one purchase answers, which is contract PAY-9. The second account to file a
 * transaction reads `another-account`, and the account that already holds it reads `held-already`,
 * so a woman who files her own purchase twice is not refused.
 */
export type ClaimOutcome = 'claimed' | 'held-already' | 'another-account';

/**
 * The one thing a notification asks of storage, which is contract PAY-9 read rather than written.
 * A notification of the App Store names a transaction and never an account, so the pointer item is
 * the only way from one to the other.
 *
 * It is a port of its own rather than a third method on `SubscriptionStore`, so the route that
 * stands behind no authorizer is handed the read and the write of a date, and nothing else.
 */
export interface PurchasePointerStore {
  /** The account that filed one purchase, or nothing at all where no account filed it. */
  accountOfPurchase(transactionDigest: string): Promise<string | undefined>;
}

/**
 * The two things a filing asks of storage. It is a port of its own rather than two more methods on
 * `AccountStore`, so the authorizer, which is handed an `AccountStore` on every single request,
 * cannot reach a call that writes a date.
 */
export interface SubscriptionStore {
  /**
   * Writes the pointer item of contract PAY-9 unless its partition exists already, and says which
   * of the three happened. One purchase pays for one vault, so the condition is the rule: the
   * first account to file a transaction keeps it.
   */
  claimTransaction(transactionDigest: string, accountId: string): Promise<ClaimOutcome>;
  /**
   * Writes the subscription onto the account item unless the item already carries an event that is
   * newer, and says which happened. Apple retries a notification over three days, so a retried
   * expiry can arrive after the renewal that followed it.
   */
  writeSubscription(subscription: StoredSubscription): Promise<SubscriptionOutcome>;
}
