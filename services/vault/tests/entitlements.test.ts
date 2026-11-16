import { accountIdFor, payerDigestFor } from '@emi/crypto';

import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import {
  entitlementFields,
  entitlementSortKey,
  paymentPartitionFor,
  type EntitlementStore,
  type EntitlementWrite,
} from '../src/payments/entitlements';
import { dynamoStore, partitionFor } from '../src/store/dynamo';
import { fakeTable, tableName, type FakeTable } from './fixtures/dynamoTable';
import { anAccount, keyPairFromSeed } from './fixtures/requests';

/**
 * The payment record of contract PAY-5, against the table double the record store is held to. It
 * takes the request shapes DynamoDB takes and refuses what DynamoDB refuses, so the conditional
 * write proved here is the conditional write the deployed table carries out.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const payerDigest = payerDigestFor(userPoolId, 'SignInWithApple_000482910');
const anotherPayerDigest = payerDigestFor(userPoolId, 'Google_000913847');

const theFreeMonthEnded = '2026-12-16T09:00:00.000Z';
const theYearEnds = '2027-12-16T09:00:00.000Z';

/** The subscription created, in its free month, which is the first event the webhook reads. */
const subscriptionCreated: EntitlementWrite = {
  payerDigest,
  eventAt: 1_763_280_000,
  writtenAt: '2026-11-16T09:00:00.000Z',
  paidUntil: theFreeMonthEnded,
  route: 'card',
  state: 'active',
  subscriptionRef: 'sub_000000000001',
};

/** The first invoice paid, a month later, which moves the date a year forward. */
const invoicePaid: EntitlementWrite = {
  payerDigest,
  eventAt: 1_765_872_000,
  writtenAt: '2026-12-16T09:00:00.000Z',
  paidUntil: theYearEnds,
  state: 'active',
};

function aStore(): { store: EntitlementStore; table: FakeTable } {
  const table = fakeTable();

  return { store: dynamoEntitlementStore(table, tableName), table };
}

describe('the payment record', () => {
  describe('what one payment reads back as', () => {
    it('answers with nothing for a digest nobody has paid under', async () => {
      expect(await aStore().store.readEntitlement(payerDigest)).toBeUndefined();
    });

    it('reads back the date, the route and the state the event carried', async () => {
      const { store } = aStore();

      expect(await store.writeEntitlement(subscriptionCreated)).toBe('written');

      const held = await store.readEntitlement(payerDigest);

      expect(held?.payerDigest).toBe(payerDigest);
      expect(held?.paidUntil).toBe(theFreeMonthEnded);
      expect(held?.route).toBe('card');
      expect(held?.state).toBe('active');
      expect(held?.subscriptionRef).toBe('sub_000000000001');
      expect(held?.eventAt).toBe(subscriptionCreated.eventAt);
    });

    it('leaves a field no event wrote absent, rather than reading it back as nothing', async () => {
      const { store } = aStore();
      await store.writeEntitlement(subscriptionCreated);

      const held = await store.readEntitlement(payerDigest);

      expect(held).not.toHaveProperty('chargeRef');
      expect(held).not.toHaveProperty('payerRef');
    });

    it('keeps one payer apart from another, so two women never read one date', async () => {
      const { store } = aStore();
      await store.writeEntitlement(subscriptionCreated);

      expect(await store.readEntitlement(anotherPayerDigest)).toBeUndefined();
    });
  });

  describe('an event is ordered by the seconds it carries, because Stripe promises no order', () => {
    it('moves the date forward when the newer event arrives second', async () => {
      const { store } = aStore();
      await store.writeEntitlement(subscriptionCreated);

      expect(await store.writeEntitlement(invoicePaid)).toBe('written');
      expect((await store.readEntitlement(payerDigest))?.paidUntil).toBe(theYearEnds);
    });

    it('leaves the newer date in place when the older event arrives second', async () => {
      const { store } = aStore();
      await store.writeEntitlement(invoicePaid);

      expect(await store.writeEntitlement(subscriptionCreated)).toBe('older-event');
      expect((await store.readEntitlement(payerDigest))?.paidUntil).toBe(theYearEnds);
    });

    it('leaves every other field of the newer event in place as well', async () => {
      const { store } = aStore();
      await store.writeEntitlement({ ...invoicePaid, state: 'cancelling' });
      await store.writeEntitlement(subscriptionCreated);

      const held = await store.readEntitlement(payerDigest);

      expect(held?.state).toBe('cancelling');
      expect(held?.eventAt).toBe(invoicePaid.eventAt);
      expect(held).not.toHaveProperty('subscriptionRef');
    });

    it('refuses the same event twice, so a delivery repeated is a delivery ignored', async () => {
      const { store } = aStore();
      await store.writeEntitlement(subscriptionCreated);

      expect(await store.writeEntitlement(subscriptionCreated)).toBe('older-event');
    });

    it('keeps a field the newer event says nothing about', async () => {
      const { store } = aStore();
      await store.writeEntitlement(subscriptionCreated);
      await store.writeEntitlement(invoicePaid);

      expect((await store.readEntitlement(payerDigest))?.subscriptionRef).toBe('sub_000000000001');
    });

    it('holds the instant the first event landed, and moves the instant of the last one', async () => {
      const { store } = aStore();
      await store.writeEntitlement(subscriptionCreated);
      await store.writeEntitlement(invoicePaid);

      const held = await store.readEntitlement(payerDigest);

      expect(held?.firstSeenAt).toBe(subscriptionCreated.writtenAt);
      expect(held?.updatedAt).toBe(invoicePaid.writtenAt);
    });
  });

  describe('the item holds the sale and nothing of hers', () => {
    it('carries the fields PAY-5 names and no others', async () => {
      const { store, table } = aStore();
      await store.writeEntitlement({
        ...subscriptionCreated,
        payerRef: 'cus_000000000001',
        chargeRef: 'stars_000000000001',
      });

      const written = table.items()[0] ?? {};

      expect(Object.keys(written).sort()).toEqual([...entitlementFields].sort());
    });

    it('sits in a partition of its own, under the payer digest and never under an account', async () => {
      const { store, table } = aStore();
      await store.writeEntitlement(subscriptionCreated);

      const written = table.items()[0] ?? {};

      expect(written.pk).toEqual({ S: `PAY#${payerDigest}` });
      expect(written.sk).toEqual({ S: entitlementSortKey });
      expect(paymentPartitionFor(payerDigest)).toBe(`PAY#${payerDigest}`);
    });

    it('is unreachable from a query of the account partition', async () => {
      const table = fakeTable();
      const payments = dynamoEntitlementStore(table, tableName);
      const pair = keyPairFromSeed(5);
      const accountId = accountIdFor(pair.publicKey);

      await dynamoStore(table, tableName).createAccount(
        anAccount(pair, new Date('2026-11-16T09:00:00.000Z')),
      );
      await payments.writeEntitlement(subscriptionCreated);

      const answered = await table.query({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': { S: partitionFor(accountId) } },
      });

      expect(answered.Items).toHaveLength(1);
      expect(answered.Items[0]?.sk).toEqual({ S: 'META' });
      expect(answered.Items.map((item) => item.pk)).not.toContainEqual({
        S: paymentPartitionFor(payerDigest),
      });
    });

    it('reads one item by its whole key, so the payment needs no query at all', async () => {
      const { store, table } = aStore();
      await store.writeEntitlement(subscriptionCreated);
      await store.readEntitlement(payerDigest);

      expect(table.calls().query).toBe(0);
      expect(table.calls().putItem).toBe(0);
      expect(table.calls().deleteItem).toBe(0);
    });
  });

  describe('what the store will not write at all', () => {
    it.each([
      ['a digest that is too short', 'ABC'],
      ['a digest carrying a letter Crockford leaves out', 'IIIIIIIIIIIIIIIIIIIIIIIIII'],
      ['a digest in lower case', payerDigest.toLowerCase()],
    ])('refuses %s', async (_name, digest) => {
      const { store } = aStore();

      await expect(
        store.writeEntitlement({ ...subscriptionCreated, payerDigest: digest }),
      ).rejects.toThrow('Crockford base 32');
      await expect(store.readEntitlement(digest)).rejects.toThrow('Crockford base 32');
    });

    it.each([
      ['a date that is not an instant', '16 December 2026'],
      ['a date carrying no time at all', '2026-12-16'],
    ])('refuses %s', async (_name, paidUntil) => {
      const { store } = aStore();

      await expect(store.writeEntitlement({ ...subscriptionCreated, paidUntil })).rejects.toThrow(
        'runs to one written instant',
      );
    });

    it('refuses an event whose seconds are not a whole number', async () => {
      const { store } = aStore();

      await expect(
        store.writeEntitlement({ ...subscriptionCreated, eventAt: 1_763_280_000.5 }),
      ).rejects.toThrow('whole number of seconds');
    });

    it('writes nothing at all when it refuses', async () => {
      const { store, table } = aStore();

      await expect(store.writeEntitlement({ ...subscriptionCreated, eventAt: -1 })).rejects.toThrow(
        'whole number of seconds',
      );
      expect(table.items()).toEqual([]);
    });
  });
});
