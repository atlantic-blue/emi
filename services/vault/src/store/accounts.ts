/**
 * What the service asks of its storage, as a port. The DynamoDB implementation arrives with the
 * record endpoints in feature 6 step 3. Naming the port first keeps the handlers testable against a
 * real engine later without the handlers changing at all.
 */

/** The account item of section 6.4 of the design, as far as this step builds it. */
export interface StoredAccount {
  readonly accountId: string;
  readonly publicKey: Uint8Array;
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
