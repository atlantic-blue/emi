import { payerDigestFor } from '@emi/crypto';

import type { HttpRequestEvent } from '../src/api';
import {
  finishCardChangeFor,
  nothingOfHersIsPaidByCard,
  paymentMethodPath,
  startCardChangeFor,
  thatSetupIsNotFinished,
  thatSetupIsNotHers,
  thatTokenChangesNoCard,
  theBodyACardChangeTakes,
  theCardWasNotChanged,
  type WhatACardChangeNeeds,
} from '../src/payments/changeCard';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import type { EntitlementRoute } from '../src/payments/entitlements';
import { issuerOfPool, userNameClaim } from '../src/payments/poolToken';
import {
  customerDefaultField,
  setupIntentsAddress,
  subscriptionAddressFor,
  subscriptionDefaultField,
} from '../src/payments/stripe';
import { subscriptionRoutes } from '../src/payments/subscriptionRoutes';
import { fakeTable, tableName, type FakeTable } from './fixtures/dynamoTable';
import {
  aClientSecret,
  aCustomerRef,
  aPaymentMethodRef,
  aSetupRef,
  aSubscriptionRef,
  detachOf,
  fakeStripe,
  readOfTheCustomer,
  readOfTheSetup,
  theOldPaymentMethodRef,
  type FakeStripe,
  type WhatStripeAnswers,
} from './fixtures/stripe';

/**
 * The Change card row of her account page, from the token the api gateway believed to the card
 * every later charge goes to.
 *
 * Stripe is a double that answers what Stripe answers and records every call, and the item is
 * written through the store the webhook writes it with, so what is read here is the order the
 * calls left in and the form each one carried.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const userName = 'SignInWithApple_000482910';
const payerDigest = payerDigestFor(userPoolId, userName);
/** Not the shape of a real key. A value that looked like one would be read as a leak. */
const theKey = 'the-key-the-operator-wrote-by-hand';
const theInstant = new Date('2026-11-19T09:00:00.000Z');

function aRequest(
  method: string,
  claims?: Readonly<Record<string, string>>,
  body?: string,
): HttpRequestEvent {
  return {
    rawPath: paymentMethodPath,
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

/** What the item of one woman holds, where a test wants something other than a card in good order. */
interface WhatSheHasPaid {
  readonly route?: EntitlementRoute;
  readonly payerRef?: string;
  readonly subscriptionRef?: string;
}

interface AChange {
  held: WhatACardChangeNeeds;
  stripe: FakeStripe;
  table: FakeTable;
}

async function aChange(
  paid: WhatSheHasPaid | null = {},
  answers: WhatStripeAnswers = { chargesThePaymentMethod: theOldPaymentMethodRef },
): Promise<AChange> {
  const table = fakeTable();
  const entitlements = dynamoEntitlementStore(table, tableName);
  const stripe = fakeStripe(answers);

  if (paid !== null) {
    await entitlements.writeEntitlement({
      payerDigest,
      eventAt: Math.floor(theInstant.getTime() / 1000),
      writtenAt: theInstant.toISOString(),
      paidUntil: '2027-11-19T09:00:00.000Z',
      state: 'active',
      route: paid.route ?? 'card',
      ...(paid.payerRef === undefined ? {} : { payerRef: paid.payerRef }),
      ...(paid.subscriptionRef === undefined ? {} : { subscriptionRef: paid.subscriptionRef }),
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
    },
  };
}

/** Her item, in good order: paying by card, under one customer, with one subscription. */
const payingByCard: WhatSheHasPaid = {
  route: 'card',
  payerRef: aCustomerRef,
  subscriptionRef: aSubscriptionRef,
};

/** What the browser sends back once Stripe has taken the card or the wallet. */
const theSetupSheFinished = JSON.stringify({ setupRef: aSetupRef });

/** Each call as it left, so a test reads the order and not only the set. */
const whatWasCalled = (stripe: FakeStripe): string[] =>
  stripe.calls().map((call) => `${call.asked.method} ${call.address}`);

describe('the Change card row of her account page', () => {
  describe('the press, which collects a new payment method', () => {
    it('answers the secret the page mounts the card form on', async () => {
      const { held } = await aChange(payingByCard);

      const answered = await startCardChangeFor(aRequest('POST', tokenOf()), held);

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ clientSecret: aClientSecret });
    });

    it('makes the setup for the customer she already pays under, and makes no second customer', async () => {
      const { held, stripe } = await aChange(payingByCard);

      await startCardChangeFor(aRequest('POST', tokenOf()), held);

      expect(whatWasCalled(stripe)).toEqual([`POST ${setupIntentsAddress}`]);
      expect(stripe.fieldsOf(stripe.calls()[0]!).customer).toBe(aCustomerRef);
    });

    it('carries the key the parameter store holds, and writes nothing down', async () => {
      const { held, stripe, table } = await aChange(payingByCard);
      const before = table.calls().updateItem;

      await startCardChangeFor(aRequest('POST', tokenOf()), held);

      expect(stripe.calls()[0]!.asked.headers.authorization).toBe(`Bearer ${theKey}`);
      expect(table.calls().updateItem).toBe(before);
    });

    it('answers no secret and says nothing of the key when Stripe refuses the setup', async () => {
      const { held } = await aChange(payingByCard, {
        refusesTheSetup: { status: 402, body: JSON.stringify({ error: { code: 'card_error' } }) },
      });

      const answered = await startCardChangeFor(aRequest('POST', tokenOf()), held);

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: theCardWasNotChanged });
      expect(answered.body).not.toContain(theKey);
    });
  });

  describe('the confirmation, which makes what she gave the card every charge goes to', () => {
    it('sets the new default on the customer, then on the subscription, then detaches the old', async () => {
      const { held, stripe } = await aChange(payingByCard);

      const answered = await finishCardChangeFor(
        aRequest('PUT', tokenOf(), theSetupSheFinished),
        held,
      );

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ changed: true });
      expect(whatWasCalled(stripe)).toEqual([
        `GET ${readOfTheSetup(aSetupRef)}`,
        `GET ${readOfTheCustomer(aCustomerRef)}`,
        `POST ${readOfTheCustomer(aCustomerRef)}`,
        `POST ${subscriptionAddressFor(aSubscriptionRef)}`,
        `POST ${detachOf(theOldPaymentMethodRef)}`,
      ]);
    });

    it('names the payment method the setup collected in both of the two writes', async () => {
      const { held, stripe } = await aChange(payingByCard);

      await finishCardChangeFor(aRequest('PUT', tokenOf(), theSetupSheFinished), held);

      const [, , customer, subscription] = stripe.calls();

      expect(stripe.fieldsOf(customer!)).toEqual({ [customerDefaultField]: aPaymentMethodRef });
      expect(stripe.fieldsOf(subscription!)).toEqual({
        [subscriptionDefaultField]: aPaymentMethodRef,
      });
    });

    it('carries the key the parameter store holds on every call it makes', async () => {
      const { held, stripe } = await aChange(payingByCard);

      await finishCardChangeFor(aRequest('PUT', tokenOf(), theSetupSheFinished), held);

      for (const call of stripe.calls()) {
        expect(call.asked.headers.authorization).toBe(`Bearer ${theKey}`);
      }
    });

    it('detaches nothing when she confirmed the card she was already paying with', async () => {
      const { held, stripe } = await aChange(payingByCard, {
        chargesThePaymentMethod: aPaymentMethodRef,
      });

      const answered = await finishCardChangeFor(
        aRequest('PUT', tokenOf(), theSetupSheFinished),
        held,
      );

      expect(answered.statusCode).toBe(200);
      expect(whatWasCalled(stripe)).not.toContain(`POST ${detachOf(aPaymentMethodRef)}`);
    });

    it('detaches nothing when nothing was charged to a payment method before', async () => {
      const { held, stripe } = await aChange(payingByCard, {});

      const answered = await finishCardChangeFor(
        aRequest('PUT', tokenOf(), theSetupSheFinished),
        held,
      );

      expect(answered.statusCode).toBe(200);
      expect(whatWasCalled(stripe).filter((call) => call.includes('/payment_methods/'))).toEqual(
        [],
      );
    });

    it('leaves her paying with the new card when the detach of the old one is refused', async () => {
      const { held, stripe } = await aChange(payingByCard, {
        chargesThePaymentMethod: theOldPaymentMethodRef,
        refusesTheDetach: { status: 400, body: JSON.stringify({ error: { code: 'detached' } }) },
      });

      const answered = await finishCardChangeFor(
        aRequest('PUT', tokenOf(), theSetupSheFinished),
        held,
      );

      expect(answered.statusCode).toBe(200);
      expect(whatWasCalled(stripe)).toContain(`POST ${subscriptionAddressFor(aSubscriptionRef)}`);
    });

    it('leaves the old card attached when the subscription will not take the new one', async () => {
      const { held, stripe } = await aChange(payingByCard, {
        chargesThePaymentMethod: theOldPaymentMethodRef,
        refusesTheSubscription: {
          status: 400,
          body: JSON.stringify({ error: { code: 'resource_missing' } }),
        },
      });

      const answered = await finishCardChangeFor(
        aRequest('PUT', tokenOf(), theSetupSheFinished),
        held,
      );

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: theCardWasNotChanged });
      expect(whatWasCalled(stripe)).not.toContain(`POST ${detachOf(theOldPaymentMethodRef)}`);
    });
  });

  describe('a setup that is not hers to confirm', () => {
    it('refuses a setup made for another customer, and changes nothing at all', async () => {
      const { held, stripe } = await aChange(payingByCard, {
        chargesThePaymentMethod: theOldPaymentMethodRef,
        theSetupWasMadeFor: 'cus_000000000999',
      });

      const answered = await finishCardChangeFor(
        aRequest('PUT', tokenOf(), theSetupSheFinished),
        held,
      );

      expect(answered.statusCode).toBe(403);
      expect(JSON.parse(answered.body)).toEqual({ error: thatSetupIsNotHers });
      expect(whatWasCalled(stripe)).toEqual([`GET ${readOfTheSetup(aSetupRef)}`]);
    });

    it('says nothing about the state of a setup that is not hers', async () => {
      const { held } = await aChange(payingByCard, {
        theSetupWasMadeFor: 'cus_000000000999',
        theSetupReached: 'requires_payment_method',
      });

      const answered = await finishCardChangeFor(
        aRequest('PUT', tokenOf(), theSetupSheFinished),
        held,
      );

      expect(answered.statusCode).toBe(403);
      expect(answered.body).not.toContain('requires_payment_method');
    });

    it('refuses a setup she has not finished, and changes nothing at all', async () => {
      const { held, stripe } = await aChange(payingByCard, {
        chargesThePaymentMethod: theOldPaymentMethodRef,
        theSetupReached: 'requires_action',
      });

      const answered = await finishCardChangeFor(
        aRequest('PUT', tokenOf(), theSetupSheFinished),
        held,
      );

      expect(answered.statusCode).toBe(400);
      expect(JSON.parse(answered.body)).toEqual({ error: thatSetupIsNotFinished });
      expect(whatWasCalled(stripe)).toEqual([`GET ${readOfTheSetup(aSetupRef)}`]);
    });

    it('refuses a setup that names no payment method, however it reads otherwise', async () => {
      const { held, stripe } = await aChange(payingByCard, { theSetupCollected: '' });

      const answered = await finishCardChangeFor(
        aRequest('PUT', tokenOf(), theSetupSheFinished),
        held,
      );

      expect(answered.statusCode).toBe(400);
      expect(whatWasCalled(stripe)).toEqual([`GET ${readOfTheSetup(aSetupRef)}`]);
    });

    it('refuses a setup Stripe does not hold, and changes nothing at all', async () => {
      const { held } = await aChange(payingByCard, {
        refusesTheSetupRead: {
          status: 404,
          body: JSON.stringify({ error: { code: 'resource_missing' } }),
        },
      });

      const answered = await finishCardChangeFor(
        aRequest('PUT', tokenOf(), theSetupSheFinished),
        held,
      );

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: theCardWasNotChanged });
    });
  });

  describe('the one field a confirmation carries', () => {
    const refusedBodies: readonly (readonly [string, string])[] = [
      [
        'a field this call does not take',
        JSON.stringify({ setupRef: aSetupRef, customer: 'cus_1' }),
      ],
      ['a body naming no setup', JSON.stringify({})],
      ['a setup that is not text', JSON.stringify({ setupRef: 7 })],
      ['a setup that is empty text', JSON.stringify({ setupRef: '' })],
      ['a body that is not json at all', 'seti_000000000001'],
      ['a body that is a list', JSON.stringify([{ setupRef: aSetupRef }])],
    ];

    it.each(refusedBodies)('refuses %s, and reaches Stripe for none of them', async (_, body) => {
      const { held, stripe } = await aChange(payingByCard);

      const answered = await finishCardChangeFor(aRequest('PUT', tokenOf(), body), held);

      expect(answered.statusCode).toBe(400);
      expect(JSON.parse(answered.body)).toEqual({ error: theBodyACardChangeTakes });
      expect(stripe.calls()).toEqual([]);
    });
  });

  describe('a woman who is not paying by card', () => {
    const notPayingByCard: readonly (readonly [string, WhatSheHasPaid | null])[] = [
      ['has never paid at all', null],
      ['pays with Telegram Stars', { route: 'stars', payerRef: undefined }],
      [
        'pays with Stars under a record that still names the customer of a card',
        { route: 'stars', payerRef: aCustomerRef, subscriptionRef: aSubscriptionRef },
      ],
      ['has pressed Buy Emi and finished nothing', { route: undefined, payerRef: aCustomerRef }],
      ['has a record naming no customer', { route: 'card', subscriptionRef: aSubscriptionRef }],
      ['has a record naming no subscription', { route: 'card', payerRef: aCustomerRef }],
    ];

    it.each(notPayingByCard)(
      'tells her that nothing of hers is on a card when she %s',
      async (_, paid) => {
        const { held, stripe } = await aChange(paid);

        const pressed = await startCardChangeFor(aRequest('POST', tokenOf()), held);
        const confirmed = await finishCardChangeFor(
          aRequest('PUT', tokenOf(), theSetupSheFinished),
          held,
        );

        expect(pressed.statusCode).toBe(404);
        expect(JSON.parse(pressed.body)).toEqual({ error: nothingOfHersIsPaidByCard });
        expect(confirmed.statusCode).toBe(404);
        expect(stripe.calls()).toEqual([]);
      },
    );
  });

  describe('a token that changes nobody’s card', () => {
    const refusedTokens: readonly (readonly [string, Record<string, string> | undefined])[] = [
      ['the token authorizer handed nothing on', undefined],
      ['the token is minted by another pool', tokenOf({ iss: issuerOfPool('us-east-1_SOMEONE') })],
      ['the token carries no user name', tokenOf({ [userNameClaim]: '' })],
    ];

    it.each(refusedTokens)('refuses both calls when %s', async (_, claims) => {
      const { held, stripe } = await aChange(payingByCard);

      const pressed = await startCardChangeFor(aRequest('POST', claims), held);
      const confirmed = await finishCardChangeFor(
        aRequest('PUT', claims, theSetupSheFinished),
        held,
      );

      expect(pressed.statusCode).toBe(401);
      expect(confirmed.statusCode).toBe(401);
      expect(JSON.parse(pressed.body)).toEqual({ error: thatTokenChangesNoCard });
      expect(stripe.calls()).toEqual([]);
    });

    it('tells every refused caller the same thing, so nobody learns which check said no', async () => {
      const { held } = await aChange(payingByCard);

      const answers = await Promise.all(
        refusedTokens.map(([, claims]) => startCardChangeFor(aRequest('POST', claims), held)),
      );

      expect(new Set(answers.map((answered) => answered.body)).size).toBe(1);
    });
  });

  describe('the path the two calls share', () => {
    async function theRoutes() {
      const { held, stripe, table } = await aChange(payingByCard);

      return {
        stripe,
        routes: subscriptionRoutes({
          ...held,
          entitlements: dynamoEntitlementStore(table, tableName),
          clock: () => theInstant,
        }),
      };
    }

    it('sends a press to the setup it makes for her', async () => {
      const { routes } = await theRoutes();

      const answered = await routes(aRequest('POST', tokenOf()));

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ clientSecret: aClientSecret });
    });

    it('sends a confirmation to the call that moves the default', async () => {
      const { routes, stripe } = await theRoutes();

      const answered = await routes(aRequest('PUT', tokenOf(), theSetupSheFinished));

      expect(answered.statusCode).toBe(200);
      expect(whatWasCalled(stripe)).toContain(`POST ${subscriptionAddressFor(aSubscriptionRef)}`);
    });

    it('answers a method this path does not take, rather than guessing at one of the two', async () => {
      const { routes, stripe } = await theRoutes();

      const answered = await routes(aRequest('GET', tokenOf()));

      expect(answered.statusCode).toBe(405);
      expect(stripe.calls()).toEqual([]);
    });

    it('answers a path this function is wired to and does not take, and calls nothing', async () => {
      const { routes, stripe } = await theRoutes();

      const answered = await routes({
        ...aRequest('POST', tokenOf()),
        rawPath: '/v1/payments/nothing-is-here',
      });

      expect(answered.statusCode).toBe(405);
      expect(stripe.calls()).toEqual([]);
    });
  });
});
