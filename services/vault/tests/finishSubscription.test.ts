import { payerDigestFor } from '@emi/crypto';

import type { HttpRequestEvent } from '../src/api';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import type { EntitlementState } from '../src/payments/entitlements';
import {
  finishSubscriptionFor,
  nothingOfHersWasStarted,
  nothingWasCreated,
  oneSubscriptionPer,
  offerField,
  thatSetupStartsNothing,
  thatTokenFinishesNothing,
  theBodyASubscriptionTakes,
  type WhatFinishingNeeds,
} from '../src/payments/finishSubscription';
import { issuerOfPool, userNameClaim } from '../src/payments/poolToken';
import { subscriptionPath } from '../src/payments/startSubscription';
import {
  cancelTheSubscription,
  customerDefaultField,
  customersAddress,
  discountCouponField,
  expandField,
  idempotencyHeader,
  onSubscription,
  payerDigestField,
  paymentBehaviourField,
  savesTheDefaultField,
  setupIntentsAddress,
  stripeApiVersion,
  subscriptionPriceField,
  subscriptionsAddress,
  theBlackFridayCoupon,
  theBlackFridayOffer,
  theFirstInvoiceWaits,
  theSecretOfTheFirstInvoice,
  theYearlyPrice,
  theYearlyPriceRef,
  trialDaysField,
  whenNoCardIsLeftField,
} from '../src/payments/stripe';
import { subscriptionRoutes } from '../src/payments/subscriptionRoutes';
import { fakeTable, tableName, type FakeTable } from './fixtures/dynamoTable';
import {
  aCustomerRef,
  aPaymentMethodRef,
  aSetupRef,
  fakeStripe,
  readOfTheCustomer,
  readOfTheSetup,
  type FakeStripe,
  theSecretOfTheInvoiceOf,
  type WhatStripeAnswers,
} from './fixtures/stripe';

/**
 * The second half of the press on Buy Emi, from the token the api gateway believed to the one
 * subscription she is charged under.
 *
 * Stripe is a double that answers what Stripe answers and records every call, and the item is
 * written through the store the webhook writes it with, so what is read here is the order the
 * calls left in and the form each one carried. A repeated idempotency key makes no second
 * subscription in the double, the way it makes none in Stripe.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const userName = 'SignInWithApple_000482910';
const payerDigest = payerDigestFor(userPoolId, userName);
/** Not the shape of a real key. A value that looked like one would be read as a leak. */
const theKey = 'the-key-the-operator-wrote-by-hand';
const theInstant = new Date('2026-11-20T09:00:00.000Z');

/** The customer of somebody else, which a setup of hers is never made for. */
const anotherCustomerRef = 'cus_000000000999';

function aRequest(
  method: string,
  claims?: Readonly<Record<string, string>>,
  body?: string,
): HttpRequestEvent {
  return {
    rawPath: subscriptionPath,
    headers: {},
    requestContext: {
      http: { method },
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

/** What the item of one woman holds, where a test wants something other than a fresh press. */
interface WhatSheHasPressed {
  readonly payerRef?: string;
  readonly subscriptionRef?: string;
  readonly state?: EntitlementState;
}

/** The item the press on Buy Emi leaves behind: one customer, no subscription and no date. */
const sheHasPressedBuyEmi: WhatSheHasPressed = { payerRef: aCustomerRef };

interface AFinish {
  held: WhatFinishingNeeds;
  stripe: FakeStripe;
  table: FakeTable;
}

async function aFinish(
  pressed: WhatSheHasPressed | null = sheHasPressedBuyEmi,
  answers: WhatStripeAnswers = {},
  now: Date = theInstant,
): Promise<AFinish> {
  const table = fakeTable();
  const entitlements = dynamoEntitlementStore(table, tableName);
  const stripe = fakeStripe(answers);

  if (pressed !== null) {
    await entitlements.writeEntitlement({
      payerDigest,
      eventAt: Math.floor(theInstant.getTime() / 1000),
      writtenAt: theInstant.toISOString(),
      ...(pressed.payerRef === undefined ? {} : { payerRef: pressed.payerRef }),
      ...(pressed.subscriptionRef === undefined
        ? {}
        : { subscriptionRef: pressed.subscriptionRef }),
      ...(pressed.state === undefined ? {} : { state: pressed.state }),
    });
  }

  return {
    stripe,
    table,
    held: {
      entitlements,
      reaches: stripe.reaches,
      secretKey: () => Promise.resolve(theKey),
      poolId: userPoolId,
      clock: () => now,
    },
  };
}

/** What her browser sends once Stripe has taken the card or the wallet. */
const theSetupSheConfirmed = JSON.stringify({ setupRef: aSetupRef });

/** The same, from a woman who opened the page the Black Friday address sent her to. */
const theSetupSheConfirmedOnTheOffer = JSON.stringify({
  setupRef: aSetupRef,
  offer: theBlackFridayOffer,
});

/** A minute before the offer closes, and the first minute after it. */
const whileTheOfferIsOpen = new Date('2026-11-30T22:59:00.000Z');
const onceTheOfferHasClosed = new Date('2026-11-30T23:00:00.000Z');

/** Each call as it left, so a test reads the order and not only the set. */
const whatWasCalled = (stripe: FakeStripe): string[] =>
  stripe.calls().map((call) => `${call.asked.method} ${call.address}`);

/** The create of the subscription, found by its address rather than by where it sits. */
const theCreate = (stripe: FakeStripe) =>
  stripe.calls().find((call) => call.address === subscriptionsAddress);

describe('the call that creates the subscription she pressed for', () => {
  describe('what one press leaves her paying under', () => {
    it('makes her card the default, then creates one subscription, in that order', async () => {
      const { held, stripe } = await aFinish();

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ started: true });
      expect(whatWasCalled(stripe)).toEqual([
        `GET ${readOfTheSetup(aSetupRef)}`,
        `POST ${readOfTheCustomer(aCustomerRef)}`,
        `POST ${subscriptionsAddress}`,
      ]);
      expect(stripe.subscriptionsMade()).toHaveLength(1);
    });

    it('charges the customer the press made, and makes no second customer', async () => {
      const { held, stripe } = await aFinish();

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmed), held);

      expect(stripe.fieldsOf(theCreate(stripe)!).customer).toBe(aCustomerRef);
      expect(whatWasCalled(stripe)).not.toContain(`POST ${customersAddress}`);
      expect(whatWasCalled(stripe)).not.toContain(`POST ${setupIntentsAddress}`);
    });

    it('names the payment method the setup collected as the default of the customer', async () => {
      const { held, stripe } = await aFinish();

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmed), held);

      const charged = stripe
        .calls()
        .find(
          (call) =>
            call.address === readOfTheCustomer(aCustomerRef) && call.asked.method === 'POST',
        );

      expect(stripe.fieldsOf(charged!)).toEqual({ [customerDefaultField]: aPaymentMethodRef });
    });

    it('creates it on the yearly price, with the free month and the payer digest', async () => {
      const { held, stripe } = await aFinish();

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmed), held);

      expect(stripe.fieldsOf(theCreate(stripe)!)).toEqual({
        customer: aCustomerRef,
        [subscriptionPriceField]: theYearlyPriceRef,
        [trialDaysField]: String(theYearlyPrice.freeMonthDays),
        [savesTheDefaultField]: onSubscription,
        [whenNoCardIsLeftField]: cancelTheSubscription,
        [payerDigestField]: payerDigest,
      });
    });

    it('keeps the card of the free month as the card of the renewal a year later', async () => {
      const { held, stripe } = await aFinish();

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmed), held);

      expect(stripe.fieldsOf(theCreate(stripe)!)[savesTheDefaultField]).toBe(onSubscription);
      expect(stripe.fieldsOf(theCreate(stripe)!)[whenNoCardIsLeftField]).toBe(
        cancelTheSubscription,
      );
    });

    it('carries the key and the pinned version on every call it makes', async () => {
      const { held, stripe } = await aFinish();

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmed), held);

      expect(stripe.calls()).not.toHaveLength(0);

      for (const call of stripe.calls()) {
        expect(call.asked.headers.authorization).toBe(`Bearer ${theKey}`);
        expect(call.asked.headers['stripe-version']).toBe(stripeApiVersion);
      }
    });

    it('writes no date of its own, because the deliveries of Stripe write that', async () => {
      const { held, table } = await aFinish();
      const before = table.calls().updateItem;

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmed), held);

      expect(table.calls().updateItem).toBe(before);
    });

    it('answers no secret, no customer and no subscription of hers', async () => {
      const { held } = await aFinish();

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(answered.body).not.toContain(aCustomerRef);
      expect(answered.body).not.toContain(aSetupRef);
      expect(answered.body).not.toContain('sub_');
      expect(answered.body).not.toContain(theKey);
    });
  });

  describe('a press she makes twice', () => {
    it('creates one subscription, and answers the second press the same way', async () => {
      const { held, stripe } = await aFinish();

      const first = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );
      const second = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(JSON.parse(second.body)).toEqual({ started: true });
      expect(stripe.subscriptionsMade()).toHaveLength(1);
    });

    it('names the setup she confirmed as the key, so Stripe replays its own answer', async () => {
      const { held, stripe } = await aFinish();

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmed), held);
      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmed), held);

      const keys = stripe
        .calls()
        .filter((call) => call.address === subscriptionsAddress)
        .map((call) => call.asked.headers[idempotencyHeader]);

      expect(keys).toEqual([oneSubscriptionPer(aSetupRef), oneSubscriptionPer(aSetupRef)]);
    });

    it('creates nothing at all when the item already names a subscription that pays', async () => {
      const running: readonly EntitlementState[] = ['active', 'cancelling'];

      for (const state of running) {
        const { held, stripe } = await aFinish({
          payerRef: aCustomerRef,
          subscriptionRef: 'sub_000000000777',
          state,
        });

        const answered = await finishSubscriptionFor(
          aRequest('PUT', tokenOf(), theSetupSheConfirmed),
          held,
        );

        expect(answered.statusCode).toBe(200);
        expect(JSON.parse(answered.body)).toEqual({ started: true });
        expect(stripe.calls()).toEqual([]);
      }
    });

    it('creates one for a woman whose last subscription has lapsed', async () => {
      const { held, stripe } = await aFinish({
        payerRef: aCustomerRef,
        subscriptionRef: 'sub_000000000777',
        state: 'lapsed',
      });

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(answered.statusCode).toBe(200);
      expect(stripe.subscriptionsMade()).toHaveLength(1);
    });
  });

  describe('a setup that buys her nothing', () => {
    it('refuses a setup made for another customer, and creates nothing at all', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {
        theSetupWasMadeFor: anotherCustomerRef,
      });

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(answered.statusCode).toBe(403);
      expect(JSON.parse(answered.body)).toEqual({ error: thatSetupStartsNothing });
      expect(whatWasCalled(stripe)).toEqual([`GET ${readOfTheSetup(aSetupRef)}`]);
      expect(stripe.subscriptionsMade()).toEqual([]);
    });

    it('says nothing about the state of a setup that is not hers', async () => {
      const { held } = await aFinish(sheHasPressedBuyEmi, {
        theSetupWasMadeFor: anotherCustomerRef,
        theSetupReached: 'requires_payment_method',
      });

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(answered.statusCode).toBe(403);
      expect(answered.body).not.toContain('requires_payment_method');
      expect(answered.body).not.toContain(anotherCustomerRef);
    });

    it('refuses a setup she has not finished, and creates nothing at all', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {
        theSetupReached: 'requires_action',
      });

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(answered.statusCode).toBe(403);
      expect(JSON.parse(answered.body)).toEqual({ error: thatSetupStartsNothing });
      expect(whatWasCalled(stripe)).toEqual([`GET ${readOfTheSetup(aSetupRef)}`]);
      expect(stripe.subscriptionsMade()).toEqual([]);
    });

    it('refuses a setup that names no payment method, however it reads otherwise', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, { theSetupCollected: '' });

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(answered.statusCode).toBe(403);
      expect(stripe.subscriptionsMade()).toEqual([]);
    });

    it('refuses a setup Stripe does not hold, and creates nothing at all', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {
        refusesTheSetupRead: {
          status: 404,
          body: JSON.stringify({ error: { code: 'resource_missing' } }),
        },
      });

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: nothingWasCreated });
      expect(stripe.subscriptionsMade()).toEqual([]);
    });

    it('leaves her card as the default when Stripe refuses the create', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {
        refusesTheCreate: {
          status: 400,
          body: JSON.stringify({ error: { code: 'resource_missing' } }),
        },
      });

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: nothingWasCreated });
      expect(answered.body).not.toContain(theKey);
      expect(whatWasCalled(stripe)).toContain(`POST ${readOfTheCustomer(aCustomerRef)}`);
    });
  });

  describe('a woman who has started nothing', () => {
    const startedNothing: readonly (readonly [string, WhatSheHasPressed | null])[] = [
      ['has never pressed Buy Emi at all', null],
      ['has an item that names no customer', {}],
      ['has an item of the Stars route, which names no customer', { state: 'active' }],
    ];

    it.each(startedNothing)('tells her nothing was started when she %s', async (_, pressed) => {
      const { held, stripe } = await aFinish(pressed);

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(answered.statusCode).toBe(404);
      expect(JSON.parse(answered.body)).toEqual({ error: nothingOfHersWasStarted });
      expect(stripe.calls()).toEqual([]);
    });
  });

  describe('the one field this call carries', () => {
    const refusedBodies: readonly (readonly [string, string])[] = [
      [
        'a field this call does not take',
        JSON.stringify({ setupRef: aSetupRef, customer: aCustomerRef }),
      ],
      ['a body naming no setup', JSON.stringify({})],
      ['a setup that is not text', JSON.stringify({ setupRef: 7 })],
      ['a setup that is empty text', JSON.stringify({ setupRef: '' })],
      ['a body that is not json at all', aSetupRef],
      ['a body that is a list', JSON.stringify([{ setupRef: aSetupRef }])],
      ['a price of her own', JSON.stringify({ setupRef: aSetupRef, price: 'price_1' })],
      ['a coupon of her own', JSON.stringify({ setupRef: aSetupRef, coupon: 'half-off' })],
      [
        'an offer this call does not sell',
        JSON.stringify({ setupRef: aSetupRef, offer: 'two-thirds-off' }),
      ],
      [
        'an offer of last year, which reads almost like the one it sells',
        JSON.stringify({ setupRef: aSetupRef, offer: `${theBlackFridayOffer}-2025` }),
      ],
      ['an offer that is not text', JSON.stringify({ setupRef: aSetupRef, offer: true })],
      ['an offer that is empty text', JSON.stringify({ setupRef: aSetupRef, offer: '' })],
      ['an offer and no setup at all', JSON.stringify({ offer: theBlackFridayOffer })],
    ];

    it.each(refusedBodies)('refuses %s, and reaches Stripe for none of them', async (_, body) => {
      const { held, stripe } = await aFinish();

      const answered = await finishSubscriptionFor(aRequest('PUT', tokenOf(), body), held);

      expect(answered.statusCode).toBe(400);
      expect(JSON.parse(answered.body)).toEqual({ error: theBodyASubscriptionTakes });
      expect(stripe.calls()).toEqual([]);
    });
  });

  describe('a token that starts nobody a subscription', () => {
    const refusedTokens: readonly (readonly [string, Record<string, string> | undefined])[] = [
      ['the token authorizer handed nothing on', undefined],
      ['the token is minted by another pool', tokenOf({ iss: issuerOfPool('us-east-1_SOMEONE') })],
      ['the token carries no user name', tokenOf({ [userNameClaim]: '' })],
    ];

    it.each(refusedTokens)('refuses the call when %s', async (_, claims) => {
      const { held, stripe } = await aFinish();

      const answered = await finishSubscriptionFor(
        aRequest('PUT', claims, theSetupSheConfirmed),
        held,
      );

      expect(answered.statusCode).toBe(401);
      expect(JSON.parse(answered.body)).toEqual({ error: thatTokenFinishesNothing });
      expect(stripe.calls()).toEqual([]);
    });

    it('tells every refused caller the same thing, so nobody learns which check said no', async () => {
      const { held } = await aFinish();

      const answers = await Promise.all(
        refusedTokens.map(([, claims]) =>
          finishSubscriptionFor(aRequest('PUT', claims, theSetupSheConfirmed), held),
        ),
      );

      expect(new Set(answers.map((answered) => answered.body)).size).toBe(1);
    });
  });

  describe('the offer she arrived with', () => {
    it('sends the coupon on the create for a press made before the offer closes', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {}, whileTheOfferIsOpen);

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmedOnTheOffer),
        held,
      );

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body).started).toBe(true);
      expect(stripe.fieldsOf(theCreate(stripe)!)[discountCouponField]).toBe(theBlackFridayCoupon);
      expect(stripe.subscriptionsMade()).toHaveLength(1);
    });

    it('leaves the price and the digest as they are beside the coupon, and no free month', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {}, whileTheOfferIsOpen);

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmedOnTheOffer), held);

      expect(stripe.fieldsOf(theCreate(stripe)!)).toEqual({
        customer: aCustomerRef,
        [subscriptionPriceField]: theYearlyPriceRef,
        [paymentBehaviourField]: theFirstInvoiceWaits,
        [expandField]: theSecretOfTheFirstInvoice,
        [savesTheDefaultField]: onSubscription,
        [payerDigestField]: payerDigest,
        [discountCouponField]: theBlackFridayCoupon,
      });
    });

    it('answers the secret her browser confirms the one charge on', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {}, whileTheOfferIsOpen);

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmedOnTheOffer),
        held,
      );
      const [subscriptionRef = ''] = stripe.subscriptionsMade();

      expect(JSON.parse(answered.body)).toEqual({
        started: true,
        paymentSecret: theSecretOfTheInvoiceOf(subscriptionRef),
      });
    });

    it('answers no secret on the one price, because a free month charges nothing', async () => {
      const { held } = await aFinish(sheHasPressedBuyEmi, {}, whileTheOfferIsOpen);

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmed),
        held,
      );

      expect(JSON.parse(answered.body)).toEqual({ started: true });
    });

    it('answers no secret to a woman who is already paying, because nothing was created', async () => {
      const { held, stripe } = await aFinish(
        { payerRef: aCustomerRef, subscriptionRef: 'sub_000000000777', state: 'active' },
        {},
        whileTheOfferIsOpen,
      );

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmedOnTheOffer),
        held,
      );

      expect(JSON.parse(answered.body)).toEqual({ started: true });
      expect(stripe.calls()).toEqual([]);
    });

    it('tells her nothing was created when the invoice of the offer names no secret', async () => {
      const { held, stripe } = await aFinish(
        sheHasPressedBuyEmi,
        { theInvoiceCarriesNoSecret: true },
        whileTheOfferIsOpen,
      );

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmedOnTheOffer),
        held,
      );

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: nothingWasCreated });
      expect(answered.body).not.toContain(stripe.subscriptionsMade()[0] ?? 'sub_');
    });

    it('keeps the free month on the create of the one price', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {}, whileTheOfferIsOpen);

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmed), held);

      expect(stripe.fieldsOf(theCreate(stripe)!)).toEqual({
        customer: aCustomerRef,
        [subscriptionPriceField]: theYearlyPriceRef,
        [trialDaysField]: String(theYearlyPrice.freeMonthDays),
        [savesTheDefaultField]: onSubscription,
        [whenNoCardIsLeftField]: cancelTheSubscription,
        [payerDigestField]: payerDigest,
      });
    });

    it('sends no coupon for a press made at the instant the offer closes', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {}, onceTheOfferHasClosed);

      const answered = await finishSubscriptionFor(
        aRequest('PUT', tokenOf(), theSetupSheConfirmedOnTheOffer),
        held,
      );

      expect(answered.statusCode).toBe(200);
      expect(stripe.fieldsOf(theCreate(stripe)!)[discountCouponField]).toBeUndefined();
      expect(stripe.fieldsOf(theCreate(stripe)!)[subscriptionPriceField]).toBe(theYearlyPriceRef);
      expect(stripe.subscriptionsMade()).toHaveLength(1);
    });

    it('sends no coupon when the body names no offer, while the offer is open', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {}, whileTheOfferIsOpen);

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmed), held);

      expect(Object.keys(stripe.fieldsOf(theCreate(stripe)!))).not.toContain(discountCouponField);
    });

    it('names the setup she confirmed as the key, which the offer does not move', async () => {
      const { held, stripe } = await aFinish(sheHasPressedBuyEmi, {}, whileTheOfferIsOpen);

      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmedOnTheOffer), held);
      await finishSubscriptionFor(aRequest('PUT', tokenOf(), theSetupSheConfirmedOnTheOffer), held);

      const keys = stripe
        .calls()
        .filter((call) => call.address === subscriptionsAddress)
        .map((call) => call.asked.headers[idempotencyHeader]);

      expect(keys).toEqual([oneSubscriptionPer(aSetupRef), oneSubscriptionPer(aSetupRef)]);
      expect(stripe.subscriptionsMade()).toHaveLength(1);
    });

    it('names the field the page sends the offer in, so the two cannot drift apart', () => {
      expect(offerField).toBe('offer');
      expect(JSON.parse(theSetupSheConfirmedOnTheOffer)[offerField]).toBe(theBlackFridayOffer);
    });
  });

  describe('the path the press and this call share', () => {
    async function theRoutes() {
      const { held, stripe, table } = await aFinish();

      return {
        stripe,
        routes: subscriptionRoutes({
          ...held,
          entitlements: dynamoEntitlementStore(table, tableName),
          clock: () => theInstant,
        }),
      };
    }

    it('sends a put on the subscription path to the call that creates one', async () => {
      const { routes, stripe } = await theRoutes();

      const answered = await routes(aRequest('PUT', tokenOf(), theSetupSheConfirmed));

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ started: true });
      expect(stripe.subscriptionsMade()).toHaveLength(1);
    });

    it('leaves a press on the same path making the customer and the setup', async () => {
      const { routes, stripe } = await theRoutes();

      const answered = await routes(aRequest('POST', tokenOf()));

      expect(answered.statusCode).toBe(200);
      expect(whatWasCalled(stripe)).toContain(`POST ${setupIntentsAddress}`);
      expect(stripe.subscriptionsMade()).toEqual([]);
    });
  });
});
