import { accountIdFor, payerDigestFor, refusalMessages, sealRecord } from '@emi/crypto';

import { authorizeRequest } from '../src/auth/authorizer';
import {
  accountPath,
  deleteAccountFor,
  theRenewalIsStillRunning,
} from '../src/handlers/deleteAccount';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import {
  entitlementSortKey,
  paymentPartitionFor,
  type EntitlementRoute,
  type EntitlementState,
  type EntitlementStore,
} from '../src/payments/entitlements';
import { stopsEveryRenewal, type StopsEveryRenewal } from '../src/payments/stopRenewals';
import { cancelAtPeriodEndField } from '../src/payments/stripe';
import { stripeSecretKeyOnce, stripeSecretKeyParameter } from '../src/payments/stripeSecrets';
import { dynamoStore, identitySortKeyPrefix, partitionFor } from '../src/store/dynamo';
import type { Item } from '../src/store/dynamo';
import type { ParameterStore } from '../src/telegram/parameters';
import {
  fakeTable,
  type FakeTable,
  type FakeTableOptions,
  tableName,
} from './fixtures/dynamoTable';
import { anAccount, authorizedEvent, keyPairFromSeed, signedRequest } from './fixtures/requests';
import { fakeStripe, updateOfTheSubscription, type FakeStripe } from './fixtures/stripe';

/**
 * Contract WIRE-4. Everything the table holds for one account, gone in one call, and every case
 * here reads the table afterwards rather than reading the answer: a service reporting that it
 * deleted something is the one claim it cannot check for itself.
 *
 * The renewal is the one thing a delete reaches outside the table. Stripe is a double that answers
 * what Stripe answers, so what is read here is the form the delete sent and the item the write
 * left behind.
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

/** The pool her ways in are minted by, and the user name one of them carries. */
const userPoolId = 'eu-central-1_NOTAPOOL';
const userName = 'SignInWithApple_000482910';
const payerDigest = payerDigestFor(userPoolId, userName);
/** Not the shape of a real key. A value that looked like one would be read as a leak. */
const theKey = 'the-key-the-operator-wrote-by-hand';
const theSubscription = 'sub_000000000001';
const theCustomer = 'cus_000000000001';
/** The end of the year she paid for, which a delete never moves. */
const theYearEnds = '2027-09-18T09:00:00.000Z';

function parametersHolding(held: Readonly<Record<string, string>>): ParameterStore {
  return {
    read: (name: string): Promise<string | undefined> => Promise.resolve(held[name]),
    writeIfAbsent: (): Promise<never> => Promise.reject(new Error('a delete writes no parameter')),
  };
}

interface Seeded {
  readonly table: FakeTable;
  readonly store: ReturnType<typeof dynamoStore>;
  readonly entitlements: EntitlementStore;
  readonly stripe: FakeStripe;
  readonly stopsRenewals: StopsEveryRenewal;
}

/** An account holding `records` days, and a stranger's account beside it holding one. */
async function anAccountHolding(
  records: readonly string[],
  options: FakeTableOptions = {},
  stripe: FakeStripe = fakeStripe(),
): Promise<Seeded> {
  const table = fakeTable(options);
  const store = dynamoStore(table, tableName);
  const entitlements = dynamoEntitlementStore(table, tableName);
  const stopsRenewals = stopsEveryRenewal({
    entitlements,
    reaches: stripe.reaches,
    secretKey: stripeSecretKeyOnce(parametersHolding({ [stripeSecretKeyParameter]: theKey })),
    clock: () => deletedAt,
  });

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

  return { table, store, entitlements, stripe, stopsRenewals };
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
    seeded.stopsRenewals,
  );

  return {
    status: answered.statusCode,
    body: JSON.parse(answered.body) as Record<string, unknown>,
  };
}

/** The digest one way in is named by, which is 26 characters of Crockford base 32. */
const identityDigest = (at: number): string => `0123456789ABCDEFGHJKMNPQR${at}`;

/** A way in she linked, carrying the digest of the payment made through it where there is one. */
async function sheLinked(seeded: Seeded, at: number, linkedPayerDigest?: string): Promise<void> {
  await seeded.table.putItem({
    TableName: tableName,
    Item: {
      pk: { S: partitionFor(accountId) },
      sk: { S: `${identitySortKeyPrefix}${identityDigest(at)}` },
      provider: { S: 'apple' },
      linkedAt: { S: registeredAt.toISOString() },
      ...(linkedPayerDigest === undefined ? {} : { payerDigest: { S: linkedPayerDigest } }),
    },
  });
}

/** The payment one digest holds, as the webhook of a new subscription left it. */
async function sheIsPaying(
  seeded: Seeded,
  moved: {
    readonly route?: EntitlementRoute;
    readonly state?: EntitlementState;
    readonly digest?: string;
    readonly subscriptionRef?: string;
  } = {},
): Promise<void> {
  await seeded.entitlements.writeEntitlement({
    payerDigest: moved.digest ?? payerDigest,
    eventAt: 1_758_186_000,
    writtenAt: '2026-09-18T09:00:00.000Z',
    paidUntil: theYearEnds,
    route: moved.route ?? 'card',
    state: moved.state ?? 'active',
    payerRef: theCustomer,
    subscriptionRef: moved.subscriptionRef ?? theSubscription,
  });
}

/** An account with one way in linked to one card payment that still renews. */
async function anAccountThatPays(stripe: FakeStripe = fakeStripe()): Promise<Seeded> {
  const seeded = await anAccountHolding(recordIds, {}, stripe);

  await sheLinked(seeded, 1, payerDigest);
  await sheIsPaying(seeded);

  return seeded;
}

/** The payment item itself, as the table holds it after the delete. */
function thePaymentItem(table: FakeTable, whose: string = payerDigest): Item | undefined {
  return table
    .items()
    .find(
      (item) =>
        item.pk !== undefined &&
        'S' in item.pk &&
        item.pk.S === paymentPartitionFor(whose) &&
        item.sk !== undefined &&
        'S' in item.sk &&
        item.sk.S === entitlementSortKey,
    );
}

/** Every call the delete made to Stripe to stop a renewal. */
function cancelCallsOf(stripe: FakeStripe): { subscription: string; stopping: string }[] {
  return stripe
    .calls()
    .filter((call) => call.address.startsWith(`${updateOfTheSubscription('')}`))
    .map((call) => ({
      subscription: call.address.slice(call.address.lastIndexOf('/') + 1),
      stopping: stripe.fieldsOf(call)[cancelAtPeriodEndField] ?? '',
    }));
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

    it('reads the keys and the link to a payment, and never a payload, so a long history is not read back', async () => {
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
      expect([...new Set(read)].sort()).toEqual(['pk, sk', 'sk, payerDigest']);
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

      const answered = await deleteAccountFor(event, seeded.store, seeded.stopsRenewals);

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

      const answered = await deleteAccountFor(
        authorizedEvent(event, otherAccountId),
        seeded.store,
        seeded.stopsRenewals,
      );

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
        seeded.stopsRenewals,
      );

      expect(answered.statusCode).toBe(403);
      expect(JSON.parse(answered.body)).toEqual({
        error: refusalMessages['body-hash-does-not-match'],
      });
      expect(itemsUnder(seeded.table, accountId)).toHaveLength(5);
    });
  });

  describe('the renewal of a card payment behind the account', () => {
    it('tells Stripe to stop at the end of the period she paid for', async () => {
      const seeded = await anAccountThatPays();

      await sheDeletesEverything(seeded);

      expect(cancelCallsOf(seeded.stripe)).toEqual([
        { subscription: theSubscription, stopping: 'true' },
      ]);
    });

    it('leaves the payment item in the table, with the date she paid until untouched', async () => {
      const seeded = await anAccountThatPays();

      await sheDeletesEverything(seeded);

      const held = thePaymentItem(seeded.table);

      expect(held?.paidUntil).toEqual({ S: theYearEnds });
      expect(held?.state).toEqual({ S: 'cancelling' });
      expect(held?.route).toEqual({ S: 'card' });
    });

    it('holds no account identifier of hers afterwards, so the item names no person', async () => {
      const seeded = await anAccountThatPays();

      await sheDeletesEverything(seeded);

      const held = thePaymentItem(seeded.table) ?? {};
      const written = Object.entries(held)
        .map(([name, value]) => `${name} ${'S' in value ? value.S : ''}`)
        .join('\n');

      expect(Object.keys(held).sort()).toEqual([
        'eventAt',
        'firstSeenAt',
        'paidUntil',
        'payerRef',
        'pk',
        'route',
        'sk',
        'state',
        'subscriptionRef',
        'updatedAt',
      ]);
      expect(written).not.toContain(accountId);
      expect(written).not.toContain(recordIds[0] as string);
    });

    it('empties her account partition all the same, so the delete still happened', async () => {
      const seeded = await anAccountThatPays();

      const answered = await sheDeletesEverything(seeded);

      expect(answered.status).toBe(200);
      expect(itemsUnder(seeded.table, accountId)).toEqual([]);
    });

    it('takes the identity item that named the payment, so no account points at it', async () => {
      const seeded = await anAccountThatPays();

      await sheDeletesEverything(seeded);

      expect(sortKeysUnder(seeded.table, accountId)).toEqual([]);
      expect(thePaymentItem(seeded.table)).toBeDefined();
    });

    it('stops the renewal of each way in she linked, and each one once', async () => {
      const seeded = await anAccountThatPays();
      const second = payerDigestFor(userPoolId, 'Google_000482911');
      const otherSubscription = 'sub_000000000002';

      await sheLinked(seeded, 2, second);
      await sheIsPaying(seeded, { digest: second, subscriptionRef: otherSubscription });

      await sheDeletesEverything(seeded);

      expect(cancelCallsOf(seeded.stripe)).toEqual([
        { subscription: theSubscription, stopping: 'true' },
        { subscription: otherSubscription, stopping: 'true' },
      ]);
      expect(thePaymentItem(seeded.table, second)?.state).toEqual({ S: 'cancelling' });
    });
  });

  describe('an account with no renewal to stop', () => {
    it('reaches Stripe not at all when she never paid', async () => {
      const seeded = await anAccountHolding(recordIds);

      const answered = await sheDeletesEverything(seeded);

      expect(seeded.stripe.calls()).toEqual([]);
      expect(answered.status).toBe(200);
      expect(itemsUnder(seeded.table, accountId)).toEqual([]);
    });

    it('reaches Stripe not at all when a way in she linked names no payment', async () => {
      const seeded = await anAccountHolding(recordIds);

      await sheLinked(seeded, 3);

      await sheDeletesEverything(seeded);

      expect(seeded.stripe.calls()).toEqual([]);
    });

    it('leaves a payment made with Stars alone, because she cancels that in Telegram', async () => {
      const seeded = await anAccountHolding(recordIds);

      await sheLinked(seeded, 4, payerDigest);
      await sheIsPaying(seeded, { route: 'stars' });

      await sheDeletesEverything(seeded);

      expect(seeded.stripe.calls()).toEqual([]);
      expect(thePaymentItem(seeded.table)?.state).toEqual({ S: 'active' });
    });

    it.each(['cancelling', 'lapsed'] as const)(
      'leaves a payment that is already %s alone, because nothing of it renews',
      async (state) => {
        const seeded = await anAccountHolding(recordIds);

        await sheLinked(seeded, 5, payerDigest);
        await sheIsPaying(seeded, { state });

        await sheDeletesEverything(seeded);

        expect(seeded.stripe.calls()).toEqual([]);
        expect(thePaymentItem(seeded.table)?.state).toEqual({ S: state });
      },
    );
  });

  describe('a Stripe that will not stop the renewal', () => {
    const refused = {
      status: 402,
      body: JSON.stringify({ error: { type: 'card_error', code: 'subscription_missing' } }),
    };

    it('refuses the delete and removes nothing, so the press after it is the same press', async () => {
      const seeded = await anAccountThatPays(fakeStripe({ refusesTheSubscription: refused }));

      const answered = await sheDeletesEverything(seeded);

      expect(answered).toEqual({ status: 502, body: { error: theRenewalIsStillRunning } });
      expect(itemsUnder(seeded.table, accountId)).toHaveLength(6);
    });

    it('leaves the payment item exactly as it stood, still renewing', async () => {
      const seeded = await anAccountThatPays(fakeStripe({ refusesTheSubscription: refused }));
      const before = thePaymentItem(seeded.table);

      await sheDeletesEverything(seeded);

      expect(thePaymentItem(seeded.table)).toEqual(before);
      expect(thePaymentItem(seeded.table)?.state).toEqual({ S: 'active' });
    });

    it('answers the same way when Stripe cannot be reached at all', async () => {
      const seeded = await anAccountThatPays({
        ...fakeStripe(),
        reaches: () => Promise.reject(new Error('the network went away')),
      });

      const answered = await sheDeletesEverything(seeded);

      expect(answered.status).toBe(502);
      expect(itemsUnder(seeded.table, accountId)).toHaveLength(6);
    });

    it('answers the same way when the parameter store holds no key', async () => {
      const seeded = await anAccountHolding(recordIds);
      const withNoKey = stopsEveryRenewal({
        entitlements: seeded.entitlements,
        reaches: seeded.stripe.reaches,
        secretKey: stripeSecretKeyOnce(parametersHolding({})),
        clock: () => deletedAt,
      });

      await sheLinked(seeded, 6, payerDigest);
      await sheIsPaying(seeded);

      const answered = await sheDeletesEverything({ ...seeded, stopsRenewals: withNoKey });

      expect(answered).toEqual({ status: 502, body: { error: theRenewalIsStillRunning } });
      expect(itemsUnder(seeded.table, accountId)).toHaveLength(6);
    });

    it('lets the press after it finish, once Stripe answers', async () => {
      const seeded = await anAccountThatPays(fakeStripe({ refusesTheSubscription: refused }));

      expect((await sheDeletesEverything(seeded)).status).toBe(502);
      expect(await seeded.store.readAccount(accountId)).toBeDefined();

      const answering = fakeStripe();
      const second = await sheDeletesEverything(
        {
          ...seeded,
          stripe: answering,
          stopsRenewals: stopsEveryRenewal({
            entitlements: seeded.entitlements,
            reaches: answering.reaches,
            secretKey: stripeSecretKeyOnce(
              parametersHolding({ [stripeSecretKeyParameter]: theKey }),
            ),
            clock: () => deletedAt,
          }),
        },
        new Date(deletedAt.getTime() + 1000),
      );

      expect(second.status).toBe(200);
      expect(cancelCallsOf(answering)).toEqual([
        { subscription: theSubscription, stopping: 'true' },
      ]);
      expect(itemsUnder(seeded.table, accountId)).toEqual([]);
      expect(thePaymentItem(seeded.table)?.paidUntil).toEqual({ S: theYearEnds });
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
