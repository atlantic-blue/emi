import { accountIdFor, refusalMessages, sealRecord } from '@emi/crypto';

import { authorizeRequest } from '../src/auth/authorizer';
import { accountPath, deleteAccountFor } from '../src/handlers/deleteAccount';
import { dynamoStore, partitionFor } from '../src/store/dynamo';
import {
  fakeTable,
  type FakeTable,
  type FakeTableOptions,
  tableName,
} from './fixtures/dynamoTable';
import { anAccount, authorizedEvent, keyPairFromSeed, signedRequest } from './fixtures/requests';

/**
 * Contract WIRE-4. Everything the table holds for one account, gone in one call, and every case
 * here reads the table afterwards rather than reading the answer: a service reporting that it
 * deleted something is the one claim it cannot check for itself.
 */

const pair = keyPairFromSeed(3);
const accountId = accountIdFor(pair.publicKey);
const otherPair = keyPairFromSeed(101);
const otherAccountId = accountIdFor(otherPair.publicKey);
const vaultKey = new Uint8Array(32).fill(7);

const registeredAt = new Date('2026-09-18T09:00:00.000Z');
const writtenAt = new Date('2026-09-18T10:00:00.000Z');
const deletedAt = new Date('2026-09-18T10:05:00.000Z');

const recordIds: readonly string[] = [
  '019826c2-4d00-7a1b-8c3d-0f1e2a3b4c5d',
  '019826c2-4d00-7b2c-9d4e-1f2a3b4c5d6e',
  '019826c2-4d00-7c3d-8e5f-2a3b4c5d6e7f',
];

function envelopeFor(day: string): Uint8Array {
  return sealRecord({ day, recordedAt: '2026-03-04T21:14:00.000Z' }, vaultKey, {
    random: (count) => new Uint8Array(count).fill(9),
  });
}

interface Seeded {
  readonly table: FakeTable;
  readonly store: ReturnType<typeof dynamoStore>;
}

/** An account holding `records` days, and a stranger's account beside it holding one. */
async function anAccountHolding(
  records: readonly string[],
  options: FakeTableOptions = {},
): Promise<Seeded> {
  const table = fakeTable(options);
  const store = dynamoStore(table, tableName);

  await store.createAccount(anAccount(pair, registeredAt));
  await store.createAccount(anAccount(otherPair, registeredAt));

  for (const [at, recordId] of records.entries()) {
    await store.writeRecord(accountId, {
      recordId,
      revision: 1,
      payload: envelopeFor(`2026-03-0${at + 1}`),
      updatedAt: new Date(writtenAt.getTime() + at * 1000).toISOString(),
    });
  }

  await store.writeRecord(otherAccountId, {
    recordId: recordIds[0] as string,
    revision: 1,
    payload: envelopeFor('2026-04-01'),
    updatedAt: writtenAt.toISOString(),
  });

  return { table, store };
}

interface Answered {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

/** The delete, through the authorizer first, exactly as the api runs it. */
async function sheDeletesEverything(
  seeded: Seeded,
  at: Date = deletedAt,
  body = '',
): Promise<Answered> {
  const { event, forAuthorizer } = signedRequest(pair, {
    method: 'DELETE',
    path: accountPath,
    body,
    instant: at,
  });
  const allowed = await authorizeRequest(forAuthorizer, seeded.store, at);

  expect(allowed.isAuthorized).toBe(true);

  const answered = await deleteAccountFor(
    authorizedEvent(event, allowed.context?.accountId as string),
    seeded.store,
  );

  return {
    status: answered.statusCode,
    body: JSON.parse(answered.body) as Record<string, unknown>,
  };
}

/** Every item the table holds under one partition, as the table holds it. */
function itemsUnder(table: FakeTable, whose: string): ReturnType<FakeTable['items']> {
  return table.items().filter((item) => {
    const pk = item.pk;

    return pk !== undefined && 'S' in pk && pk.S === partitionFor(whose);
  });
}

/** The sort keys her partition holds, with a remembered signature named by its kind. */
function sortKeysUnder(table: FakeTable, whose: string): string[] {
  return itemsUnder(table, whose)
    .map((item) => (item.sk !== undefined && 'S' in item.sk ? item.sk.S : ''))
    .map((sortKey) => (sortKey.startsWith('SIG#') ? 'a remembered signature' : sortKey))
    .sort();
}

describe('the endpoint that empties an account', () => {
  describe('an account with three days in it', () => {
    it('holds an account item, three records and the signature that asked, before the delete', async () => {
      const seeded = await anAccountHolding(recordIds);

      expect(itemsUnder(seeded.table, accountId)).toHaveLength(4);

      const { event, forAuthorizer } = signedRequest(pair, {
        method: 'DELETE',
        path: accountPath,
        body: '',
        instant: deletedAt,
      });
      await authorizeRequest(forAuthorizer, seeded.store, deletedAt);

      expect(itemsUnder(seeded.table, accountId)).toHaveLength(5);
      expect(event.rawPath).toBe(accountPath);
    });

    it('leaves no item at all, read from the table rather than from the answer', async () => {
      const seeded = await anAccountHolding(recordIds);

      await sheDeletesEverything(seeded);

      expect(itemsUnder(seeded.table, accountId)).toEqual([]);
    });

    it('takes the signature the authorizer had just remembered with it', async () => {
      const seeded = await anAccountHolding(recordIds);

      await sheDeletesEverything(seeded);

      const left = seeded.table
        .items()
        .map((item) => (item.sk !== undefined && 'S' in item.sk ? item.sk.S : ''));

      expect(left.filter((sortKey) => sortKey.startsWith('SIG#'))).toEqual([]);
    });

    it('says how many items went, which is the four it held and the signature', async () => {
      const seeded = await anAccountHolding(recordIds);

      const answered = await sheDeletesEverything(seeded);

      expect(answered).toEqual({ status: 200, body: { deleted: true, itemsRemoved: 5 } });
    });

    it('asks nothing first, so the call she made is the whole delete', async () => {
      const seeded = await anAccountHolding(recordIds);

      const answered = await sheDeletesEverything(seeded);

      expect(answered.status).toBe(200);
      expect(itemsUnder(seeded.table, accountId)).toEqual([]);
    });
  });

  describe('a read after it', () => {
    it('is refused as an unknown account, with a signature that was good a moment ago', async () => {
      const seeded = await anAccountHolding(recordIds);
      await sheDeletesEverything(seeded);

      const later = new Date(deletedAt.getTime() + 1000);
      const { forAuthorizer } = signedRequest(pair, {
        method: 'GET',
        path: '/v1/records',
        instant: later,
      });

      expect(await authorizeRequest(forAuthorizer, seeded.store, later)).toEqual({
        isAuthorized: false,
      });
    });

    it('finds no account to read, so a register of the same key starts from nothing', async () => {
      const seeded = await anAccountHolding(recordIds);
      await sheDeletesEverything(seeded);

      expect(await seeded.store.readAccount(accountId)).toBeUndefined();
    });
  });

  describe('nothing is kept back for later', () => {
    it('leaves no item carrying an expiry or a deletion instant of hers', async () => {
      const seeded = await anAccountHolding(recordIds);

      await sheDeletesEverything(seeded);

      const attributes = itemsUnder(seeded.table, accountId).flatMap((item) => Object.keys(item));

      expect(attributes).toEqual([]);
    });

    it('holds the same nothing thirty days later, because nothing was scheduled', async () => {
      const seeded = await anAccountHolding(recordIds);
      await sheDeletesEverything(seeded);

      const thirtyDaysOn = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { forAuthorizer } = signedRequest(pair, {
        method: 'GET',
        path: '/v1/records',
        instant: thirtyDaysOn,
      });

      expect(itemsUnder(seeded.table, accountId)).toEqual([]);
      expect(await authorizeRequest(forAuthorizer, seeded.store, thirtyDaysOn)).toEqual({
        isAuthorized: false,
      });
    });
  });

  describe('a stranger holding a record in the same table', () => {
    it('keeps every item of theirs, including the count of their records', async () => {
      const seeded = await anAccountHolding(recordIds);
      const before = itemsUnder(seeded.table, otherAccountId);

      await sheDeletesEverything(seeded);

      expect(itemsUnder(seeded.table, otherAccountId)).toEqual(before);
      expect((await seeded.store.readAccount(otherAccountId))?.recordCount).toBe(1);
    });
  });

  describe('more records than one read answers with', () => {
    const manyRecords = Array.from(
      { length: 7 },
      (_unused, at) => `019826c2-4d00-7${at}0f-8c3d-0f1e2a3b4c${String(at).padStart(2, '0')}`,
    );

    it('empties the partition across every page the table hands back', async () => {
      const seeded = await anAccountHolding(manyRecords, { itemsPerPage: 2 });

      expect(itemsUnder(seeded.table, accountId)).toHaveLength(8);

      await sheDeletesEverything(seeded);

      expect(itemsUnder(seeded.table, accountId)).toEqual([]);
      expect(itemsUnder(seeded.table, otherAccountId)).toHaveLength(2);
    });

    it('reads the two key attributes and never a payload, so a long history is not read back', async () => {
      const seeded = await anAccountHolding(manyRecords, { itemsPerPage: 2 });
      const read: string[] = [];
      const table = seeded.table;
      const askedFor = table.query;

      table.query = async (input) => {
        read.push(input.ProjectionExpression ?? 'everything');

        return askedFor(input);
      };

      await sheDeletesEverything({ ...seeded, store: dynamoStore(table, tableName) });

      expect(read.length).toBeGreaterThan(1);
      expect([...new Set(read)]).toEqual(['pk, sk']);
    });
  });

  describe('a table that will not let go of an item', () => {
    it('raises rather than answering that everything is gone', async () => {
      const kept = `${partitionFor(accountId)} REC#${recordIds[0] as string}`;
      const seeded = await anAccountHolding(recordIds, { refusesToDelete: kept });

      await expect(sheDeletesEverything(seeded)).rejects.toThrow(
        `the table still holds 1 item(s) under this account, starting at REC#${recordIds[0] as string}`,
      );
    });

    it('raises when the item it keeps is the account item itself', async () => {
      const kept = `${partitionFor(accountId)} META`;
      const seeded = await anAccountHolding(recordIds, { refusesToDelete: kept });

      await expect(sheDeletesEverything(seeded)).rejects.toThrow(
        'the table still holds 1 item(s) under this account, starting at META',
      );
      expect(sortKeysUnder(seeded.table, accountId)).toEqual(['META']);
    });

    it('leaves her the account item, so the press after it can finish the delete', async () => {
      const kept = `${partitionFor(accountId)} REC#${recordIds[0] as string}`;
      const seeded = await anAccountHolding(recordIds, { refusesToDelete: kept });

      await expect(sheDeletesEverything(seeded)).rejects.toThrow();

      expect(sortKeysUnder(seeded.table, accountId)).toEqual([
        'META',
        `REC#${recordIds[0] as string}`,
      ]);
    });
  });

  describe('a request the authorizer did not allow', () => {
    it('is refused, and the account still holds everything', async () => {
      const seeded = await anAccountHolding(recordIds);
      const { event } = signedRequest(pair, {
        method: 'DELETE',
        path: accountPath,
        instant: deletedAt,
      });

      const answered = await deleteAccountFor(event, seeded.store);

      expect(answered.statusCode).toBe(403);
      expect(JSON.parse(answered.body)).toEqual({
        error: refusalMessages['signature-does-not-verify'],
      });
      expect(itemsUnder(seeded.table, accountId)).toHaveLength(4);
    });

    it('is refused when the account it was allowed for is another one', async () => {
      const seeded = await anAccountHolding(recordIds);
      const { event } = signedRequest(pair, {
        method: 'DELETE',
        path: accountPath,
        instant: deletedAt,
      });

      const answered = await deleteAccountFor(authorizedEvent(event, otherAccountId), seeded.store);

      expect(answered.statusCode).toBe(403);
      expect(itemsUnder(seeded.table, accountId)).toHaveLength(4);
      expect(itemsUnder(seeded.table, otherAccountId)).toHaveLength(2);
    });
  });

  describe('a delete carrying something in its body', () => {
    it('is refused, because the signature is the whole of what this endpoint takes', async () => {
      const seeded = await anAccountHolding(recordIds);

      const answered = await sheDeletesEverything(seeded, deletedAt, '{"keep":"my notes"}');

      expect(answered).toEqual({
        status: 400,
        body: { error: 'a delete carries nothing beyond its signature' },
      });
      expect(itemsUnder(seeded.table, accountId)).toHaveLength(5);
    });

    it('is refused when the body does not match the digest that was signed', async () => {
      const seeded = await anAccountHolding(recordIds);
      const { event, forAuthorizer } = signedRequest(pair, {
        method: 'DELETE',
        path: accountPath,
        body: '',
        instant: deletedAt,
      });
      const allowed = await authorizeRequest(forAuthorizer, seeded.store, deletedAt);

      const answered = await deleteAccountFor(
        authorizedEvent({ ...event, body: 'something else' }, allowed.context?.accountId as string),
        seeded.store,
      );

      expect(answered.statusCode).toBe(403);
      expect(JSON.parse(answered.body)).toEqual({
        error: refusalMessages['body-hash-does-not-match'],
      });
      expect(itemsUnder(seeded.table, accountId)).toHaveLength(5);
    });
  });

  describe('the store on its own', () => {
    it('removes nothing and says so when the account holds nothing', async () => {
      const table = fakeTable();
      const store = dynamoStore(table, tableName);

      expect(await store.deleteEverything(accountId)).toEqual({ itemsRemoved: 0 });
      expect(table.items()).toEqual([]);
    });
  });
});
