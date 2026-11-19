import type { AnsweredByStripe, AskedOfStripe, ReachesStripe } from '../../src/payments/stripe';
import {
  cancelAtPeriodEndField,
  customerAddressFor,
  customersAddress,
  invoicesAddress,
  payerDigestKey,
  setupIntentsAddress,
  subscriptionAddressFor,
  stripeApi,
} from '../../src/payments/stripe';

/**
 * Stripe, as far as the money reaches it: a double that answers what Stripe answers, and records
 * every call so a test reads the address, the headers and the form the function actually sent.
 *
 * It answers each object by address rather than in order, so a start that called them the wrong
 * way round fails here rather than passing against a double that shrugged.
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
  /** A status and a body for the customer call, where the test wants a refusal instead. */
  readonly refusesTheCustomer?: AnsweredByStripe;
  /** The same for the setup call. */
  readonly refusesTheSetup?: AnsweredByStripe;
  /** The same for the read of one customer, which is how a delivery names the digest. */
  readonly refusesTheCustomerRead?: AnsweredByStripe;
  /** The invoices the list answers with, in the order Stripe lists them. */
  readonly listsTheseInvoices?: readonly Readonly<Record<string, unknown>>[];
  /** Whether the list says Stripe holds a page after the one it answered. */
  readonly holdsAPageAfterThat?: boolean;
  /** A status and a body for the list call, where the test wants a refusal instead. */
  readonly refusesTheInvoiceList?: AnsweredByStripe;
  /** The same for the update of one subscription, which is how a renewal is stopped. */
  readonly refusesTheSubscription?: AnsweredByStripe;
  /**
   * What the updated subscription answers its renewal as. The double echoes the field it was
   * asked for unless a test names this, which is what Stripe does.
   */
  readonly saysTheRenewalStopped?: boolean;
}

/** The double, and the calls it took. */
export interface FakeStripe {
  readonly reaches: ReachesStripe;
  calls(): OneCall[];
  /** The form one call carried, read as the fields the api reads. */
  fieldsOf(call: OneCall): Record<string, string>;
  /** What one call asked for in its address, which is how a list says whose invoices. */
  askedIn(call: OneCall): Record<string, string>;
}

/** The customer identifier the double answers with unless a test names another. */
export const aCustomerRef = 'cus_000000000001';

/** The setup identifier, and the secret the page mounts both elements on. */
export const aSetupRef = 'seti_000000000001';
export const aClientSecret = `${aSetupRef}_secret_000000000001`;

export function fakeStripe(answers: WhatStripeAnswers = {}): FakeStripe {
  const calls: OneCall[] = [];

  return {
    reaches: async (address: string, asked: AskedOfStripe): Promise<AnsweredByStripe> => {
      calls.push({ address, asked });

      // A read of one customer, which is the address of the customer itself rather than the list.
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
            }),
          }
        );
      }

      // The list, which carries what it asks for in the address rather than in a form body.
      if (address.startsWith(`${invoicesAddress}?`)) {
        return (
          answers.refusesTheInvoiceList ?? {
            status: 200,
            body: JSON.stringify({
              object: 'list',
              data: answers.listsTheseInvoices ?? [],
              has_more: answers.holdsAPageAfterThat === true,
            }),
          }
        );
      }

      // One subscription, which is the address of the subscription itself rather than the list.
      if (address.startsWith(`${stripeApi}/subscriptions/`)) {
        const asItWasAsked = new URLSearchParams(asked.body).get(cancelAtPeriodEndField) === 'true';

        return (
          answers.refusesTheSubscription ?? {
            status: 200,
            body: JSON.stringify({
              id: address.slice(address.lastIndexOf('/') + 1),
              object: 'subscription',
              [cancelAtPeriodEndField]: answers.saysTheRenewalStopped ?? asItWasAsked,
            }),
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
    askedIn: (call: OneCall) => Object.fromEntries(new URL(call.address).searchParams.entries()),
  };
}

/** The address a read of one customer is sent to, so a test does not write it out itself. */
export const readOfTheCustomer = (customerRef: string): string => customerAddressFor(customerRef);

/** The address an update of one subscription is sent to. */
export const updateOfTheSubscription = (subscriptionRef: string): string =>
  subscriptionAddressFor(subscriptionRef);
