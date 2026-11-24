import { accountIdFor, base64Of, sealRecord } from '@emi/crypto';

import type { HttpRequestEvent, HttpResponse } from '../src/api';

import { theAppleStore, theYearlyProduct } from '../src/payments/appStore';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import type { StopsEveryRenewal } from '../src/payments/stopRenewals';
import {
  aSubscriptionIsNeeded,
  paymentIsRequired,
  saysWhetherSheMayWrite,
} from '../src/payments/writeGate';
import {
  nothingAnswersThatPath,
  routeKeyOf,
  router,
  type WhatTheStoreRouteNeeds,
} from '../src/router';
import { dynamoStore } from '../src/store/dynamo';
import {
  aTransactionId,
  fakeAppStore,
  theCredential,
  theOriginalTransactionId,
} from './fixtures/appStore';
import { fakeTable, type FakeTable, tableName } from './fixtures/dynamoTable';
import {
  anAccount,
  authorizedEvent,
  keyPairFromSeed,
  registrationBodyWithRecovery,
  signedRequest,
} from './fixtures/requests';

/**
 * One function answers four routes, so the dispatch is the thing that decides whether a request
 * reaches the handler that owes it an answer. Each case drives a whole request and reads the answer
 * the caller is left with, rather than reading which handler was picked.
 */

const pair = keyPairFromSeed(11);
const accountId = accountIdFor(pair.publicKey);
const vaultKey = new Uint8Array(32).fill(5);
const recordId = '019826c2-4d00-7a1b-8c3d-0f1e2a3b4c5d';
const now = new Date('2026-09-28T09:00:00.000Z');
const aYearOn = '2027-09-28T09:00:00.000Z';

/**
 * The table one case answers over, with her account on it and the year she bought written the way
 * the filing route writes it, because a put reaches no handler at all without one.
 */
async function aTable(withAnAccount: boolean, paidUntil = aYearOn): Promise<FakeTable> {
  const table = fakeTable();
  const store = dynamoStore(table, tableName);

  if (withAnAccount) {
    await store.createAccount(anAccount(pair, now));
    await store.writeSubscription({
      accountId,
      subscribedUntil: paidUntil,
      subscriptionStore: theAppleStore,
      subscriptionTransaction: theOriginalTransactionId,
      subscriptionCheckedAt: now.toISOString(),
      subscriptionState: 'active',
      subscriptionEventAt: Math.floor(now.getTime() / 1000),
      subscriptionPlan: theYearlyProduct,
    });
  }

  return table;
}

/**
 * The renewal a delete stops. No case here links a card payment to an account, so this answers
 * that there was nothing to stop, and a route that started reaching Stripe would fail rather than
 * pass.
 */
const stopsNothing: StopsEveryRenewal = (payerDigests) => {
  expect(payerDigests).toEqual([]);

  return Promise.resolve(0);
};

/** The App Store the filing route asks, which answers one yearly subscription of the sandbox. */
const theStore = (): WhatTheStoreRouteNeeds => ({
  reaches: fakeAppStore().reaches,
  apiKey: () => Promise.resolve(theCredential),
});

function answeringOver(table: FakeTable): ReturnType<typeof router> {
  const store = dynamoStore(table, tableName);

  return router(
    store,
    stopsNothing,
    theStore(),
    saysWhetherSheMayWrite({
      accounts: store,
      entitlements: dynamoEntitlementStore(table, tableName),
    }),
    () => now,
  );
}

/** One request, carried to the router over a table of its own. */
async function answering(event: HttpRequestEvent, withAnAccount = true): Promise<HttpResponse> {
  return answeringOver(await aTable(withAnAccount))(event);
}

function aSealedRecord(): string {
  const payload = sealRecord(
    { day: '2026-09-28', flow: 'light', recordedAt: now.toISOString() },
    vaultKey,
    { random: (count) => new Uint8Array(count).fill(4) },
  );

  return JSON.stringify({ revision: 1, payload: base64Of(payload) });
}

function errorIn(body: string): string {
  return (JSON.parse(body) as { error?: string }).error ?? '';
}

describe('one function answers the four signed routes and refuses every other path', () => {
  describe('the route a request reaches', () => {
    it('registers an account on a post to the accounts path', async () => {
      const body = registrationBodyWithRecovery(pair);
      const { event } = signedRequest(pair, {
        method: 'POST',
        path: '/v1/accounts',
        body,
        instant: now,
      });

      const answer = await answering(event, false);

      expect(answer.statusCode).toBe(201);
      expect(JSON.parse(answer.body)).toMatchObject({ accountId });
    });

    it('writes a record on a put to the path that carries its identifier', async () => {
      const body = aSealedRecord();
      const { event } = signedRequest(pair, {
        method: 'PUT',
        path: `/v1/records/${recordId}`,
        body,
        instant: now,
      });

      const answer = await answering(authorizedEvent(event, accountId));

      expect(answer.statusCode).toBe(200);
      expect(JSON.parse(answer.body)).toMatchObject({ revision: 1 });
    });

    it('refuses the same put, as the moment to pay, when the subscription ran out', async () => {
      const body = aSealedRecord();
      const { event } = signedRequest(pair, {
        method: 'PUT',
        path: `/v1/records/${recordId}`,
        body,
        instant: now,
      });

      const table = await aTable(true, '2026-09-01T09:00:00.000Z');
      const answer = await answeringOver(table)(authorizedEvent(event, accountId));

      expect(answer.statusCode).toBe(paymentIsRequired);
      expect(errorIn(answer.body)).toBe(aSubscriptionIsNeeded);
      expect(table.items().some((item) => 'payload' in item)).toBe(false);
    });

    it('answers a page of records on a get of the records path', async () => {
      const { event } = signedRequest(pair, {
        method: 'GET',
        path: '/v1/records',
        instant: now,
      });

      const answer = await answering(authorizedEvent(event, accountId));

      expect(answer.statusCode).toBe(200);
      expect(JSON.parse(answer.body)).toMatchObject({ records: [] });
    });

    it('files a store transaction on a post to the store path', async () => {
      const body = JSON.stringify({ transactionId: aTransactionId });
      const { event } = signedRequest(pair, {
        method: 'POST',
        path: '/v1/payments/store',
        body,
        instant: now,
      });

      const answer = await answering(authorizedEvent(event, accountId));

      expect(answer.statusCode).toBe(200);
      expect(JSON.parse(answer.body)).toMatchObject({ subscribedUntil: expect.any(String) });
    });

    it('removes everything on a delete of the account path', async () => {
      const { event } = signedRequest(pair, {
        method: 'DELETE',
        path: '/v1/account',
        instant: now,
      });

      const answer = await answering(authorizedEvent(event, accountId));

      expect(answer.statusCode).toBe(200);
      expect(JSON.parse(answer.body)).toMatchObject({ deleted: true });
    });
  });

  describe('a path this service does not handle', () => {
    it('is answered 404, which is what the sign in route gets until it has a function', async () => {
      const { event } = signedRequest(pair, {
        method: 'POST',
        path: '/v1/sign-in/telegram',
        body: '{}',
        instant: now,
      });

      const answer = await answering(event);

      expect(answer.statusCode).toBe(404);
      expect(errorIn(answer.body)).toBe(nothingAnswersThatPath);
    });

    it('is answered 404 when the method is one no route carries', async () => {
      const { event } = signedRequest(pair, {
        method: 'DELETE',
        path: '/v1/records',
        instant: now,
      });

      const answer = await answering(authorizedEvent(event, accountId));

      expect(answer.statusCode).toBe(404);
    });

    it('names no route and no method in the refusal, so a caller learns nothing from it', async () => {
      const { event } = signedRequest(pair, {
        method: 'GET',
        path: '/v1/accounts',
        instant: now,
      });

      const answer = await answering(event);

      expect(answer.body).not.toContain('/v1/');
      expect(answer.body).not.toContain('GET');
    });

    it('reaches no store at all, so an unknown path costs no read of the table', async () => {
      const table = fakeTable();
      const { event } = signedRequest(pair, {
        method: 'GET',
        path: '/v1/nothing',
        instant: now,
      });

      await answeringOver(table)(event);

      expect(table.calls()).toMatchObject({ getItem: 0, putItem: 0, query: 0 });
    });
  });

  describe('the key one request is looked up by', () => {
    it('keeps the identifier of a record out of the key, so every write finds one route', () => {
      const { event } = signedRequest(pair, {
        method: 'PUT',
        path: `/v1/records/${recordId}`,
        body: aSealedRecord(),
        instant: now,
      });

      expect(routeKeyOf(event)).toBe('PUT /v1/records/');
      expect(routeKeyOf(event)).not.toContain(recordId);
    });

    it('reads the method as the signing string writes it, which is uppercase', () => {
      const { event } = signedRequest(pair, {
        method: 'GET',
        path: '/v1/records',
        instant: now,
      });

      expect(routeKeyOf({ ...event, requestContext: { http: { method: 'get' } } })).toBe(
        'GET /v1/records',
      );
    });
  });
});
