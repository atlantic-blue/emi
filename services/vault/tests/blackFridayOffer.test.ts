import {
  cancelTheSubscription,
  discountCouponField,
  onSubscription,
  payerDigestField,
  savesTheDefaultField,
  subscriptionPriceField,
  theBlackFridayCoupon,
  theBlackFridayOffer,
  theBlackFridayOfferEnds,
  theCouponFor,
  theYearlyPrice,
  theYearlyPriceRef,
  trialDaysField,
  type WhatACallHolds,
  whenNoCardIsLeftField,
  yearlySubscriptionFor,
} from '../src/payments/stripe';
import { aCustomerRef, fakeStripe, type FakeStripe } from './fixtures/stripe';

/**
 * The one offer the money sells: half of the yearly price, every year, for a subscription started
 * before the offer closes.
 *
 * The coupon exists in the Stripe account and nothing here makes it or reads it back, so these
 * cases read what the create carried rather than what Stripe holds. The decision is a function of
 * two things and nothing else, the offer the body named and the instant the create is made at, so
 * it is driven directly as well as through the call that uses it.
 */

const payerDigest = 'a7f3c1d9e2b40586';
/** Not the shape of a real key. A value that looked like one would be read as a leak. */
const theKey = 'the-key-the-operator-wrote-by-hand';
const oneOfAKind = 'the-subscription-of-one-setup';

function aPayer(stripe: FakeStripe): WhatACallHolds {
  return { reaches: stripe.reaches, secretKey: theKey };
}

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
  /** The create, as the fields it carried. */
  async function theCreateWith(
    offer: string | undefined,
    now: Date,
  ): Promise<Record<string, string>> {
    const stripe = fakeStripe();

    await yearlySubscriptionFor(aPayer(stripe), {
      customerRef: aCustomerRef,
      payerDigest,
      oneOfAKind,
      ...(offer === undefined ? {} : { offer }),
      now,
    });

    const call = stripe.calls()[0];

    expect(call).toBeDefined();

    return stripe.fieldsOf(call!);
  }

  it('carries the coupon beside the yearly price, rather than instead of it', async () => {
    const fields = await theCreateWith(theBlackFridayOffer, aMinuteBeforeTheEnd);

    expect(fields).toEqual({
      customer: aCustomerRef,
      [subscriptionPriceField]: theYearlyPriceRef,
      [trialDaysField]: String(theYearlyPrice.freeMonthDays),
      [savesTheDefaultField]: onSubscription,
      [whenNoCardIsLeftField]: cancelTheSubscription,
      [payerDigestField]: payerDigest,
      [discountCouponField]: theBlackFridayCoupon,
    });
  });

  it('keeps the free month in front of the discounted year', async () => {
    const fields = await theCreateWith(theBlackFridayOffer, aMinuteBeforeTheEnd);

    expect(fields[trialDaysField]).toBe(String(theYearlyPrice.freeMonthDays));
    expect(theYearlyPrice.freeMonthDays).toBe(30);
  });

  it('carries no coupon once the offer has closed, and the full price instead', async () => {
    const fields = await theCreateWith(theBlackFridayOffer, theEndItself);

    expect(Object.keys(fields)).not.toContain(discountCouponField);
    expect(fields[subscriptionPriceField]).toBe(theYearlyPriceRef);
  });

  it('carries no coupon for a press that named no offer', async () => {
    const fields = await theCreateWith(undefined, aMinuteBeforeTheEnd);

    expect(Object.keys(fields)).not.toContain(discountCouponField);
  });

  it('carries no coupon for an offer this account does not sell', async () => {
    const fields = await theCreateWith('two-thirds-off', aMinuteBeforeTheEnd);

    expect(Object.keys(fields)).not.toContain(discountCouponField);
    expect(Object.values(fields)).not.toContain('two-thirds-off');
  });

  it('writes the coupon in the field this api reads one discount of a subscription in', () => {
    expect(discountCouponField).toBe('discounts[0][coupon]');
  });
});
