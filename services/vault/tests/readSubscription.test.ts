import { payerDigestFor } from '@emi/crypto';

import type { HttpRequestEvent } from '../src/api';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import type { EntitlementStore } from '../src/payments/entitlements';
import { issuerOfPool, userNameClaim } from '../src/payments/poolToken';
import {
  subscriptionFor,
  thatTokenReadsNothing,
  type WhatTheAccountPageReads,
} from '../src/payments/readSubscription';
import { subscriptionPath, thatTokenStartsNothing } from '../src/payments/startSubscription';
import { nothingAnswersThatMethod, subscriptionRoutes } from '../src/payments/subscriptionRoutes';
import { fakeTable, tableName, type FakeTable } from './fixtures/dynamoTable';
import { fakeStripe } from './fixtures/stripe';

/**
 * What her account page reads back, and what it may not.
 *
 * The item is written through the store the money writes it with, so what is read here is the item
 * the webhook leaves behind rather than a shape this file made up.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const userName = 'SignInWithApple_000482910';
const payerDigest = payerDigestFor(userPoolId, userName);
const theYearEnds = '2027-12-16T09:00:00.000Z';

function aRequest(method: string, claims?: Readonly<Record<string, string>>): HttpRequestEvent {
  return {
    rawPath: subscriptionPath,
    headers: {},
    requestContext: {
      http: { method },
      ...(claims === undefined ? {} : { authorizer: { jwt: { claims } } }),
    },
  };
}

function tokenOf(moved: Partial<Record<string, string>> = {}): Record<string, string> {
  const claims: Record<string, string> = {
    iss: issuerOfPool(userPoolId),
    aud: 'the-website-client',
    [userNameClaim]: userName,
    ...moved,
  };

  for (const [name, value] of Object.entries(claims)) {
    if (value === '') {
      delete claims[name];
    }
  }

  return claims;
}

function aStore(): { store: EntitlementStore; table: FakeTable } {
  const table = fakeTable();

  return { store: dynamoEntitlementStore(table, tableName), table };
}

const readOf = (answered: { body: string }): WhatTheAccountPageReads =>
  JSON.parse(answered.body) as WhatTheAccountPageReads;

describe('what her account page reads about her subscription', () => {
  describe('a payment she holds', () => {
    it('answers the date, the state and the route, and nothing else of the item', async () => {
      const { store } = aStore();

      await store.writeEntitlement({
        payerDigest,
        eventAt: 1_763_280_000,
        writtenAt: '2026-11-16T09:00:00.000Z',
        paidUntil: theYearEnds,
        route: 'card',
        state: 'active',
        payerRef: 'cus_000000000001',
        subscriptionRef: 'sub_000000000001',
      });

      const answered = await subscriptionFor(aRequest('GET', tokenOf()), {
        entitlements: store,
        poolId: userPoolId,
      });

      expect(answered.statusCode).toBe(200);
      expect(readOf(answered)).toEqual({
        paidUntil: theYearEnds,
        state: 'active',
        route: 'card',
      });
    });

    it('names no customer, no subscription and no event, which a page does not draw', async () => {
      const { store } = aStore();

      await store.writeEntitlement({
        payerDigest,
        eventAt: 1_763_280_000,
        writtenAt: '2026-11-16T09:00:00.000Z',
        paidUntil: theYearEnds,
        route: 'card',
        state: 'cancelling',
        payerRef: 'cus_000000000001',
        subscriptionRef: 'sub_000000000001',
      });

      const answered = await subscriptionFor(aRequest('GET', tokenOf()), {
        entitlements: store,
        poolId: userPoolId,
      });

      expect(answered.body).not.toContain('cus_');
      expect(answered.body).not.toContain('sub_');
      expect(answered.body).not.toContain(payerDigest);
      expect(Object.keys(readOf(answered)).sort()).toEqual(['paidUntil', 'route', 'state']);
    });

    it('leaves a field the item does not carry out, rather than answering it as nothing', async () => {
      const { store } = aStore();

      await store.writeEntitlement({
        payerDigest,
        eventAt: 1_763_280_000,
        writtenAt: '2026-11-16T09:00:00.000Z',
        payerRef: 'cus_000000000001',
      });

      const answered = await subscriptionFor(aRequest('GET', tokenOf()), {
        entitlements: store,
        poolId: userPoolId,
      });

      expect(readOf(answered)).toEqual({});
    });
  });

  describe('a woman who has never paid', () => {
    it('answers nothing at all, rather than a refusal she would read as a fault', async () => {
      const { store } = aStore();

      const answered = await subscriptionFor(aRequest('GET', tokenOf()), {
        entitlements: store,
        poolId: userPoolId,
      });

      expect(answered.statusCode).toBe(200);
      expect(readOf(answered)).toEqual({});
    });
  });

  describe('a token that reads for nobody', () => {
    it('refuses a token of another pool, because a digest is cut under one pool', async () => {
      const { store, table } = aStore();

      const answered = await subscriptionFor(
        aRequest('GET', tokenOf({ iss: issuerOfPool('us-east-1_SOMEONEELSE') })),
        { entitlements: store, poolId: userPoolId },
      );

      expect(answered.statusCode).toBe(401);
      expect(JSON.parse(answered.body)).toEqual({ error: thatTokenReadsNothing });
      expect(table.calls().getItem).toBe(0);
    });

    it('refuses a request the token authorizer handed nothing on from', async () => {
      const { store, table } = aStore();

      const answered = await subscriptionFor(aRequest('GET'), {
        entitlements: store,
        poolId: userPoolId,
      });

      expect(answered.statusCode).toBe(401);
      expect(table.calls().getItem).toBe(0);
    });

    it('refuses a token carrying no user name, rather than reading a digest of nothing', async () => {
      const { store, table } = aStore();

      const answered = await subscriptionFor(aRequest('GET', tokenOf({ [userNameClaim]: '' })), {
        entitlements: store,
        poolId: userPoolId,
      });

      expect(answered.statusCode).toBe(401);
      expect(table.calls().getItem).toBe(0);
    });
  });

  describe('the one path both routes answer', () => {
    function theRoutes(store: EntitlementStore) {
      return subscriptionRoutes({
        entitlements: store,
        reaches: fakeStripe({ holdsThePayerDigest: payerDigest }).reaches,
        secretKey: () => Promise.resolve('the-key-the-operator-wrote-by-hand'),
        poolId: userPoolId,
        clock: () => new Date('2026-11-16T09:00:00.000Z'),
      });
    }

    it('sends a read to the read, which answers the three fields', async () => {
      const { store } = aStore();

      const answered = await theRoutes(store)(aRequest('GET', tokenOf()));

      expect(answered.statusCode).toBe(200);
      expect(readOf(answered)).toEqual({});
    });

    it('sends a press to the start, which answers the secret the page confirms', async () => {
      const { store } = aStore();

      const answered = await theRoutes(store)(aRequest('POST', tokenOf()));

      expect(answered.statusCode).toBe(200);
      expect(answered.body).toContain('clientSecret');
    });

    it('tells a refused read and a refused press apart, so each says what it could not do', async () => {
      const { store } = aStore();
      const routes = theRoutes(store);

      expect(JSON.parse((await routes(aRequest('GET'))).body)).toEqual({
        error: thatTokenReadsNothing,
      });
      expect(JSON.parse((await routes(aRequest('POST'))).body)).toEqual({
        error: thatTokenStartsNothing,
      });
    });

    it('answers a method this path does not take, rather than guessing at one of the two', async () => {
      const { store } = aStore();

      const answered = await theRoutes(store)(aRequest('DELETE', tokenOf()));

      expect(answered.statusCode).toBe(405);
      expect(JSON.parse(answered.body)).toEqual({ error: nothingAnswersThatMethod });
    });
  });
});
