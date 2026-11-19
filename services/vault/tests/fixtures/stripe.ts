import type { AnsweredByStripe, AskedOfStripe, ReachesStripe } from '../../src/payments/stripe';
import {
  customerAddressFor,
  customersAddress,
  detachAddressFor,
  payerDigestKey,
  paymentMethodsAddress,
  setupIntentAddressFor,
  setupIntentsAddress,
  setupSucceeded,
  subscriptionsAddress,
} from '../../src/payments/stripe';

/**
 * Stripe, as far as the money reaches it: a double that answers what Stripe answers, and records
 * every call so a test reads the address, the headers and the form the function actually sent.
 *
 * It answers the objects by address rather than in order, so a route that called them the wrong
 * way round fails here rather than passing against a double that shrugged. The address of one
 * object is matched before the address of its collection, because the first is a prefix of nothing
 * and the second is a prefix of the first.
 */

/** One call, as it left the function. */
export interface OneCall {
  readonly address: string;
  readonly asked: AskedOfStripe;
}

/** What a test drives the double with. Each answer stands for one address. */
export interface WhatStripeAnswers {
  readonly customerRef?: string;
  readonly setupRef?: string;
  readonly clientSecret?: string;
  /** The digest the metadata of the customer carries, which is what a read of it answers. */
  readonly holdsThePayerDigest?: string;
  /** What every invoice of the customer is charged to today, which a card change replaces. */
  readonly chargesThePaymentMethod?: string;
  /** The customer a read of one setup names, which is how a card change learns whose it is. */
  readonly theSetupWasMadeFor?: string;
  /** The status that read answers with. Anything but `succeeded` collected no card. */
  readonly theSetupReached?: string;
  /** The payment method that read answers with, which is what she gave the browser. */
  readonly theSetupCollected?: string;
  /** A status and a body for the customer call, where the test wants a refusal instead. */
  readonly refusesTheCustomer?: AnsweredByStripe;
  /** The same for the setup call. */
  readonly refusesTheSetup?: AnsweredByStripe;
  /** The same for the read of one customer, which is how a delivery names the digest. */
  readonly refusesTheCustomerRead?: AnsweredByStripe;
  /** The same for the read of one setup. */
  readonly refusesTheSetupRead?: AnsweredByStripe;
  /** The same for the write of the subscription a card change moves. */
  readonly refusesTheSubscription?: AnsweredByStripe;
  /** The same for taking the old payment method off the customer. */
  readonly refusesTheDetach?: AnsweredByStripe;
}

/** The double, and the calls it took. */
export interface FakeStripe {
  readonly reaches: ReachesStripe;
  calls(): OneCall[];
  /** The form one call carried, read as the fields the api reads. */
  fieldsOf(call: OneCall): Record<string, string>;
}

/** The customer identifier the double answers with unless a test names another. */
export const aCustomerRef = 'cus_000000000001';

/** The setup identifier, and the secret the page mounts both elements on. */
export const aSetupRef = 'seti_000000000001';
export const aClientSecret = `${aSetupRef}_secret_000000000001`;

/** The payment method a read of one setup names, which is the card she has just given. */
export const aPaymentMethodRef = 'pm_000000000002';

/** The payment method the customer is charged to before a card change, which is the old card. */
export const theOldPaymentMethodRef = 'pm_000000000001';

/** The subscription the item of a woman paying by card names. */
export const aSubscriptionRef = 'sub_000000000001';

export function fakeStripe(answers: WhatStripeAnswers = {}): FakeStripe {
  const calls: OneCall[] = [];

  return {
    reaches: async (address: string, asked: AskedOfStripe): Promise<AnsweredByStripe> => {
      calls.push({ address, asked });

      // One setup, read back. It is the address of the setup itself rather than the list.
      if (address.startsWith(`${setupIntentsAddress}/`)) {
        return (
          answers.refusesTheSetupRead ?? {
            status: 200,
            body: JSON.stringify({
              id: address.slice(setupIntentsAddress.length + 1),
              object: 'setup_intent',
              customer: answers.theSetupWasMadeFor ?? aCustomerRef,
              status: answers.theSetupReached ?? setupSucceeded,
              payment_method: answers.theSetupCollected ?? aPaymentMethodRef,
            }),
          }
        );
      }

      // A read of one customer, which is the address of the customer itself rather than the list.
      // The same address takes the write that moves its default, and both answer a customer.
      if (address.startsWith(`${customersAddress}/`)) {
        return (
          answers.refusesTheCustomerRead ?? {
            status: 200,
            body: JSON.stringify({
              id: address.slice(customersAddress.length + 1),
              object: 'customer',
              metadata:
                answers.holdsThePayerDigest === undefined
                  ? {}
                  : { [payerDigestKey]: answers.holdsThePayerDigest },
              invoice_settings: {
                default_payment_method: answers.chargesThePaymentMethod ?? null,
              },
            }),
          }
        );
      }

      if (address.startsWith(`${paymentMethodsAddress}/`)) {
        return (
          answers.refusesTheDetach ?? {
            status: 200,
            body: JSON.stringify({ id: theOldPaymentMethodRef, object: 'payment_method' }),
          }
        );
      }

      if (address.startsWith(`${subscriptionsAddress}/`)) {
        return (
          answers.refusesTheSubscription ?? {
            status: 200,
            body: JSON.stringify({ id: aSubscriptionRef, object: 'subscription' }),
          }
        );
      }

      if (address === customersAddress) {
        return (
          answers.refusesTheCustomer ?? {
            status: 200,
            body: JSON.stringify({ id: answers.customerRef ?? aCustomerRef, object: 'customer' }),
          }
        );
      }

      if (address === setupIntentsAddress) {
        return (
          answers.refusesTheSetup ?? {
            status: 200,
            body: JSON.stringify({
              id: answers.setupRef ?? aSetupRef,
              object: 'setup_intent',
              client_secret: answers.clientSecret ?? aClientSecret,
            }),
          }
        );
      }

      return {
        status: 404,
        body: JSON.stringify({
          error: { type: 'invalid_request_error', code: 'resource_missing' },
        }),
      };
    },
    calls: () => [...calls],
    fieldsOf: (call: OneCall) => Object.fromEntries(new URLSearchParams(call.asked.body).entries()),
  };
}

/** The address a read of one customer is sent to, so a test does not write it out itself. */
export const readOfTheCustomer = (customerRef: string): string => customerAddressFor(customerRef);

/** The address a read of one setup is sent to. */
export const readOfTheSetup = (setupRef: string): string => setupIntentAddressFor(setupRef);

/** The address the old payment method is taken off its customer at. */
export const detachOf = (paymentMethodRef: string): string => detachAddressFor(paymentMethodRef);
