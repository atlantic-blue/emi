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
   * Everything under one account, gone: the account item, every record, and every signature the
   * authorizer remembered, including the signature on the request that asked for this.
   */
  deleteEverything(accountId: string): Promise<AccountDeletion>;
}
