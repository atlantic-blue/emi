import type { AnsweredByStripe, AskedOfStripe, ReachesStripe } from '../../src/payments/stripe';
import { customersAddress, setupIntentsAddress } from '../../src/payments/stripe';

/**
 * Stripe, as far as the money reaches it: a double that answers what Stripe answers, and records
 * every call so a test reads the address, the headers and the form the function actually sent.
 *
 * It answers the two objects by address rather than in order, so a start that called them the
 * wrong way round fails here rather than passing against a double that shrugged.
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
  /** A status and a body for the customer call, where the test wants a refusal instead. */
  readonly refusesTheCustomer?: AnsweredByStripe;
  /** The same for the setup call. */
  readonly refusesTheSetup?: AnsweredByStripe;
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

export function fakeStripe(answers: WhatStripeAnswers = {}): FakeStripe {
  const calls: OneCall[] = [];

  return {
    reaches: async (address: string, asked: AskedOfStripe): Promise<AnsweredByStripe> => {
      calls.push({ address, asked });

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
