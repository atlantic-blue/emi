import { accountIdFor } from '@emi/crypto';

import type { AccountStore } from '../src/store/accounts';
import { dynamoStore } from '../src/store/dynamo';
import { fakeTable, tableName } from './fixtures/dynamoTable';
import { memoryStore } from './fixtures/memoryStore';
import { anAccount, keyPairFromSeed } from './fixtures/requests';

/**
 * One suite over both stores. The register and authorizer tests run against the store held in
 * memory, and the record endpoints run against the DynamoDB one, so the two are held to the same
 * refusals here: a double that accepted what the table refuses would turn a red run green.
 */

const pair = keyPairFromSeed(3);
const accountId = accountIdFor(pair.publicKey);
const createdAt = '2026-09-18T10:00:00.000Z';

const stores: [string, () => AccountStore][] = [
  ['the store held in memory', () => memoryStore()],
  ['the store over DynamoDB', () => dynamoStore(fakeTable(), tableName)],
];

describe.each(stores)('%s', (_name, build) => {
  function account(id: string = accountId) {
    return anAccount(pair, new Date(createdAt), { accountId: id });
  }

  it('answers with nothing for an account nobody registered', async () => {
    expect(await build().readAccount(accountId)).toBeUndefined();
  });

  it('reads back the account it was given', async () => {
    const store = build();
    await store.createAccount(account());

    const held = await store.readAccount(accountId);

    expect(held?.accountId).toBe(accountId);
    expect(held?.publicKey).toEqual(pair.publicKey);
    expect(held?.createdAt).toBe(createdAt);
    expect(held?.recordCount).toBe(0);
  });

  it('refuses a second account under one identifier', async () => {
    const store = build();

    expect(await store.createAccount(account())).toBe('created');
    expect(await store.createAccount(account())).toBe('already-registered');
  });

  it('remembers a signature once and refuses it after that', async () => {
    const store = build();

    expect(await store.rememberSignature(accountId, 'a-signature', 1789000000)).toBe('remembered');
    expect(await store.rememberSignature(accountId, 'a-signature', 1789000000)).toBe('seen-before');
  });

  it('keeps one account signature apart from another account signature', async () => {
    const store = build();
    const other = accountIdFor(keyPairFromSeed(101).publicKey);

    await store.rememberSignature(accountId, 'a-signature', 1789000000);

    expect(await store.rememberSignature(other, 'a-signature', 1789000000)).toBe('remembered');
  });

  it('does not read a signature as an account', async () => {
    const store = build();
    await store.rememberSignature(accountId, 'a-signature', 1789000000);

    expect(await store.readAccount(accountId)).toBeUndefined();
  });
});
