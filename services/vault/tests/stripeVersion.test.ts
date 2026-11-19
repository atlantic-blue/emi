import {
  customerFor,
  payerDigestOfCustomer,
  setupIntentFor,
  stripeApiVersion,
  type WhatACallHolds,
} from '../src/payments/stripe';
import { aCustomerRef, fakeStripe, type FakeStripe } from './fixtures/stripe';
import { anEvent, theVersionTheEventsCarry } from './fixtures/stripeDeliveries';

/**
 * The version of the api the calls are made in, and the version the deliveries arrive in.
 *
 * A call that names no version is answered in the default version of the account. The period of
 * a subscription moved onto the subscription item in a later version. So an answer in an older
 * version carries no period, and the webhook writes nothing. Her account page then says she
 * never paid. These cases read the header off each call the port makes. They also compare the
 * version of the calls with the version the events name.
 */

const payerDigest = 'a7f3c1d9e2b40586';
/** Not the shape of a real key. A value that looked like one would be read as a leak. */
const theKey = 'the-key-the-operator-wrote-by-hand';

function aPayer(stripe: FakeStripe): WhatACallHolds {
  return { reaches: stripe.reaches, secretKey: theKey };
}

describe('every call of Stripe names the version it is made in', () => {
  describe('the header of each call', () => {
    it('names the version on the customer, the setup and the read of one customer', async () => {
      const stripe = fakeStripe({ holdsThePayerDigest: payerDigest });
      const held = aPayer(stripe);

      await customerFor(held, payerDigest);
      await setupIntentFor(held, aCustomerRef);
      await payerDigestOfCustomer(held, aCustomerRef);

      expect(stripe.calls()).toHaveLength(3);

      for (const call of stripe.calls()) {
        expect(call.asked.headers['stripe-version']).toBe(stripeApiVersion);
      }
    });

    it('keeps the key and the form beside it, so nothing is traded for the version', async () => {
      const stripe = fakeStripe();

      await customerFor(aPayer(stripe), payerDigest);

      const call = stripe.calls()[0];

      expect(call?.asked.headers).toEqual({
        authorization: `Bearer ${theKey}`,
        'content-type': 'application/x-www-form-urlencoded',
        'stripe-version': stripeApiVersion,
      });
    });

    it('carries the version in the header alone, and never in the form', async () => {
      const stripe = fakeStripe();

      await customerFor(aPayer(stripe), payerDigest);

      expect(stripe.calls()[0]?.asked.body).not.toContain(stripeApiVersion);
    });
  });

  describe('the version the deliveries arrive in', () => {
    it('is the version the calls are made in', () => {
      expect(stripeApiVersion).toBe(theVersionTheEventsCarry);
    });

    it('is named on each event the webhook is handed', () => {
      const event = anEvent('invoice.paid', { customer: aCustomerRef }, 1_763_280_000);

      expect(event.api_version).toBe(stripeApiVersion);
    });
  });
});
