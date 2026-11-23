import {
  cancelTheSubscription,
  discountCouponField,
  expandField,
  onSubscription,
  payerDigestField,
  paymentBehaviourField,
  savesTheDefaultField,
  subscriptionPriceField,
  theBlackFridayCoupon,
  theBlackFridayOffer,
  theBlackFridayOfferEnds,
  theCouponFor,
  theFirstInvoiceWaits,
  theSecretOfTheFirstInvoice,
  type TheSubscriptionMade,
  theYearlyPrice,
  theYearlyPriceRef,
  trialDaysField,
  type WhatACallHolds,
  whenNoCardIsLeftField,
  yearlySubscriptionFor,
} from '../src/payments/stripe';
import {
  type EventTheWebhookReads,
  type MoneyEvent,
  nothingHasBeenPaidYet,
  whatTheEventWrites,
} from '../src/payments/stripeEvents';
import {
  aCustomerRef,
  fakeStripe,
  type FakeStripe,
  theSecretOfTheInvoiceOf,
  trialing,
  type WhatStripeAnswers,
} from './fixtures/stripe';

/**
 * The one offer the money sells: half of the yearly price, every year, for a subscription started
 * before the offer closes, and charged the moment she presses.
 *
 * The coupon exists in the Stripe account and nothing here makes it or reads it back, so these
 * cases read what the create carried rather than what Stripe holds. The decision is a function of
 * two things and nothing else, the offer the body named and the instant the create is made at, so
 * it is driven directly as well as through the call that uses it.
 *
 * The free month is the other half of the rule. It belongs to the one price, so a create that
 * carries the coupon carries no trial and leaves its first invoice to be paid, and the deliveries
 * of that unpaid invoice may not hand her the year before the money lands.
 */

const payerDigest = 'a7f3c1d9e2b40586';
/** Not the shape of a real key. A value that looked like one would be read as a leak. */
const theKey = 'the-key-the-operator-wrote-by-hand';
const oneOfAKind = 'the-subscription-of-one-setup';

function aPayer(stripe: FakeStripe): WhatACallHolds {
  return { reaches: stripe.reaches, secretKey: theKey };
}

/** The instant a webhook case reads the clock at, which is long after every date it names. */
const now = new Date('2027-12-01T00:00:00.000Z');

/** A month before the end, a minute before it, the instant itself, and a minute after. */
const wellBeforeTheEnd = new Date('2026-11-01T00:00:00.000Z');
const aMinuteBeforeTheEnd = new Date('2026-11-30T22:59:00.000Z');
const theEndItself = theBlackFridayOfferEnds;
const aMinuteAfterTheEnd = new Date('2026-11-30T23:01:00.000Z');

describe('the coupon one create carries', () => {
  it('closes at the first instant of December in central Europe', () => {
    expect(theBlackFridayOfferEnds.toISOString()).toBe('2026-11-30T23:00:00.000Z');
  });

  it('names the one coupon the operator made, and no amount of its own', () => {
    expect(theBlackFridayCoupon).toBe('emi-black-friday-2026');
    expect(theBlackFridayOffer).toBe('black-friday');
  });

  it.each([
    ['a month before the end', wellBeforeTheEnd],
    ['a minute before the end', aMinuteBeforeTheEnd],
  ])('answers the coupon for the offer %s', (_said, now) => {
    expect(theCouponFor(theBlackFridayOffer, now)).toBe(theBlackFridayCoupon);
  });

  it.each([
    ['the end itself', theEndItself],
    ['a minute after the end', aMinuteAfterTheEnd],
  ])('answers no coupon for the offer at %s, so she pays the full price', (_said, now) => {
    expect(theCouponFor(theBlackFridayOffer, now)).toBeNull();
  });

  it.each([
    ['no offer at all', undefined],
    ['the offer of last year', `${theBlackFridayOffer}-2025`],
    ['an offer nobody sells', 'two-thirds-off'],
    ['the offer in capitals, because a value is read and not guessed at', 'BLACK-FRIDAY'],
    ['empty text', ''],
  ])('answers no coupon for %s, while the offer is open', (_said, offer) => {
    expect(theCouponFor(offer, aMinuteBeforeTheEnd)).toBeNull();
  });
});

describe('the create of a subscription on the offer', () => {
  /** One create, as the fields it carried and what it answered. */
  async function aCreateWith(
    offer: string | undefined,
    now: Date,
    answers: WhatStripeAnswers = {},
  ): Promise<{ fields: Record<string, string>; made: TheSubscriptionMade }> {
    const stripe = fakeStripe(answers);

    const made = await yearlySubscriptionFor(aPayer(stripe), {
      customerRef: aCustomerRef,
      payerDigest,
      oneOfAKind,
      ...(offer === undefined ? {} : { offer }),
      now,
    });

    const call = stripe.calls()[0];

    expect(call).toBeDefined();

    return { fields: stripe.fieldsOf(call!), made };
  }

  const theCreateWith = async (
    offer: string | undefined,
    now: Date,
  ): Promise<Record<string, string>> => (await aCreateWith(offer, now)).fields;

  it('carries the coupon and no free month, because the offer is charged at once', async () => {
    const fields = await theCreateWith(theBlackFridayOffer, aMinuteBeforeTheEnd);

    expect(fields).toEqual({
      customer: aCustomerRef,
      [subscriptionPriceField]: theYearlyPriceRef,
      [paymentBehaviourField]: theFirstInvoiceWaits,
      [expandField]: theSecretOfTheFirstInvoice,
      [savesTheDefaultField]: onSubscription,
      [payerDigestField]: payerDigest,
      [discountCouponField]: theBlackFridayCoupon,
    });
  });

  it('names no days of a free month and no end of one, on the offer', async () => {
    const fields = await theCreateWith(theBlackFridayOffer, aMinuteBeforeTheEnd);

    expect(Object.keys(fields)).not.toContain(trialDaysField);
    expect(Object.keys(fields)).not.toContain(whenNoCardIsLeftField);
    expect(Object.values(fields)).not.toContain(String(theYearlyPrice.freeMonthDays));
  });

  it('leaves the first invoice to be paid in her browser, rather than charging it off session', async () => {
    const { fields, made } = await aCreateWith(theBlackFridayOffer, aMinuteBeforeTheEnd);

    expect(fields[paymentBehaviourField]).toBe(theFirstInvoiceWaits);
    expect(theFirstInvoiceWaits).toBe('default_incomplete');
    expect(made.paymentSecret).toBe(theSecretOfTheInvoiceOf(made.subscriptionRef));
  });

  it('asks the answer to carry the secret, because an identifier confirms nothing', async () => {
    const fields = await theCreateWith(theBlackFridayOffer, aMinuteBeforeTheEnd);

    expect(fields[expandField]).toBe(theSecretOfTheFirstInvoice);
    expect(theSecretOfTheFirstInvoice).toBe('latest_invoice.confirmation_secret');
  });

  it('refuses a create whose invoice names no secret, so nobody is left owing it', async () => {
    await expect(
      aCreateWith(theBlackFridayOffer, aMinuteBeforeTheEnd, { theInvoiceCarriesNoSecret: true }),
    ).rejects.toThrow('named no first payment to confirm');
  });

  it('carries the free month and no coupon once the offer has closed', async () => {
    const { fields, made } = await aCreateWith(theBlackFridayOffer, theEndItself);

    expect(Object.keys(fields)).not.toContain(discountCouponField);
    expect(fields[subscriptionPriceField]).toBe(theYearlyPriceRef);
    expect(fields[trialDaysField]).toBe(String(theYearlyPrice.freeMonthDays));
    expect(made.paymentSecret).toBeNull();
  });

  it('carries the free month and no coupon for a press that named no offer', async () => {
    const { fields, made } = await aCreateWith(undefined, aMinuteBeforeTheEnd);

    expect(fields).toEqual({
      customer: aCustomerRef,
      [subscriptionPriceField]: theYearlyPriceRef,
      [trialDaysField]: String(theYearlyPrice.freeMonthDays),
      [whenNoCardIsLeftField]: cancelTheSubscription,
      [savesTheDefaultField]: onSubscription,
      [payerDigestField]: payerDigest,
    });
    expect(theYearlyPrice.freeMonthDays).toBe(30);
    expect(made.paymentSecret).toBeNull();
  });

  it('asks for no secret on the one price, because an invoice of zero charges nothing', async () => {
    const fields = await theCreateWith(undefined, aMinuteBeforeTheEnd);

    expect(Object.keys(fields)).not.toContain(paymentBehaviourField);
    expect(Object.keys(fields)).not.toContain(expandField);
  });

  it('carries the free month and no coupon for an offer this account does not sell', async () => {
    const { fields, made } = await aCreateWith('two-thirds-off', aMinuteBeforeTheEnd);

    expect(Object.keys(fields)).not.toContain(discountCouponField);
    expect(Object.values(fields)).not.toContain('two-thirds-off');
    expect(fields[trialDaysField]).toBe(String(theYearlyPrice.freeMonthDays));
    expect(made.paymentSecret).toBeNull();
  });

  it('writes the coupon in the field this api reads one discount of a subscription in', () => {
    expect(discountCouponField).toBe('discounts[0][coupon]');
  });
});

/**
 * The deliveries of a subscription waiting for its first payment. The create answers the secret and
 * the event arrives before she confirms it, so the webhook has to leave her where she was.
 */
describe('what the webhook writes for a subscription nobody has paid for yet', () => {
  const theSubscriptionRef = 'sub_000000000001';
  const aPeriodThatHasStarted = '2027-11-23T10:00:00.000Z';

  /** One subscription event, as Stripe delivers it, in the state the create left it in. */
  function anEventSaying(type: EventTheWebhookReads, state: string): MoneyEvent {
    return {
      type,
      eventAt: 1_795_000_000,
      customerRef: aCustomerRef,
      subscriptionRef: theSubscriptionRef,
      paidUntil: aPeriodThatHasStarted,
      subscriptionState: state,
    };
  }

  it.each(['customer.subscription.created', 'customer.subscription.updated'] as const)(
    'writes no date and no state for %s while the first payment waits',
    (type) => {
      const written = whatTheEventWrites(
        anEventSaying(type, nothingHasBeenPaidYet),
        undefined,
        now,
      );

      expect(written).toEqual({ eventAt: 1_795_000_000 });
    },
  );

  it('grants her the year as soon as the payment lands', () => {
    const written = whatTheEventWrites(
      {
        type: 'invoice.paid',
        eventAt: 1_795_000_100,
        customerRef: aCustomerRef,
        paidUntil: aPeriodThatHasStarted,
      },
      undefined,
      now,
    );

    expect(written).toEqual({
      eventAt: 1_795_000_100,
      paidUntil: aPeriodThatHasStarted,
      state: 'active',
    });
  });

  it('still grants her the free month of a create that carries one', () => {
    const written = whatTheEventWrites(
      anEventSaying('customer.subscription.created', trialing),
      undefined,
      now,
    );

    expect(written).toEqual({
      eventAt: 1_795_000_000,
      paidUntil: aPeriodThatHasStarted,
      route: 'card',
      state: 'active',
      subscriptionRef: theSubscriptionRef,
    });
  });

  it('names the state Stripe holds an unpaid subscription in', () => {
    expect(nothingHasBeenPaidYet).toBe('incomplete');
  });
});
