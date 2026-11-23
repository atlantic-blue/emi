import type { AnsweredByStripe, AskedOfStripe, ReachesStripe } from '../../src/payments/stripe';
import { nothingHasBeenPaidYet } from '../../src/payments/stripeEvents';
import {
  cancelAtPeriodEndField,
  customerAddressFor,
  customersAddress,
  detachAddressFor,
  expandField,
  idempotencyHeader,
  invoicesAddress,
  payerDigestKey,
  paymentBehaviourField,
  paymentMethodsAddress,
  setupIntentAddressFor,
  setupIntentsAddress,
  setupSucceeded,
  subscriptionAddressFor,
  subscriptionsAddress,
  stripeApi,
  theFirstInvoiceWaits,
  theSecretOfTheFirstInvoice,
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
  /** What every invoice of the customer is charged to today, which a card change replaces. */
  readonly chargesThePaymentMethod?: string;
  /** The customer a read of one setup names, which is how a card change learns whose it is. */
  readonly theSetupWasMadeFor?: string;
  /** The status that read answers with. Anything but `succeeded` collected no card. */
  readonly theSetupReached?: string;
  /** The payment method that read answers with, which is what she gave the browser. */
  readonly theSetupCollected?: string;
  /** A status and a body for the read of one setup, where the test wants a refusal instead. */
  readonly refusesTheSetupRead?: AnsweredByStripe;
  /** A status and a body for the create of one subscription, where a test wants a refusal. */
  readonly refusesTheCreate?: AnsweredByStripe;
  /** The status a created subscription answers with, which is trialing on a free month. */
  readonly theSubscriptionReached?: string;
  /** The invoice of the create carries no secret, which leaves the first charge unconfirmable. */
  readonly theInvoiceCarriesNoSecret?: boolean;
  /** The same for taking the old payment method off the customer. */
  readonly refusesTheDetach?: AnsweredByStripe;
}

/** The double, and the calls it took. */
export interface FakeStripe {
  readonly reaches: ReachesStripe;
  calls(): OneCall[];
  /** The form one call carried, read as the fields the api reads. */
  fieldsOf(call: OneCall): Record<string, string>;
  /** What one call asked for in its address, which is how a list says whose invoices. */
  askedIn(call: OneCall): Record<string, string>;
  /**
   * Every subscription this account holds, in the order it was created. A repeated idempotency key
   * makes no second one, the way Stripe makes none, so a test reads how many exist rather than how
   * many calls were made.
   */
  subscriptionsMade(): string[];
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

/** The status a subscription on its free month carries. */
export const trialing = 'trialing';

/** The subscription identifier the double answers the nth create with. */
export const subscriptionMadeAt = (made: number): string =>
  `sub_${String(made + 1).padStart(12, '0')}`;

/** The invoice a create with no free month leaves to be paid, named after its subscription. */
export const theFirstInvoiceOf = (subscriptionRef: string): string =>
  `in_${subscriptionRef.slice('sub_'.length)}`;

/** The secret her browser confirms that invoice on. It is a value and not the shape of a real one. */
export const theSecretOfTheInvoiceOf = (subscriptionRef: string): string =>
  `${theFirstInvoiceOf(subscriptionRef)}_secret_the-double-wrote-this`;

export function fakeStripe(answers: WhatStripeAnswers = {}): FakeStripe {
  const calls: OneCall[] = [];
  const subscriptions: string[] = [];
  const answeredBefore = new Map<string, AnsweredByStripe>();

  /**
   * One create, answered the way Stripe answers it: a key it has seen before is replayed with the
   * answer it gave then, and every other call makes a subscription of its own.
   */
  const created = (asked: AskedOfStripe): AnsweredByStripe => {
    const key = asked.headers[idempotencyHeader];
    const held = key === undefined ? undefined : answeredBefore.get(key);

    if (held !== undefined) {
      return held;
    }

    const subscriptionRef = subscriptionMadeAt(subscriptions.length);
    const asksFor = new URLSearchParams(asked.body);
    // The invoice is answered only where the create asked for it, the way this api answers any
    // expansion, so a function that forgot to ask reads nothing here rather than reading a secret
    // Stripe would not have sent it.
    const expanded = asksFor.get(expandField) === theSecretOfTheFirstInvoice;
    const waiting = asksFor.get(paymentBehaviourField) === theFirstInvoiceWaits;

    subscriptions.push(subscriptionRef);

    const answer: AnsweredByStripe = {
      status: 200,
      body: JSON.stringify({
        id: subscriptionRef,
        object: 'subscription',
        customer: asksFor.get('customer'),
        status: answers.theSubscriptionReached ?? (waiting ? nothingHasBeenPaidYet : trialing),
        ...(expanded
          ? {
              latest_invoice: {
                id: theFirstInvoiceOf(subscriptionRef),
                confirmation_secret:
                  answers.theInvoiceCarriesNoSecret === true
                    ? {}
                    : { client_secret: theSecretOfTheInvoiceOf(subscriptionRef), type: 'payment' },
              },
            }
          : {}),
      }),
    };

    if (key !== undefined) {
      answeredBefore.set(key, answer);
    }

    return answer;
  };

  return {
    reaches: async (address: string, asked: AskedOfStripe): Promise<AnsweredByStripe> => {
      calls.push({ address, asked });

      // One setup, read back. It is the address of the setup itself rather than the collection.
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

      // Taking one payment method off its customer, which is the one call under this collection.
      if (address.startsWith(`${paymentMethodsAddress}/`)) {
        return (
          answers.refusesTheDetach ?? {
            status: 200,
            body: JSON.stringify({ id: theOldPaymentMethodRef, object: 'payment_method' }),
          }
        );
      }

      // A read of one customer, which is the address of the customer itself rather than the list.
      // The same address takes the write a card change makes, and both answer a customer.
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

      // The create of one subscription, which is the collection itself rather than one of them.
      if (address === subscriptionsAddress) {
        return answers.refusesTheCreate ?? created(asked);
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
    subscriptionsMade: () => [...subscriptions],
    fieldsOf: (call: OneCall) => Object.fromEntries(new URLSearchParams(call.asked.body).entries()),
    askedIn: (call: OneCall) => Object.fromEntries(new URL(call.address).searchParams.entries()),
  };
}

/** The address a read of one customer is sent to, so a test does not write it out itself. */
export const readOfTheCustomer = (customerRef: string): string => customerAddressFor(customerRef);

/** The address an update of one subscription is sent to. */
export const updateOfTheSubscription = (subscriptionRef: string): string =>
  subscriptionAddressFor(subscriptionRef);

/** The address a read of one setup is sent to. */
export const readOfTheSetup = (setupRef: string): string => setupIntentAddressFor(setupRef);

/** The address the old payment method is taken off its customer at. */
export const detachOf = (paymentMethodRef: string): string => detachAddressFor(paymentMethodRef);
