import { payerDigestFor } from '@emi/crypto';

import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import {
  entitlementSortKey,
  paymentPartitionFor,
  type EntitlementStore,
} from '../src/payments/entitlements';
import { eventsTheWebhookReads, instantOfSeconds } from '../src/payments/stripeEvents';
import { secretHeldOnce, stripeWebhookSecretParameter } from '../src/payments/stripeSecrets';
import { signatureWindowSeconds } from '../src/payments/stripeSignature';
import {
  thatDeliveryCannotBeRead,
  thatDeliveryIsNotSigned,
  webhookFor,
  type WhatTheWebhookNeeds,
} from '../src/payments/webhook';
import type { HttpResponse } from '../src/api';
import type { AttributeValue, Item } from '../src/store/dynamo';
import type { ParameterStore, ParameterWrite } from '../src/telegram/parameters';
import { fakeTable, tableName, type FakeTable } from './fixtures/dynamoTable';
import { fakeStripe, readOfTheCustomer, type FakeStripe } from './fixtures/stripe';
import {
  aDelivery,
  anEvent,
  anInvoice,
  aSubscription,
  theSigningSecret,
} from './fixtures/stripeDeliveries';

/**
 * The deliveries of Stripe, from the signature to the item.
 *
 * Every delivery is signed the way Stripe signs one, over the timestamp and the body together, so
 * what is proved here is the check the deployed function carries out and not a stand in for it.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const payerDigest = payerDigestFor(userPoolId, 'SignInWithApple_000482910');
const customerRef = 'cus_000000000001';
const subscriptionRef = 'sub_000000000001';
const theKey = 'the-key-the-operator-wrote-by-hand';

/** The instant the subscription was made at, and the end of her free month 30 days later. */
const whenShePressed = 1_763_280_000;
const theFreeMonthEnds = whenShePressed + 30 * 86_400;
const theYearEnds = theFreeMonthEnds + 365 * 86_400;

const now = new Date(whenShePressed * 1000);

function parametersHolding(held: Readonly<Record<string, string>>): ParameterStore {
  return {
    read: (name: string): Promise<string | undefined> => Promise.resolve(held[name]),
    writeIfAbsent: (): Promise<ParameterWrite> =>
      Promise.reject(new Error('the webhook writes no parameter')),
  };
}

interface AWebhook {
  held: WhatTheWebhookNeeds;
  stripe: FakeStripe;
  table: FakeTable;
  store: EntitlementStore;
  /** Signs the event at that instant, moves the clock there, and hands the delivery over. */
  deliver: (event: unknown, at: Date) => Promise<HttpResponse>;
}

function aWebhook(
  options: {
    readonly stripe?: FakeStripe;
    readonly parameters?: ParameterStore;
    readonly clock?: () => Date;
  } = {},
): AWebhook {
  const stripe = options.stripe ?? fakeStripe({ holdsThePayerDigest: payerDigest });
  const table = fakeTable();
  const parameters =
    options.parameters ?? parametersHolding({ [stripeWebhookSecretParameter]: theSigningSecret });
  let reading = now;

  const held: WhatTheWebhookNeeds = {
    entitlements: dynamoEntitlementStore(table, tableName),
    reaches: stripe.reaches,
    signingSecret: secretHeldOnce(parameters, stripeWebhookSecretParameter),
    secretKey: () => Promise.resolve(theKey),
    clock: options.clock ?? (() => reading),
  };

  return {
    stripe,
    table,
    held,
    store: dynamoEntitlementStore(table, tableName),
    deliver: (event: unknown, at: Date) => {
      reading = at;

      return webhookFor(aDelivery(event, { signedAt: at }), held);
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

const subscriptionCreated = anEvent(
  'customer.subscription.created',
  aSubscription({ customer: customerRef, periodEnd: theFreeMonthEnds, id: subscriptionRef }),
  whenShePressed,
);

const invoicePaid = anEvent(
  'invoice.paid',
  anInvoice({ customer: customerRef, periodEnd: theYearEnds }),
  theFreeMonthEnds,
);

describe('a delivery of Stripe', () => {
  describe('what it owes before one field of the body is read', () => {
    it('refuses a body whose signature does not verify, and writes nothing', async () => {
      const { held, table, stripe } = aWebhook();
      const delivery = aDelivery(subscriptionCreated, {
        signedAt: now,
        secret: 'not-the-signing-secret',
      });

      const answered = await webhookFor(delivery, held);

      expect(answered.statusCode).toBe(400);
      expect(JSON.parse(answered.body)).toEqual({ error: thatDeliveryIsNotSigned });
      expect(table.items()).toEqual([]);
      expect(stripe.calls()).toEqual([]);
    });

    it('refuses a body somebody changed after it was signed, and writes nothing', async () => {
      const { held, table } = aWebhook();
      const delivery = aDelivery(subscriptionCreated, { signedAt: now });
      const changed = {
        ...delivery,
        body: JSON.stringify(
          anEvent(
            'customer.subscription.created',
            aSubscription({ customer: 'cus_somebody_else', periodEnd: theYearEnds }),
            whenShePressed,
          ),
        ),
      };

      expect((await webhookFor(changed, held)).statusCode).toBe(400);
      expect(table.items()).toEqual([]);
    });

    it('refuses a delivery with no signature header at all', async () => {
      const { held, table } = aWebhook();
      const delivery = aDelivery(subscriptionCreated, { signedAt: now });

      const answered = await webhookFor({ ...delivery, headers: {} }, held);

      expect(answered.statusCode).toBe(400);
      expect(table.items()).toEqual([]);
    });

    it('refuses a delivery signed too long ago, which is a signature somebody replayed', async () => {
      const { held, table } = aWebhook();
      const old = new Date((whenShePressed - signatureWindowSeconds - 1) * 1000);

      const answered = await webhookFor(aDelivery(subscriptionCreated, { signedAt: old }), held);

      expect(answered.statusCode).toBe(400);
      expect(table.items()).toEqual([]);
    });

    it('reads no parameter and no customer for a header carrying no signature of this scheme', async () => {
      const reads: string[] = [];
      const { held, stripe, table } = aWebhook({
        parameters: {
          read: (name: string) => {
            reads.push(name);

            return Promise.resolve(theSigningSecret);
          },
          writeIfAbsent: () => Promise.reject(new Error('the webhook writes no parameter')),
        },
      });

      const answered = await webhookFor(
        aDelivery(subscriptionCreated, { signedAt: now, header: 't=1' }),
        held,
      );

      expect(answered.statusCode).toBe(400);
      expect(reads).toEqual([]);
      expect(stripe.calls()).toEqual([]);
      expect(table.items()).toEqual([]);
    });

    it('asks Stripe to send it again when the signing secret cannot be read', async () => {
      const { held, table } = aWebhook({ parameters: parametersHolding({}) });

      const answered = await webhookFor(aDelivery(subscriptionCreated, { signedAt: now }), held);

      expect(answered.statusCode).toBe(500);
      expect(table.items()).toEqual([]);
    });
  });

  describe('which payer the delivery is about', () => {
    it('reads the digest off the customer the event names, and writes under it', async () => {
      const { held, stripe, table } = aWebhook();

      await webhookFor(aDelivery(subscriptionCreated, { signedAt: now }), held);

      expect(stripe.calls().map((call) => call.address)).toEqual([readOfTheCustomer(customerRef)]);
      expect(stripe.calls()[0]?.asked.method).toBe('GET');
      expect(stripe.calls()[0]?.asked.body).toBeUndefined();
      expect(textOf(itemIn(table)?.pk)).toBe(paymentPartitionFor(payerDigest));
    });

    it('takes a customer carrying no digest and writes nothing, because no payment is under it', async () => {
      const { held, table } = aWebhook({ stripe: fakeStripe() });

      const answered = await webhookFor(aDelivery(subscriptionCreated, { signedAt: now }), held);

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ written: false });
      expect(table.items()).toEqual([]);
    });

    it('writes nothing under a digest that is not the shape a payment is held under', async () => {
      const { held, table } = aWebhook({
        stripe: fakeStripe({ holdsThePayerDigest: 'not a digest' }),
      });

      expect(
        (await webhookFor(aDelivery(subscriptionCreated, { signedAt: now }), held)).statusCode,
      ).toBe(200);
      expect(table.items()).toEqual([]);
    });

    it('asks Stripe to send it again when the customer cannot be read', async () => {
      const { held, table } = aWebhook({
        stripe: fakeStripe({
          refusesTheCustomerRead: { status: 503, body: '{"error":{"type":"api_error"}}' },
        }),
      });

      const answered = await webhookFor(aDelivery(subscriptionCreated, { signedAt: now }), held);

      expect(answered.statusCode).toBe(500);
      expect(table.items()).toEqual([]);
    });
  });

  describe('what each event writes', () => {
    it('writes the date of the free month, the route and the subscription on a created event', async () => {
      const { held, table } = aWebhook();

      const answered = await webhookFor(aDelivery(subscriptionCreated, { signedAt: now }), held);

      expect(JSON.parse(answered.body)).toEqual({ written: true });
      expect(textOf(itemIn(table)?.paidUntil)).toBe(instantOfSeconds(theFreeMonthEnds));
      expect(textOf(itemIn(table)?.route)).toBe('card');
      expect(textOf(itemIn(table)?.state)).toBe('active');
      expect(textOf(itemIn(table)?.subscriptionRef)).toBe(subscriptionRef);
    });

    it('moves the date a year forward on the invoice that is paid', async () => {
      const { deliver, table } = aWebhook();

      await deliver(subscriptionCreated, now);
      await deliver(invoicePaid, new Date(theFreeMonthEnds * 1000));

      expect(textOf(itemIn(table)?.paidUntil)).toBe(instantOfSeconds(theYearEnds));
      expect(textOf(itemIn(table)?.state)).toBe('active');
      expect(textOf(itemIn(table)?.subscriptionRef)).toBe(subscriptionRef);
    });

    it('says she is cancelling when she stops the renewal, and keeps the date she paid for', async () => {
      const { deliver, table } = aWebhook();
      const stopped = anEvent(
        'customer.subscription.updated',
        aSubscription({
          customer: customerRef,
          periodEnd: theYearEnds,
          id: subscriptionRef,
          cancelAtPeriodEnd: true,
        }),
        theFreeMonthEnds,
      );

      await deliver(subscriptionCreated, now);
      await deliver(stopped, new Date(theFreeMonthEnds * 1000));

      expect(textOf(itemIn(table)?.state)).toBe('cancelling');
      expect(textOf(itemIn(table)?.paidUntil)).toBe(instantOfSeconds(theYearEnds));
    });

    it('says she is active again when she turns the renewal back on', async () => {
      const { deliver, table } = aWebhook();
      const stopped = anEvent(
        'customer.subscription.updated',
        aSubscription({
          customer: customerRef,
          periodEnd: theYearEnds,
          cancelAtPeriodEnd: true,
        }),
        theFreeMonthEnds,
      );
      const turnedBackOn = anEvent(
        'customer.subscription.updated',
        aSubscription({ customer: customerRef, periodEnd: theYearEnds }),
        theFreeMonthEnds + 60,
      );

      await deliver(stopped, new Date(theFreeMonthEnds * 1000));
      await deliver(turnedBackOn, new Date((theFreeMonthEnds + 60) * 1000));

      expect(textOf(itemIn(table)?.state)).toBe('active');
    });

    it('lapses her when the subscription is gone, and leaves the year she paid for alone', async () => {
      const { deliver, table } = aWebhook();
      const gone = anEvent(
        'customer.subscription.deleted',
        aSubscription({ customer: customerRef, periodEnd: theYearEnds, id: subscriptionRef }),
        theYearEnds,
      );

      await deliver(subscriptionCreated, now);
      await deliver(gone, new Date(theYearEnds * 1000));

      expect(textOf(itemIn(table)?.state)).toBe('lapsed');
      expect(textOf(itemIn(table)?.paidUntil)).toBe(instantOfSeconds(theFreeMonthEnds));
    });
  });

  describe('a payment her bank refused', () => {
    const failed = (createdAt: number): Readonly<Record<string, unknown>> =>
      anEvent(
        'invoice.payment_failed',
        anInvoice({ customer: customerRef, periodEnd: theYearEnds }),
        createdAt,
      );

    it('leaves the date where it is, and does not lapse her while that date still runs', async () => {
      const { deliver, table } = aWebhook();
      const theDayAfterShePressed = whenShePressed + 86_400;

      await deliver(subscriptionCreated, now);
      await deliver(failed(theDayAfterShePressed), new Date(theDayAfterShePressed * 1000));

      expect(textOf(itemIn(table)?.paidUntil)).toBe(instantOfSeconds(theFreeMonthEnds));
      expect(textOf(itemIn(table)?.state)).toBe('active');
    });

    it('lapses her once the date she paid for has passed', async () => {
      const afterTheDate = theFreeMonthEnds + 86_400;
      const { deliver, table } = aWebhook();

      await deliver(subscriptionCreated, now);
      await deliver(failed(afterTheDate), new Date(afterTheDate * 1000));

      expect(textOf(itemIn(table)?.state)).toBe('lapsed');
      expect(textOf(itemIn(table)?.paidUntil)).toBe(instantOfSeconds(theFreeMonthEnds));
    });
  });

  describe('the period, which is on the subscription item and not on the subscription', () => {
    it('writes nothing for a subscription carrying the period at its top and not on its item', async () => {
      const { held, table } = aWebhook();
      const oldShape = anEvent(
        'customer.subscription.created',
        {
          id: subscriptionRef,
          object: 'subscription',
          customer: customerRef,
          cancel_at_period_end: false,
          current_period_end: theFreeMonthEnds,
          items: { object: 'list', data: [{ id: 'si_000000000001', object: 'subscription_item' }] },
        },
        whenShePressed,
      );

      const answered = await webhookFor(aDelivery(oldShape, { signedAt: now }), held);

      expect(answered.statusCode).toBe(400);
      expect(JSON.parse(answered.body)).toEqual({ error: thatDeliveryCannotBeRead });
      expect(table.items()).toEqual([]);
    });

    it('writes nothing for an invoice whose line carries no period', async () => {
      const { held, table } = aWebhook();
      const noPeriod = anEvent(
        'invoice.paid',
        {
          id: 'in_000000000001',
          object: 'invoice',
          customer: customerRef,
          lines: { object: 'list', data: [{ id: 'il_000000000001', object: 'line_item' }] },
        },
        theFreeMonthEnds,
      );

      expect((await webhookFor(aDelivery(noPeriod, { signedAt: now }), held)).statusCode).toBe(400);
      expect(table.items()).toEqual([]);
    });
  });

  describe('an order Stripe does not promise', () => {
    it('leaves the newer date in place when an older event arrives after it', async () => {
      const { deliver, table } = aWebhook();

      await deliver(invoicePaid, new Date(theFreeMonthEnds * 1000));

      const answered = await deliver(subscriptionCreated, now);

      expect(JSON.parse(answered.body)).toEqual({ written: false });
      expect(textOf(itemIn(table)?.paidUntil)).toBe(instantOfSeconds(theYearEnds));
    });

    it('takes the same delivery twice and writes it once', async () => {
      const { held, table } = aWebhook();
      const delivery = aDelivery(subscriptionCreated, { signedAt: now });

      expect(JSON.parse((await webhookFor(delivery, held)).body)).toEqual({ written: true });
      expect(JSON.parse((await webhookFor(delivery, held)).body)).toEqual({ written: false });
      expect(textOf(itemIn(table)?.paidUntil)).toBe(instantOfSeconds(theFreeMonthEnds));
    });
  });

  describe('every other event of the account', () => {
    it('takes an event this service does not read and writes nothing', async () => {
      const { held, stripe, table } = aWebhook();
      const other = anEvent('payment_intent.succeeded', { id: 'pi_1', customer: customerRef }, 1);

      const answered = await webhookFor(aDelivery(other, { signedAt: now }), held);

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ written: false });
      expect(table.items()).toEqual([]);
      expect(stripe.calls()).toEqual([]);
    });

    it('reads the five events of the design and no other', () => {
      expect([...eventsTheWebhookReads]).toEqual([
        'customer.subscription.created',
        'customer.subscription.updated',
        'invoice.paid',
        'invoice.payment_failed',
        'customer.subscription.deleted',
      ]);
    });
  });
});
