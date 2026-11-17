import { payerDigestFor } from '@emi/crypto';

import type { HttpRequestEvent } from '../src/api';
import type { AttributeValue, Item } from '../src/store/dynamo';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import { entitlementSortKey, paymentPartitionFor } from '../src/payments/entitlements';
import { issuerOfPool, userNameClaim } from '../src/payments/poolToken';
import {
  customersAddress,
  payerDigestField,
  setupIntentsAddress,
  theYearlyPrice,
} from '../src/payments/stripe';
import {
  nothingWasStarted,
  startSubscriptionFor,
  subscriptionPath,
  type WhatTheStartNeeds,
} from '../src/payments/startSubscription';
import { stripeSecretKeyOnce, stripeSecretKeyParameter } from '../src/payments/stripeSecrets';
import type { ParameterStore, ParameterWrite } from '../src/telegram/parameters';
import { fakeTable, tableName, type FakeTable } from './fixtures/dynamoTable';
import { aClientSecret, aCustomerRef, fakeStripe, type FakeStripe } from './fixtures/stripe';

/**
 * The press on Buy Emi, from the token the api gateway believed to the item the table holds.
 *
 * Stripe is a double that answers what Stripe answers, and the table is the double the payment
 * store is already held to, so what is read here is the form the function sent and the item the
 * write left behind.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const userName = 'SignInWithApple_000482910';
const payerDigest = payerDigestFor(userPoolId, userName);
/** Not the shape of a real key. A value that looked like one would be read as a leak. */
const theKey = 'the-key-the-operator-wrote-by-hand';
const theInstant = new Date('2026-11-16T09:00:00.000Z');

function parametersHolding(held: Readonly<Record<string, string>>): ParameterStore {
  return {
    read: (name: string): Promise<string | undefined> => Promise.resolve(held[name]),
    writeIfAbsent: (): Promise<ParameterWrite> =>
      Promise.reject(new Error('the payments route writes no parameter')),
  };
}

function aRequest(claims?: Readonly<Record<string, string>>): HttpRequestEvent {
  return {
    rawPath: subscriptionPath,
    headers: {},
    requestContext: {
      http: { method: 'POST' },
      ...(claims === undefined ? {} : { authorizer: { jwt: { claims } } }),
    },
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

interface AStart {
  held: WhatTheStartNeeds;
  stripe: FakeStripe;
  table: FakeTable;
}

function aStart(stripe: FakeStripe = fakeStripe()): AStart {
  const table = fakeTable();

  return {
    stripe,
    table,
    held: {
      entitlements: dynamoEntitlementStore(table, tableName),
      reaches: stripe.reaches,
      secretKey: stripeSecretKeyOnce(parametersHolding({ [stripeSecretKeyParameter]: theKey })),
      poolId: userPoolId,
      clock: () => theInstant,
    },
  };
}

const textOf = (value: AttributeValue | undefined): string | undefined =>
  value !== undefined && 'S' in value ? value.S : undefined;

const itemIn = (table: FakeTable): Item | undefined =>
  table
    .items()
    .find(
      (item) =>
        textOf(item.pk) === paymentPartitionFor(payerDigest) &&
        textOf(item.sk) === entitlementSortKey,
    );

describe('the start of a subscription', () => {
  describe('what she gets back when she presses Buy Emi', () => {
    it('answers the secret the page mounts the card form on', async () => {
      const { held } = aStart();

      const answered = await startSubscriptionFor(aRequest(tokenOf()), held);

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ clientSecret: aClientSecret });
    });

    it('makes the customer first and the setup second, because the first invoice is zero', async () => {
      const { held, stripe } = aStart();

      await startSubscriptionFor(aRequest(tokenOf()), held);

      expect(stripe.calls().map((call) => call.address)).toEqual([
        customersAddress,
        setupIntentsAddress,
      ]);
    });

    it('sends the payer digest to Stripe and nothing else of hers', async () => {
      const { held, stripe } = aStart();

      await startSubscriptionFor(aRequest(tokenOf()), held);

      const [customer] = stripe.calls();

      expect(stripe.fieldsOf(customer!)).toEqual({ [payerDigestField]: payerDigest });
      expect(customer!.asked.body).not.toContain(userName);
      expect(customer!.asked.body).not.toContain(userPoolId);
    });

    it('collects the card for a charge Emi makes later, which is what a yearly renewal is', async () => {
      const { held, stripe } = aStart();

      await startSubscriptionFor(aRequest(tokenOf()), held);

      const setup = stripe.calls()[1];

      expect(stripe.fieldsOf(setup!)).toEqual({
        customer: aCustomerRef,
        usage: 'off_session',
        'automatic_payment_methods[enabled]': 'true',
      });
    });

    it('reads the key from the parameter store and carries it in the header of each call', async () => {
      const { held, stripe } = aStart();

      await startSubscriptionFor(aRequest(tokenOf()), held);

      for (const call of stripe.calls()) {
        expect(call.asked.method).toBe('POST');
        expect(call.asked.headers.authorization).toBe(`Bearer ${theKey}`);
        expect(call.asked.headers['content-type']).toBe('application/x-www-form-urlencoded');
      }
    });
  });

  describe('what the table holds afterwards', () => {
    it('writes the customer under the payer digest, and no date at all', async () => {
      const { held, table } = aStart();

      await startSubscriptionFor(aRequest(tokenOf()), held);

      const item = itemIn(table);

      expect(item?.payerRef).toEqual({ S: aCustomerRef });
      expect(item?.eventAt).toEqual({ N: String(Math.floor(theInstant.getTime() / 1000)) });
      expect(item?.firstSeenAt).toEqual({ S: theInstant.toISOString() });
      expect(item).not.toHaveProperty('paidUntil');
      expect(item).not.toHaveProperty('state');
    });

    it('holds no account identifier and no pool user name, which is contract PAY-5', async () => {
      const { held, table } = aStart();

      await startSubscriptionFor(aRequest(tokenOf()), held);

      expect(JSON.stringify(itemIn(table))).not.toContain(userName);
    });

    it('reuses the customer the item already names, so one digest pays under one customer', async () => {
      const { held, stripe } = aStart(fakeStripe({ customerRef: 'cus_000000000009' }));

      await startSubscriptionFor(aRequest(tokenOf()), held);
      await startSubscriptionFor(aRequest(tokenOf()), held);

      expect(stripe.calls().map((call) => call.address)).toEqual([
        customersAddress,
        setupIntentsAddress,
        setupIntentsAddress,
      ]);
      expect(stripe.fieldsOf(stripe.calls()[2]!).customer).toBe('cus_000000000009');
    });
  });

  describe('a token that pays for nobody', () => {
    it('refuses a request the token authorizer handed nothing on from', async () => {
      const { held, stripe, table } = aStart();

      const answered = await startSubscriptionFor(aRequest(), held);

      expect(answered.statusCode).toBe(401);
      expect(stripe.calls()).toEqual([]);
      expect(table.items()).toEqual([]);
    });

    it('refuses a token of another pool, because a digest is cut under one pool', async () => {
      const { held, stripe, table } = aStart();

      const answered = await startSubscriptionFor(
        aRequest(tokenOf({ iss: issuerOfPool('us-east-1_SOMEONEELSE') })),
        held,
      );

      expect(answered.statusCode).toBe(401);
      expect(stripe.calls()).toEqual([]);
      expect(table.items()).toEqual([]);
    });

    it('refuses a token carrying no user name, rather than paying under a digest of nothing', async () => {
      const { held, stripe, table } = aStart();

      const answered = await startSubscriptionFor(aRequest(tokenOf({ [userNameClaim]: '' })), held);

      expect(answered.statusCode).toBe(401);
      expect(stripe.calls()).toEqual([]);
      expect(table.items()).toEqual([]);
    });

    it('tells every refused caller the same thing, so nobody learns which check said no', async () => {
      const { held } = aStart();

      const answers = await Promise.all([
        startSubscriptionFor(aRequest(), held),
        startSubscriptionFor(aRequest(tokenOf({ iss: 'https://example.invalid/pool' })), held),
        startSubscriptionFor(aRequest(tokenOf({ [userNameClaim]: '' })), held),
      ]);

      expect(new Set(answers.map((answered) => answered.body)).size).toBe(1);
    });
  });

  describe('a press Stripe does not finish', () => {
    it('writes nothing when the customer call is refused', async () => {
      const refusing = fakeStripe({
        refusesTheCustomer: {
          status: 402,
          body: JSON.stringify({ error: { type: 'card_error', code: 'card_declined' } }),
        },
      });
      const { held, table } = aStart(refusing);

      const answered = await startSubscriptionFor(aRequest(tokenOf()), held);

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: nothingWasStarted });
      expect(table.items()).toEqual([]);
    });

    it('writes nothing when the setup answers with no secret to confirm', async () => {
      const silent = fakeStripe({
        refusesTheSetup: { status: 200, body: JSON.stringify({ id: 'seti_1', object: 'setup' }) },
      });
      const { held, table } = aStart(silent);

      const answered = await startSubscriptionFor(aRequest(tokenOf()), held);

      expect(answered.statusCode).toBe(502);
      expect(table.items()).toEqual([]);
    });

    it('says nothing about the key or the account in what it answers', async () => {
      const refusing = fakeStripe({ refusesTheCustomer: { status: 401, body: 'no key here' } });
      const { held } = aStart(refusing);

      const answered = await startSubscriptionFor(aRequest(tokenOf()), held);

      expect(answered.body).not.toContain(theKey);
      expect(answered.body).not.toContain(payerDigest);
    });
  });

  describe('the one price Emi sells, which is contract PAY-6', () => {
    it('is 3900 in euros, every year, with the tax inside the amount', () => {
      expect(theYearlyPrice.amount).toBe(3900);
      expect(theYearlyPrice.currency).toBe('eur');
      expect(theYearlyPrice.interval).toBe('year');
      expect(theYearlyPrice.taxBehaviour).toBe('inclusive');
    });

    it('gives her a free month first, so the first invoice is zero', () => {
      expect(theYearlyPrice.freeMonthDays).toBe(30);
    });
  });
});
