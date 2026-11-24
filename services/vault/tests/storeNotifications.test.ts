import { X509Certificate } from 'node:crypto';

import { accountIdFor } from '@emi/crypto';

import type { HttpRequestEvent, HttpResponse } from '../src/api';
import { appleRootG3, appleRoots } from '../src/payments/appleRoot';
import { theAppleStore, theMonthlyProduct, theYearlyProduct } from '../src/payments/appStore';
import { fileTransactionFor, storeSubscriptionPath } from '../src/payments/fileTransaction';
import {
  autoRenewDisabled,
  autoRenewEnabled,
  didRenew,
  expired,
  failedToRenew,
  gracePeriodExpired,
  notificationsTheRouteReads,
  refundReversed,
  refunded,
  renewalPlanChanged,
  renewalStatusChanged,
} from '../src/payments/storeEvents';
import {
  maximumNotificationBodyBytes,
  sendThatNotificationAgain,
  storeNotificationsFor,
  storeNotificationsPath,
  thatNotificationCannotBeRead,
  thatNotificationIsNotSigned,
  type WhatTheNotificationsNeed,
} from '../src/payments/storeNotifications';
import { type Item, dynamoStore } from '../src/store/dynamo';
import {
  aChain,
  aNotification,
  paidUntilNextYear,
  theChainOfAStranger,
  thePinnedRoots,
  type WhatANotificationSays,
} from './fixtures/appleNotifications';
import {
  aTransactionId,
  fakeAppStore,
  theCredential,
  theOriginalTransactionId,
} from './fixtures/appStore';
import { fakeTable, type FakeTable, tableName } from './fixtures/dynamoTable';
import { anAccount, authorizedEvent, keyPairFromSeed, signedRequest } from './fixtures/requests';

/**
 * Contract PAY-5 and contract PAY-9, read from the other end: Apple speaks first, nothing of Emi is
 * running on her phone, and the server has to find her vault from a transaction identifier alone.
 *
 * She buys the yearly plan and her phone files it, through the real route of the step before this
 * one, so the account item and the pointer item every case below reads are the ones that route
 * wrote. Apple's own chain of certificates cannot be made here, so the fixture writes a chain of
 * its own and the route is handed its root as the pinned one. The bytes Apple publishes are read in
 * the last case of the first group.
 */

const pair = keyPairFromSeed(31);
const accountId = accountIdFor(pair.publicKey);
const theFiling = new Date('2026-11-24T10:00:00.000Z');
const theNotification = new Date('2026-11-24T11:00:00.000Z');
const theRefundInstant = '2026-11-25T09:00:00.000Z';
const anotherYearOn = '2028-11-24T09:00:00.000Z';

const textOf = (value: Item[string] | undefined): string =>
  value !== undefined && 'S' in value ? value.S : '';

const numberOf = (value: Item[string] | undefined): number =>
  value !== undefined && 'N' in value ? Number(value.N) : Number.NaN;

const errorIn = (body: string): string => (JSON.parse(body) as { error?: string }).error ?? '';

const readBack = (answer: HttpResponse): Record<string, unknown> =>
  JSON.parse(answer.body) as Record<string, unknown>;

/** The account item, as the table holds it after a route ran. */
function accountItem(table: FakeTable): Item {
  return table.items().find((item) => textOf(item.pk) === `ACC#${accountId}`) ?? {};
}

/** The event the api gateway sends, which carries no signature and no authorizer of ours. */
function aPost(body: string): HttpRequestEvent {
  return {
    rawPath: storeNotificationsPath,
    headers: { 'content-type': 'application/json' },
    requestContext: { http: { method: 'POST' } },
    body,
  };
}

/**
 * Her account after she bought the yearly plan and her phone filed it. The filing is the real
 * route, so the pointer a notification finds is the one a purchase leaves behind.
 */
async function sheBoughtTheYearlyPlan(): Promise<FakeTable> {
  const table = fakeTable();
  const store = dynamoStore(table, tableName);

  await store.createAccount(anAccount(pair, theFiling));

  const { event } = signedRequest(pair, {
    method: 'POST',
    path: storeSubscriptionPath,
    body: JSON.stringify({ transactionId: aTransactionId }),
    instant: theFiling,
  });
  const filed = await fileTransactionFor(authorizedEvent(event, accountId), {
    store,
    reaches: fakeAppStore().reaches,
    apiKey: () => Promise.resolve(theCredential),
    clock: () => theFiling,
  });

  expect(filed.statusCode).toBe(200);
  expect(textOf(accountItem(table).subscribedUntil)).toBe(paidUntilNextYear);

  return table;
}

interface WhatACaseDrives extends WhatANotificationSays {
  /** The roots the route stands on, where a case wants it to stand on another set. */
  readonly roots?: readonly string[];
  /** The body, where a case wants one the fixture would not write. */
  readonly body?: string;
  /** The table a notification lands on, so two notifications meet one account. */
  readonly onThisTable?: FakeTable;
  /** The instant the route runs at. */
  readonly at?: Date;
  /** A store whose every call raises, so a table that cannot be reached is drivable. */
  readonly withNoTable?: boolean;
}

interface OneNotification {
  readonly answer: HttpResponse;
  readonly table: FakeTable;
  /** Every call the route made of the table, so a case reads that it made none. */
  readonly calls: () => ReturnType<FakeTable['calls']>;
}

const noTableAtAll: WhatTheNotificationsNeed['store'] = {
  accountOfPurchase: () => Promise.reject(new Error('the table was read')),
  claimTransaction: () => Promise.reject(new Error('the table was written')),
  writeSubscription: () => Promise.reject(new Error('the table was written')),
};

/** One notification, driven through the real route against the table her purchase left behind. */
async function aNotificationArrives(drives: WhatACaseDrives = {}): Promise<OneNotification> {
  const table = drives.onThisTable ?? (await sheBoughtTheYearlyPlan());
  const { roots, body, onThisTable, at, withNoTable, ...says } = drives;
  const before = table.calls();
  const answer = await storeNotificationsFor(aPost(body ?? aNotification(says)), {
    store: withNoTable === true ? noTableAtAll : dynamoStore(table, tableName),
    roots: roots ?? thePinnedRoots,
    clock: () => at ?? theNotification,
  });

  return {
    answer,
    table,
    calls: () => {
      const now = table.calls();

      return {
        putItem: now.putItem - before.putItem,
        getItem: now.getItem - before.getItem,
        updateItem: now.updateItem - before.updateItem,
        deleteItem: now.deleteItem - before.deleteItem,
        query: now.query - before.query,
      };
    },
  };
}

describe('a notification of the App Store writes the date on the account that filed the purchase', () => {
  describe('the signature is verified before one field of the body is read', () => {
    it('writes nothing for a body signed by a key the chain does not carry', async () => {
      const arrived = await aNotificationArrives({ signed: { byAnotherKey: true } });

      expect(arrived.answer.statusCode).toBe(400);
      expect(errorIn(arrived.answer.body)).toBe(thatNotificationIsNotSigned);
      expect(textOf(accountItem(arrived.table).subscribedUntil)).toBe(paidUntilNextYear);
      expect(textOf(accountItem(arrived.table).subscriptionState)).toBe('active');
    });

    it('reaches the table for nothing at all while the signature fails', async () => {
      const arrived = await aNotificationArrives({ signed: { byAnotherKey: true } });

      expect(arrived.calls()).toEqual({
        putItem: 0,
        getItem: 0,
        updateItem: 0,
        deleteItem: 0,
        query: 0,
      });
    });

    it('writes nothing for a chain that reaches a root this repository does not pin', async () => {
      const arrived = await aNotificationArrives({ signed: { chain: theChainOfAStranger } });

      expect(arrived.answer.statusCode).toBe(400);
      expect(errorIn(arrived.answer.body)).toBe(thatNotificationIsNotSigned);
      expect(textOf(accountItem(arrived.table).subscriptionState)).toBe('active');
    });

    it('writes nothing for a chain with a link nothing in it signed', async () => {
      const broken = aChain({ broken: true });
      const arrived = await aNotificationArrives({
        signed: { chain: broken },
        roots: [broken.root],
      });

      expect(arrived.answer.statusCode).toBe(400);
      expect(arrived.calls().updateItem).toBe(0);
    });

    it('writes nothing for a chain that ran out before the notification arrived', async () => {
      const old = aChain({ ranOut: true });
      const arrived = await aNotificationArrives({ signed: { chain: old }, roots: [old.root] });

      expect(arrived.answer.statusCode).toBe(400);
      expect(arrived.calls().updateItem).toBe(0);
    });

    it('writes nothing for a body that carries no signed payload at all', async () => {
      const arrived = await aNotificationArrives({ body: JSON.stringify({ hello: 'there' }) });

      expect(arrived.answer.statusCode).toBe(400);
      expect(errorIn(arrived.answer.body)).toBe(thatNotificationIsNotSigned);
      expect(arrived.calls().updateItem).toBe(0);
    });

    it('pins the root Apple publishes, which signs itself and may issue a certificate', () => {
      const root = new X509Certificate(Buffer.from(appleRootG3, 'base64'));

      expect(appleRoots).toEqual([appleRootG3]);
      expect(root.subject).toContain('CN=Apple Root CA - G3');
      expect(root.issuer).toBe(root.subject);
      expect(root.serialNumber).toBe('2DC5FC88D2C54B95');
      expect(root.verify(root.publicKey)).toBe(true);
      expect(root.ca).toBe(true);
      expect(root.validToDate.getUTCFullYear()).toBe(2039);
    });
  });

  describe('each kind of notification the design names', () => {
    it('writes the new date on a renewal, and leaves her paying', async () => {
      const arrived = await aNotificationArrives({
        type: didRenew,
        transaction: { expiresDate: Date.parse(anotherYearOn) },
      });
      const item = accountItem(arrived.table);

      expect(arrived.answer.statusCode).toBe(200);
      expect(readBack(arrived.answer).written).toBe(true);
      expect(textOf(item.subscribedUntil)).toBe(anotherYearOn);
      expect(textOf(item.subscriptionState)).toBe('active');
      expect(textOf(item.subscriptionStore)).toBe(theAppleStore);
      expect(textOf(item.subscriptionPlan)).toBe(theYearlyProduct);
      expect(textOf(item.subscriptionTransaction)).toBe(theOriginalTransactionId);
      expect(textOf(item.subscriptionCheckedAt)).toBe(theNotification.toISOString());
    });

    it('writes the instant the money went back on a refund, and leaves her refunded', async () => {
      const arrived = await aNotificationArrives({
        type: refunded,
        transaction: { revocationDate: Date.parse(theRefundInstant) },
      });
      const item = accountItem(arrived.table);

      expect(textOf(item.subscriptionState)).toBe('refunded');
      expect(textOf(item.subscribedUntil)).toBe(theRefundInstant);
    });

    it('puts the expiry back on a reversed refund, and leaves her paying', async () => {
      const refundArrived = await aNotificationArrives({
        type: refunded,
        transaction: { revocationDate: Date.parse(theRefundInstant) },
      });
      const arrived = await aNotificationArrives({
        onThisTable: refundArrived.table,
        type: refundReversed,
        notifiedAt: '2026-11-26T09:00:00.000Z',
        transaction: { revocationDate: Date.parse(theRefundInstant) },
      });
      const item = accountItem(arrived.table);

      expect(readBack(arrived.answer).written).toBe(true);
      expect(textOf(item.subscriptionState)).toBe('active');
      expect(textOf(item.subscribedUntil)).toBe(paidUntilNextYear);
    });

    it('leaves her lapsed on an expiry, at the date the subscription ran to', async () => {
      const arrived = await aNotificationArrives({
        type: expired,
        subtype: 'VOLUNTARY',
        transaction: { expiresDate: Date.parse('2026-11-24T10:30:00.000Z') },
      });
      const item = accountItem(arrived.table);

      expect(textOf(item.subscriptionState)).toBe('lapsed');
      expect(textOf(item.subscribedUntil)).toBe('2026-11-24T10:30:00.000Z');
    });

    it('keeps her writing when a renewal fails, because a lapse is humane', async () => {
      const arrived = await aNotificationArrives({ type: failedToRenew, subtype: 'GRACE_PERIOD' });

      expect(textOf(accountItem(arrived.table).subscriptionState)).toBe('active');
      expect(textOf(accountItem(arrived.table).subscribedUntil)).toBe(paidUntilNextYear);
    });

    it('leaves her lapsed when the grace period runs out', async () => {
      const arrived = await aNotificationArrives({ type: gracePeriodExpired });

      expect(textOf(accountItem(arrived.table).subscriptionState)).toBe('lapsed');
    });

    it('leaves her cancelling when she turns the renewal off, with the date she paid for', async () => {
      const arrived = await aNotificationArrives({
        type: renewalStatusChanged,
        subtype: autoRenewDisabled,
      });
      const item = accountItem(arrived.table);

      expect(textOf(item.subscriptionState)).toBe('cancelling');
      expect(textOf(item.subscribedUntil)).toBe(paidUntilNextYear);
    });

    it('leaves her paying when she turns the renewal back on', async () => {
      const off = await aNotificationArrives({
        type: renewalStatusChanged,
        subtype: autoRenewDisabled,
      });
      const arrived = await aNotificationArrives({
        onThisTable: off.table,
        type: renewalStatusChanged,
        subtype: autoRenewEnabled,
        notifiedAt: '2026-11-24T12:00:00.000Z',
      });

      expect(textOf(accountItem(arrived.table).subscriptionState)).toBe('active');
    });

    it('writes nothing when she picks another plan, because the crossgrade starts at the renewal', async () => {
      const arrived = await aNotificationArrives({
        type: renewalPlanChanged,
        subtype: 'DOWNGRADE',
        transaction: { productId: theMonthlyProduct },
      });
      const item = accountItem(arrived.table);

      expect(arrived.answer.statusCode).toBe(200);
      expect(readBack(arrived.answer).written).toBe(false);
      expect(textOf(item.subscriptionPlan)).toBe(theYearlyProduct);
      expect(numberOf(item.subscriptionEventAt)).toBe(
        Date.parse('2026-11-24T09:00:00.000Z') / 1000,
      );
    });

    it('takes a kind it does not act on and drops it, rather than refusing it for three days', async () => {
      const arrived = await aNotificationArrives({ type: 'SUBSCRIBED', subtype: 'INITIAL_BUY' });

      expect(arrived.answer.statusCode).toBe(200);
      expect(readBack(arrived.answer).written).toBe(false);
      expect(arrived.calls().updateItem).toBe(0);
    });

    it('names each kind once, so no case above reads a list with a hole in it', () => {
      expect(new Set(notificationsTheRouteReads).size).toBe(notificationsTheRouteReads.length);
      expect(notificationsTheRouteReads).toHaveLength(8);
    });
  });

  describe('two notifications about one subscription', () => {
    it('leaves the newer date in place when a retried expiry arrives after a renewal', async () => {
      const renewed = await aNotificationArrives({
        type: didRenew,
        notifiedAt: '2026-11-24T11:00:00.000Z',
        transaction: { expiresDate: Date.parse(anotherYearOn) },
      });
      const arrived = await aNotificationArrives({
        onThisTable: renewed.table,
        type: expired,
        // Apple retries a notification at 1, 12, 24, 48 and 72 hours, so this one was signed
        // before the renewal above and arrives after it.
        notifiedAt: '2026-11-24T10:30:00.000Z',
        at: new Date('2026-11-27T11:00:00.000Z'),
        transaction: { expiresDate: Date.parse('2026-11-24T09:00:00.000Z') },
      });
      const item = accountItem(arrived.table);

      expect(arrived.answer.statusCode).toBe(200);
      expect(readBack(arrived.answer).written).toBe(false);
      expect(textOf(item.subscribedUntil)).toBe(anotherYearOn);
      expect(textOf(item.subscriptionState)).toBe('active');
    });

    it('moves the date on a notification Apple signed later', async () => {
      const renewed = await aNotificationArrives({
        type: didRenew,
        notifiedAt: '2026-11-24T11:00:00.000Z',
        transaction: { expiresDate: Date.parse(anotherYearOn) },
      });
      const arrived = await aNotificationArrives({
        onThisTable: renewed.table,
        type: expired,
        notifiedAt: '2026-11-24T11:30:00.000Z',
        transaction: { expiresDate: Date.parse(anotherYearOn) },
      });

      expect(readBack(arrived.answer).written).toBe(true);
      expect(textOf(accountItem(arrived.table).subscriptionState)).toBe('lapsed');
    });

    it('orders the write by the instant Apple signed, and never by the instant it arrived', async () => {
      const arrived = await aNotificationArrives({
        type: didRenew,
        notifiedAt: '2026-11-24T11:00:00.000Z',
        at: new Date('2026-11-27T11:00:00.000Z'),
      });

      expect(numberOf(accountItem(arrived.table).subscriptionEventAt)).toBe(
        Date.parse('2026-11-24T11:00:00.000Z') / 1000,
      );
    });
  });

  describe('the sandbox and production are kept apart', () => {
    it('reads a sandbox notification against the sandbox, which the body names itself', async () => {
      const arrived = await aNotificationArrives({
        environment: 'Sandbox',
        transaction: { expiresDate: Date.parse(anotherYearOn) },
      });

      expect(arrived.answer.statusCode).toBe(200);
      expect(textOf(accountItem(arrived.table).subscribedUntil)).toBe(anotherYearOn);
    });

    it('writes nothing where the transaction names the other environment', async () => {
      const arrived = await aNotificationArrives({
        environment: 'Production',
        transaction: { environment: 'Sandbox' },
      });

      expect(arrived.answer.statusCode).toBe(400);
      expect(errorIn(arrived.answer.body)).toBe(thatNotificationCannotBeRead);
      expect(arrived.calls().updateItem).toBe(0);
    });

    it('writes nothing where the body names no environment this service knows', async () => {
      const arrived = await aNotificationArrives({ environment: 'Nowhere' });

      expect(arrived.answer.statusCode).toBe(400);
      expect(arrived.calls().updateItem).toBe(0);
    });

    it('writes nothing for a transaction of another application', async () => {
      const arrived = await aNotificationArrives({
        transaction: { bundleId: 'app.another.one' },
      });

      expect(arrived.answer.statusCode).toBe(400);
      expect(errorIn(arrived.answer.body)).toBe(thatNotificationCannotBeRead);
      expect(arrived.calls().updateItem).toBe(0);
    });
  });

  describe('what it writes nothing for', () => {
    it('a transaction no account ever filed, which is a notification with nowhere to write', async () => {
      const arrived = await aNotificationArrives({
        transaction: { originalTransactionId: '2000000845629999' },
      });

      expect(arrived.answer.statusCode).toBe(200);
      expect(readBack(arrived.answer).written).toBe(false);
      expect(arrived.calls().updateItem).toBe(0);
      expect(textOf(accountItem(arrived.table).subscribedUntil)).toBe(paidUntilNextYear);
    });

    it('a product Emi does not sell, whichever account holds the transaction', async () => {
      const arrived = await aNotificationArrives({
        transaction: { productId: 'blue.atlantic.emi.something-else' },
      });

      expect(arrived.answer.statusCode).toBe(200);
      expect(readBack(arrived.answer).written).toBe(false);
      expect(arrived.calls().updateItem).toBe(0);
    });

    it('a transaction that names no instant at all', async () => {
      const arrived = await aNotificationArrives({
        type: didRenew,
        transaction: { expiresDate: null },
      });

      expect(arrived.answer.statusCode).toBe(400);
      expect(errorIn(arrived.answer.body)).toBe(thatNotificationCannotBeRead);
      expect(arrived.calls().updateItem).toBe(0);
    });

    it('a body larger than a notification is, which is refused before it is read', async () => {
      const arrived = await aNotificationArrives({
        body: JSON.stringify({ signedPayload: 'x'.repeat(maximumNotificationBodyBytes + 1) }),
      });

      expect(arrived.answer.statusCode).toBe(413);
      expect(arrived.calls().getItem).toBe(0);
    });

    it('a table it could not reach, which the App Store is asked to send again', async () => {
      const arrived = await aNotificationArrives({ withNoTable: true, type: didRenew });

      expect(arrived.answer.statusCode).toBe(500);
      expect(errorIn(arrived.answer.body)).toBe(sendThatNotificationAgain);
    });
  });

  describe('the path App Store Connect is given', () => {
    it('is the address of the store route with the notifications under it', () => {
      expect(storeNotificationsPath).toBe(`${storeSubscriptionPath}/notifications`);
    });
  });
});
