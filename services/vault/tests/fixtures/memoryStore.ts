import type {
  AccountStore,
  CreateOutcome,
  RememberOutcome,
  StoredAccount,
} from '../../src/store/accounts';

/**
 * A store held in memory, keyed the way the table is keyed, so the mapping a DynamoDB
 * implementation needs is the mapping that is already here.
 *
 * It refuses everything the table refuses and nothing less. A conditional write is the table's own
 * refusal, so `createAccount` and `rememberSignature` both compare against what is already written.
 * A remembered signature is never forgotten here, because the table's expiry is a cleanup that runs
 * late, and a double that forgot on time would accept a request the table would still refuse.
 */
export interface MemoryStore extends AccountStore {
  /** Every key written, so a test can assert what an account partition holds. */
  keys(): string[];
}

const accountKey = (accountId: string): string => `ACC#${accountId}|META`;

const signatureKey = (accountId: string, signature: string): string =>
  `ACC#${accountId}|SIG#${signature}`;

export function memoryStore(): MemoryStore {
  const items = new Map<string, StoredAccount | number>();

  return {
    keys: () => [...items.keys()].sort(),

    readAccount: (accountId: string): Promise<StoredAccount | undefined> => {
      const held = items.get(accountKey(accountId));

      return Promise.resolve(typeof held === 'number' ? undefined : held);
    },

    createAccount: (account: StoredAccount): Promise<CreateOutcome> => {
      const key = accountKey(account.accountId);

      if (items.has(key)) {
        return Promise.resolve('already-registered');
      }

      items.set(key, account);

      return Promise.resolve('created');
    },

    rememberSignature: (
      accountId: string,
      signature: string,
      expiresAt: number,
    ): Promise<RememberOutcome> => {
      const key = signatureKey(accountId, signature);

      if (items.has(key)) {
        return Promise.resolve('seen-before');
      }

      items.set(key, expiresAt);

      return Promise.resolve('remembered');
    },
  };
}
