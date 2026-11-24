import type { AuthorizerEvent, HttpRequestEvent } from '../../../../services/vault/src/api';
import {
  accountIdContextKey,
  authorizeRequest,
} from '../../../../services/vault/src/auth/authorizer';
import { registerAccount } from '../../../../services/vault/src/handlers/register';
import {
  storeSubscriptionPath,
  thatPurchaseBelongsToAnotherAccount,
} from '../../../../services/vault/src/payments/fileTransaction';
import { theAppleStore, theYearlyProduct } from '../../../../services/vault/src/payments/appStore';
import { dynamoEntitlementStore } from '../../../../services/vault/src/payments/dynamoEntitlements';
import type { StopsEveryRenewal } from '../../../../services/vault/src/payments/stopRenewals';
import { saysWhetherSheMayWrite } from '../../../../services/vault/src/payments/writeGate';
import { router } from '../../../../services/vault/src/router';
import { dynamoStore, type Item } from '../../../../services/vault/src/store/dynamo';
import {
  aTransactionId,
  fakeAppStore,
  paidUntil,
  theCredential,
  type WhatTheStoreAnswers,
} from '../../../../services/vault/tests/fixtures/appStore';
import {
  fakeTable,
  type FakeTable,
  tableName,
} from '../../../../services/vault/tests/fixtures/dynamoTable';
import { deviceKey, type DeviceKey } from '../../src/services/sync/deviceKey';
import { signRequestHeaders } from '../../src/services/sync/sign';
import { registrationBodyFor } from '../fixtures/registration';
import { fixedRandom, memorySecureStore } from '../fixtures/secureStore';

/**
 * Feature 7 step 9. She buys the yearly plan in the App Store, her phone files the transaction, and
 * the server writes the date Apple gave it.
 *
 * The phone signs with the code the application ships, the api gateway is the authorizer, and the
 * route, the store and the table are the real ones. Apple is the one double.
 */

const theLaunch = new Date('2026-11-24T10:00:00.000Z');
const aYearOn = '2027-11-24T09:00:00.000Z';

/**
 * The api gateway, as far as a signed request is concerned: the authorizer, then the function. The
 * instant is one argument for both, because the authorizer refuses a signature it has already seen
 * and a second filing is therefore a second instant as well as a second request.
 */
function theServer(table: FakeTable, answers: WhatTheStoreAnswers = {}, at: Date = theLaunch) {
  const store = dynamoStore(table, tableName);
  const stopsNothing: StopsEveryRenewal = () => Promise.resolve(0);
  const answer = router(
    store,
    stopsNothing,
    { reaches: fakeAppStore(answers).reaches, apiKey: () => Promise.resolve(theCredential) },
    saysWhetherSheMayWrite({
      accounts: store,
      entitlements: dynamoEntitlementStore(table, tableName),
    }),
    () => at,
  );

  return {
    store,
    carry: async (
      method: string,
      path: string,
      body: string,
      headers: Readonly<Record<string, string>>,
    ) => {
      const event: HttpRequestEvent = {
        rawPath: path,
        rawQueryString: '',
        headers,
        requestContext: { http: { method } },
        body,
        isBase64Encoded: false,
      };
      const forAuthorizer: AuthorizerEvent = {
        rawPath: event.rawPath,
        rawQueryString: event.rawQueryString,
        headers: event.headers,
        requestContext: event.requestContext,
      };
      const allowed = await authorizeRequest(forAuthorizer, store, at);

      if (!allowed.isAuthorized) {
        return { statusCode: 403, headers: {}, body: '{}', reachedTheFunction: false };
      }

      const answered = await answer({
        ...event,
        requestContext: {
          ...event.requestContext,
          authorizer: { lambda: { [accountIdContextKey]: allowed.context?.accountId ?? '' } },
        },
      });

      return { ...answered, reachedTheFunction: true };
    },
  };
}

async function aPhone(seed: number): Promise<DeviceKey> {
  return deviceKey(memorySecureStore(), fixedRandom(seed));
}

const textOf = (value: Item[string] | undefined): string =>
  value !== undefined && 'S' in value ? value.S : '';

function accountItem(table: FakeTable, accountId: string): Item {
  return table.items().find((item) => textOf(item.pk) === `ACC#${accountId}`) ?? {};
}

/** The phone, with an account on the server, ready to file what she just bought. */
async function herPhoneIsRegistered(
  server: ReturnType<typeof theServer>,
  seed: number,
): Promise<DeviceKey> {
  const key = await aPhone(seed);
  const body = registrationBodyFor(key.publicKey);

  await registerAccount(
    {
      rawPath: '/v1/accounts',
      rawQueryString: '',
      headers: signRequestHeaders(key, { method: 'POST', path: '/v1/accounts', body }, theLaunch),
      requestContext: { http: { method: 'POST' } },
      body,
      isBase64Encoded: false,
    },
    server.store,
    theLaunch,
  );

  return key;
}

/** One filing, signed by that phone the way the application signs every call. */
function fileTheTransaction(
  server: ReturnType<typeof theServer>,
  key: DeviceKey,
  at: Date = theLaunch,
) {
  const body = JSON.stringify({ transactionId: aTransactionId });

  return server.carry(
    'POST',
    storeSubscriptionPath,
    body,
    signRequestHeaders(key, { method: 'POST', path: storeSubscriptionPath, body }, at),
  );
}

describe('the filing route asks Apple and writes the date Apple gave', () => {
  describe('she buys the yearly plan in the App Store', () => {
    it('files it with her device key, and reads back the instant she is paid until', async () => {
      const table = fakeTable();
      const server = theServer(table);
      const key = await herPhoneIsRegistered(server, 7);

      const answered = await fileTheTransaction(server, key);

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({
        subscribedUntil: aYearOn,
        state: 'active',
        written: true,
      });
    });

    it('leaves the server holding the date, the plan and the state, and nothing about her card', async () => {
      const table = fakeTable();
      const server = theServer(table);
      const key = await herPhoneIsRegistered(server, 7);

      await fileTheTransaction(server, key);
      const held = accountItem(table, key.accountId);

      expect(textOf(held.subscribedUntil)).toBe(aYearOn);
      expect(textOf(held.subscriptionPlan)).toBe(theYearlyProduct);
      expect(textOf(held.subscriptionStore)).toBe(theAppleStore);
      expect(textOf(held.subscriptionState)).toBe('active');
      expect(JSON.stringify(table.items())).not.toMatch(/39000|EUR|DEU/);
    });

    it('files it again at the renewal, and is told the newer date rather than refused', async () => {
      const table = fakeTable();
      const server = theServer(table);
      const key = await herPhoneIsRegistered(server, 7);
      const theRenewal = new Date('2027-11-24T10:00:00.000Z');

      await fileTheTransaction(server, key);
      const renewed = theServer(
        table,
        {
          transactions: [
            paidUntil('2028-11-24T09:00:00.000Z', {
              signedDate: Date.parse('2027-11-24T09:00:00.000Z'),
            }),
          ],
        },
        theRenewal,
      );
      const again = await fileTheTransaction(renewed, key, theRenewal);

      expect(again.statusCode).toBe(200);
      expect(JSON.parse(again.body)).toMatchObject({ subscribedUntil: '2028-11-24T09:00:00.000Z' });
      expect(textOf(accountItem(table, key.accountId).subscribedUntil)).toBe(
        '2028-11-24T09:00:00.000Z',
      );
    });
  });

  describe('a second account that files her purchase', () => {
    it('reads that the subscription belongs to another Emi account', async () => {
      const table = fakeTable();
      const server = theServer(table);
      const hers = await herPhoneIsRegistered(server, 7);
      const somebodyElse = await herPhoneIsRegistered(server, 9);

      await fileTheTransaction(server, hers);
      const answered = await fileTheTransaction(server, somebodyElse);

      expect(answered.statusCode).toBe(409);
      expect(JSON.parse(answered.body)).toEqual({
        error: thatPurchaseBelongsToAnotherAccount,
      });
    });

    it('is left with no date, while hers stands', async () => {
      const table = fakeTable();
      const server = theServer(table);
      const hers = await herPhoneIsRegistered(server, 7);
      const somebodyElse = await herPhoneIsRegistered(server, 9);

      await fileTheTransaction(server, hers);
      await fileTheTransaction(server, somebodyElse);

      expect(accountItem(table, somebodyElse.accountId).subscribedUntil).toBeUndefined();
      expect(textOf(accountItem(table, hers.accountId).subscribedUntil)).toBe(aYearOn);
    });
  });

  describe('a filing nobody signed', () => {
    it('is refused by the authorizer, so it never reaches the route at all', async () => {
      const table = fakeTable();
      const server = theServer(table);
      const key = await herPhoneIsRegistered(server, 7);
      const body = JSON.stringify({ transactionId: aTransactionId });

      const answered = await server.carry('POST', storeSubscriptionPath, body, {});

      expect(answered.statusCode).toBe(403);
      expect(answered.reachedTheFunction).toBe(false);
      expect(accountItem(table, key.accountId).subscribedUntil).toBeUndefined();
    });
  });
});
