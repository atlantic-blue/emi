import { payerDigestFor } from '@emi/crypto';

import type { HttpRequestEvent } from '../src/api';
import {
  changeRenewalFor,
  nothingHereRenews,
  renewingField,
  thatBodySaysSomethingElse,
  thatTokenChangesNothing,
  theRenewalDidNotChange,
  type WhatTheChangeNeeds,
} from '../src/payments/changeRenewal';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import type { EntitlementRoute, EntitlementStore } from '../src/payments/entitlements';
import { issuerOfPool, userNameClaim } from '../src/payments/poolToken';
import type { WhatTheAccountPageReads } from '../src/payments/readSubscription';
import { subscriptionPath } from '../src/payments/startSubscription';
import { cancelAtPeriodEndField } from '../src/payments/stripe';
import { stripeSecretKeyOnce, stripeSecretKeyParameter } from '../src/payments/stripeSecrets';
import type { ParameterStore, ParameterWrite } from '../src/telegram/parameters';
import { fakeTable, tableName, type FakeTable } from './fixtures/dynamoTable';
import { fakeStripe, updateOfTheSubscription, type FakeStripe } from './fixtures/stripe';

/**
 * The press on Cancel renewal, and the press that turns it back on.
 *
 * Stripe is a double that answers what Stripe answers, and the item is written through the store
 * the money writes it with, so what is read here is the form the function sent and the item the
 * write left behind.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const userName = 'SignInWithApple_000482910';
const payerDigest = payerDigestFor(userPoolId, userName);
/** Not the shape of a real key. A value that looked like one would be read as a leak. */
const theKey = 'the-key-the-operator-wrote-by-hand';
const theSubscription = 'sub_000000000001';
const theCustomer = 'cus_000000000001';
const theYearEnds = '2027-12-16T09:00:00.000Z';
const thePress = new Date('2026-11-19T11:00:00.000Z');

function parametersHolding(held: Readonly<Record<string, string>>): ParameterStore {
  return {
    read: (name: string): Promise<string | undefined> => Promise.resolve(held[name]),
    writeIfAbsent: (): Promise<ParameterWrite> =>
      Promise.reject(new Error('the renewal writes no parameter')),
  };
}

function aRequest(
  body: string | undefined,
  claims?: Readonly<Record<string, string>>,
): HttpRequestEvent {
  return {
    rawPath: subscriptionPath,
    headers: {},
    requestContext: {
      http: { method: 'PATCH' },
      ...(claims === undefined ? {} : { authorizer: { jwt: { claims } } }),
    },
    ...(body === undefined ? {} : { body }),
  };
}

/** The claims an identity token of this pool carries, as the api gateway hands them on. */
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

const asksFor = (renewing: boolean): string => JSON.stringify({ [renewingField]: renewing });

interface AChange {
  held: WhatTheChangeNeeds;
  store: EntitlementStore;
  stripe: FakeStripe;
  table: FakeTable;
  /** The instant the next press runs at, so two presses in one test are ordered. */
  movesTheClockOn(): void;
}

function aChange(stripe: FakeStripe = fakeStripe()): AChange {
  const table = fakeTable();
  const store = dynamoEntitlementStore(table, tableName);
  let now = thePress;

  return {
    store,
    stripe,
    table,
    movesTheClockOn: () => {
      now = new Date(now.getTime() + 60_000);
    },
    held: {
      entitlements: store,
      reaches: stripe.reaches,
      secretKey: stripeSecretKeyOnce(parametersHolding({ [stripeSecretKeyParameter]: theKey })),
      poolId: userPoolId,
      clock: () => now,
    },
  };
}

/** The item a woman who pays by card and renews holds, as the webhook of a new subscription left it. */
async function sheIsPaying(
  store: EntitlementStore,
  moved: { readonly route?: EntitlementRoute; readonly subscriptionRef?: string | null } = {},
): Promise<void> {
  await store.writeEntitlement({
    payerDigest,
    eventAt: 1_763_280_000,
    writtenAt: '2026-11-16T09:00:00.000Z',
    paidUntil: theYearEnds,
    route: moved.route ?? 'card',
    state: 'active',
    payerRef: theCustomer,
    ...(moved.subscriptionRef === null
      ? {}
      : { subscriptionRef: moved.subscriptionRef ?? theSubscription }),
  });
}

const readOf = (answered: { body: string }): WhatTheAccountPageReads =>
  JSON.parse(answered.body) as WhatTheAccountPageReads;

describe('the renewal she stops, and the one she starts again', () => {
  describe('the press on Cancel renewal', () => {
    it('tells Stripe to stop at the end of the period she paid for', async () => {
      const { held, store, stripe } = aChange();

      await sheIsPaying(store);
      const answered = await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      const [call] = stripe.calls();

      expect(answered.statusCode).toBe(200);
      expect(call?.address).toBe(updateOfTheSubscription(theSubscription));
      expect(call?.asked.method).toBe('POST');
      expect(stripe.fieldsOf(call!)).toEqual({ [cancelAtPeriodEndField]: 'true' });
    });

    it('leaves the day she is paid until exactly where it was, which is her year', async () => {
      const { held, store } = aChange();

      await sheIsPaying(store);
      const answered = await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      expect(readOf(answered).paidUntil).toBe(theYearEnds);
      expect((await store.readEntitlement(payerDigest))?.paidUntil).toBe(theYearEnds);
    });

    it('moves the state of the item, so her account page says the renewal is off', async () => {
      const { held, store } = aChange();

      await sheIsPaying(store);
      const answered = await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      expect(readOf(answered)).toEqual({
        paidUntil: theYearEnds,
        state: 'cancelling',
        route: 'card',
      });
      expect((await store.readEntitlement(payerDigest))?.state).toBe('cancelling');
    });

    it('reads the key from the parameter store and carries it in the header of the call', async () => {
      const { held, store, stripe } = aChange();

      await sheIsPaying(store);
      await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      expect(stripe.calls()[0]?.asked.headers.authorization).toBe(`Bearer ${theKey}`);
      expect(stripe.calls()[0]?.asked.headers['content-type']).toBe(
        'application/x-www-form-urlencoded',
      );
    });

    it('sends nothing of hers to Stripe beyond the subscription it names', async () => {
      const { held, store, stripe } = aChange();

      await sheIsPaying(store);
      await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      const [call] = stripe.calls();

      expect(call?.asked.body).not.toContain(userName);
      expect(call?.asked.body).not.toContain(payerDigest);
      expect(call?.address).not.toContain(payerDigest);
    });
  });

  describe('the press that turns the renewal back on', () => {
    it('tells Stripe to renew again, and says she is active', async () => {
      const { held, movesTheClockOn, store, stripe } = aChange();

      await sheIsPaying(store);
      await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      const stoppedIt = await store.readEntitlement(payerDigest);

      movesTheClockOn();
      const answered = await changeRenewalFor(aRequest(asksFor(true), tokenOf()), held);

      expect(stoppedIt?.state).toBe('cancelling');
      expect(stripe.fieldsOf(stripe.calls()[1]!)).toEqual({ [cancelAtPeriodEndField]: 'false' });
      expect(readOf(answered)).toEqual({
        paidUntil: theYearEnds,
        state: 'active',
        route: 'card',
      });
      expect((await store.readEntitlement(payerDigest))?.state).toBe('active');
    });

    it('writes the renewal Stripe answered with, rather than the one it was asked for', async () => {
      const { held, store } = aChange(fakeStripe({ saysTheRenewalStopped: true }));

      await sheIsPaying(store);
      const answered = await changeRenewalFor(aRequest(asksFor(true), tokenOf()), held);

      expect(readOf(answered).state).toBe('cancelling');
      expect((await store.readEntitlement(payerDigest))?.state).toBe('cancelling');
    });
  });

  describe('a woman with nothing here to renew', () => {
    it('answers a woman who has never paid, and calls Stripe not at all', async () => {
      const { held, stripe } = aChange();

      const answered = await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      expect(answered.statusCode).toBe(404);
      expect(JSON.parse(answered.body)).toEqual({ error: nothingHereRenews });
      expect(stripe.calls()).toEqual([]);
    });

    it('answers a woman who paid with Stars, who cancels in Telegram instead', async () => {
      const { held, store, stripe } = aChange();

      await sheIsPaying(store, { route: 'stars', subscriptionRef: null });
      const answered = await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      expect(answered.statusCode).toBe(404);
      expect(stripe.calls()).toEqual([]);
    });

    it('answers a press that was never finished, which names no subscription at all', async () => {
      const { held, store, stripe } = aChange();

      await sheIsPaying(store, { subscriptionRef: null });
      const answered = await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      expect(answered.statusCode).toBe(404);
      expect(stripe.calls()).toEqual([]);
    });
  });

  describe('a body this route does not take', () => {
    it.each([
      ['a second field beside the renewal', JSON.stringify({ renewing: false, paidUntil: '2099' })],
      ['a field this route does not know', JSON.stringify({ cancel: true })],
      ['a renewal that is not a yes or a no', JSON.stringify({ renewing: 'false' })],
      ['nothing in it at all', '{}'],
      ['something that is not an object', '"renewing"'],
      ['text nobody can read', 'cancel the renewal please'],
    ])('refuses %s, and calls Stripe not at all', async (_said, body) => {
      const { held, store, stripe } = aChange();

      await sheIsPaying(store);
      const answered = await changeRenewalFor(aRequest(body, tokenOf()), held);

      expect(answered.statusCode).toBe(400);
      expect(JSON.parse(answered.body)).toEqual({ error: thatBodySaysSomethingElse });
      expect(stripe.calls()).toEqual([]);
    });

    it('refuses a request carrying no body, rather than reading one as a no', async () => {
      const { held, store, stripe } = aChange();

      await sheIsPaying(store);
      const answered = await changeRenewalFor(aRequest(undefined, tokenOf()), held);

      expect(answered.statusCode).toBe(400);
      expect(stripe.calls()).toEqual([]);
    });

    it('leaves the item exactly as it was for every one of them', async () => {
      const { held, store } = aChange();

      await sheIsPaying(store);
      const before = await store.readEntitlement(payerDigest);

      await changeRenewalFor(aRequest('{}', tokenOf()), held);

      expect(await store.readEntitlement(payerDigest)).toEqual(before);
    });
  });

  describe('a token that changes nothing', () => {
    it('refuses a request the token authorizer handed nothing on from', async () => {
      const { held, store, stripe, table } = aChange();

      await sheIsPaying(store);
      const answered = await changeRenewalFor(aRequest(asksFor(false)), held);

      expect(answered.statusCode).toBe(401);
      expect(JSON.parse(answered.body)).toEqual({ error: thatTokenChangesNothing });
      expect(stripe.calls()).toEqual([]);
      expect(table.calls().getItem).toBe(0);
    });

    it('refuses a token of another pool, because a digest is cut under one pool', async () => {
      const { held, store, stripe } = aChange();

      await sheIsPaying(store);
      const answered = await changeRenewalFor(
        aRequest(asksFor(false), tokenOf({ iss: issuerOfPool('us-east-1_SOMEONEELSE') })),
        held,
      );

      expect(answered.statusCode).toBe(401);
      expect(stripe.calls()).toEqual([]);
      expect((await store.readEntitlement(payerDigest))?.state).toBe('active');
    });

    it('refuses a token carrying no user name, rather than changing a digest of nothing', async () => {
      const { held, store, stripe } = aChange();

      await sheIsPaying(store);
      const answered = await changeRenewalFor(
        aRequest(asksFor(false), tokenOf({ [userNameClaim]: '' })),
        held,
      );

      expect(answered.statusCode).toBe(401);
      expect(stripe.calls()).toEqual([]);
    });

    it('tells every refused caller the same thing, so nobody learns which check said no', async () => {
      const { held, store } = aChange();

      await sheIsPaying(store);
      const answers = await Promise.all([
        changeRenewalFor(aRequest(asksFor(false)), held),
        changeRenewalFor(
          aRequest(asksFor(false), tokenOf({ iss: 'https://example.invalid/pool' })),
          held,
        ),
        changeRenewalFor(aRequest(asksFor(false), tokenOf({ [userNameClaim]: '' })), held),
      ]);

      expect(new Set(answers.map((answered) => answered.body)).size).toBe(1);
    });
  });

  describe('a change Stripe does not take', () => {
    it('leaves the state as it was when the subscription call is refused', async () => {
      const refusing = fakeStripe({
        refusesTheSubscription: {
          status: 404,
          body: JSON.stringify({
            error: { type: 'invalid_request_error', code: 'resource_missing' },
          }),
        },
      });
      const { held, store } = aChange(refusing);

      await sheIsPaying(store);
      const answered = await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: theRenewalDidNotChange });
      expect((await store.readEntitlement(payerDigest))?.state).toBe('active');
    });

    it('leaves the state as it was when the answer names no renewal to read', async () => {
      const silent = fakeStripe({
        refusesTheSubscription: {
          status: 200,
          body: JSON.stringify({ id: theSubscription, object: 'subscription' }),
        },
      });
      const { held, store } = aChange(silent);

      await sheIsPaying(store);
      const answered = await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      expect(answered.statusCode).toBe(502);
      expect((await store.readEntitlement(payerDigest))?.state).toBe('active');
    });

    it('says nothing about the key or the digest in what it answers', async () => {
      const refusing = fakeStripe({
        refusesTheSubscription: { status: 401, body: 'no key here' },
      });
      const { held, store } = aChange(refusing);

      await sheIsPaying(store);
      const answered = await changeRenewalFor(aRequest(asksFor(false), tokenOf()), held);

      expect(answered.body).not.toContain(theKey);
      expect(answered.body).not.toContain(payerDigest);
      expect(answered.body).not.toContain(theSubscription);
    });
  });
});
