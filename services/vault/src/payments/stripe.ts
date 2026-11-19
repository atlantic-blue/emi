/**
 * The objects Emi keeps in Stripe, and the two calls that make them.
 *
 * Both calls travel through one port, so a test reads the address, the headers and the body the
 * function actually sent. The secret key is an argument rather than a value this module holds,
 * because it is read from the parameter store when a container starts and never from the
 * environment of a function.
 *
 * The payer digest is the only thing of ours that reaches Stripe. No address, no name, no account
 * identifier and no record identifier is sent, and no card number is ever read back.
 */

/** What one call carries. A read carries no body, and a write carries a form. */
export interface AskedOfStripe {
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
}

/** What one call comes back with, as the status and the text. */
export interface AnsweredByStripe {
  readonly status: number;
  readonly body: string;
}

/** How this module reaches Stripe. A test hands it one that answers without a network. */
export type ReachesStripe = (address: string, asked: AskedOfStripe) => Promise<AnsweredByStripe>;

/**
 * The version of the api every call is made in.
 *
 * A call that names no version is answered in the default version of the account. That is the
 * version the account was opened on. The webhook endpoint in Stripe is set to the version here,
 * so a delivery carries fields an older answer does not. The period of a subscription is one of
 * them. The calls and the events must name one version.
 */
export const stripeApiVersion = '2026-10-28.endive';

/** Where the objects are made. Every address below hangs under this one. */
export const stripeApi = 'https://api.stripe.com/v1';

/** Where a customer is made, one for each payer digest. */
export const customersAddress = `${stripeApi}/customers`;

/** Where the setup that collects her payment method is made. */
export const setupIntentsAddress = `${stripeApi}/setup_intents`;

/** Where the subscriptions are. Nothing in this file creates one. */
export const subscriptionsAddress = `${stripeApi}/subscriptions`;

/** Where the payment methods are. Only the detach below reaches this one. */
export const paymentMethodsAddress = `${stripeApi}/payment_methods`;

/**
 * The key the payer digest travels under, in the metadata of the customer and later of the
 * subscription. It is the reverse index: a webhook carries a customer and the metadata on it names
 * the digest, so the event is written down without a second item and without a query.
 */
export const payerDigestKey = 'payerDigest';

/** The field that key is written as, which is how this api takes one key of a metadata map. */
export const payerDigestField = `metadata[${payerDigestKey}]`;

/**
 * The setup is made for a payment Emi starts later, which is what a yearly renewal is. A setup
 * without this is refused by the bank at the renewal rather than at the press, so the woman who
 * paid reads nothing and the charge never lands.
 */
export const offSession = 'off_session';

/** What the price object of the live account carries. Nothing here creates it. */
export interface YearlyPrice {
  /** The amount, in the smallest unit of the currency. */
  readonly amount: number;
  readonly currency: string;
  /** How often Stripe charges it. */
  readonly interval: string;
  /**
   * The tax sits inside the amount, so the figure she reads is the figure she pays in every
   * country. Stripe refuses to change this once the price exists, so a price created without it
   * has to be replaced and every subscription on it moved.
   */
  readonly taxBehaviour: string;
  /** Days of the free month, which Stripe takes as `trial_period_days`. */
  readonly freeMonthDays: number;
}

/** The one price Emi sells: 39 euros a year, the tax inside it, after one free month. */
export const theYearlyPrice: YearlyPrice = {
  amount: 3900,
  currency: 'eur',
  interval: 'year',
  taxBehaviour: 'inclusive',
  freeMonthDays: 30,
};

/** Every way a call of Stripe fails, as a value, so a caller matches a reason and not words. */
export type StripeRefusal = 'the-call-was-refused' | 'the-answer-names-no-object';

/**
 * Raised when a call does not come back with the object it asked for. The message carries the
 * status and the code Stripe named, and never the body: a body reaches a log line, and the answer
 * to a customer call carries whatever the customer already holds.
 */
export class StripeError extends Error {
  readonly refusal: StripeRefusal;

  constructor(refusal: StripeRefusal, message: string) {
    super(message);
    this.name = 'StripeError';
    this.refusal = refusal;
  }
}

/** A form body, written the way this api reads every request. */
export function formBodyOf(fields: readonly (readonly [string, string])[]): string {
  return fields
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&');
}

/** The headers every call carries. The key is here and in no other line of this service. */
export function headersFor(secretKey: string): Record<string, string> {
  return {
    authorization: `Bearer ${secretKey}`,
    'content-type': 'application/x-www-form-urlencoded',
    'stripe-version': stripeApiVersion,
  };
}

/** What a call is bound to: one way of reaching Stripe, and the key it is made with. */
export interface WhatACallHolds {
  readonly reaches: ReachesStripe;
  readonly secretKey: string;
}

interface AnObjectStripeMade {
  readonly id?: unknown;
  readonly client_secret?: unknown;
  readonly customer?: unknown;
  readonly status?: unknown;
  readonly payment_method?: unknown;
  readonly invoice_settings?: { readonly default_payment_method?: unknown };
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly data?: unknown;
  readonly has_more?: unknown;
  readonly cancel_at_period_end?: unknown;
  readonly error?: { readonly code?: unknown; readonly type?: unknown };
}

function objectIn(answered: AnsweredByStripe, what: string): AnObjectStripeMade {
  let read: AnObjectStripeMade | null = null;

  try {
    read = JSON.parse(answered.body) as AnObjectStripeMade;
  } catch {
    read = null;
  }

  if (answered.status < 200 || answered.status >= 300) {
    const named = read?.error?.code ?? read?.error?.type ?? 'nothing';
    throw new StripeError(
      'the-call-was-refused',
      `Stripe answered ${answered.status} to the ${what} and named ${String(named)}`,
    );
  }

  if (read === null) {
    throw new StripeError('the-answer-names-no-object', `the ${what} answered no readable object`);
  }

  return read;
}

function textIn(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * The customer one digest pays under. Emi sends the digest and nothing else, so Stripe holds her
 * card and the address her bank needs, and the record of who that is stays with Stripe.
 */
export async function customerFor(held: WhatACallHolds, payerDigest: string): Promise<string> {
  const answered = await held.reaches(customersAddress, {
    method: 'POST',
    headers: headersFor(held.secretKey),
    body: formBodyOf([[payerDigestField, payerDigest]]),
  });

  const id = textIn(objectIn(answered, 'customer').id);

  if (id === null) {
    throw new StripeError('the-answer-names-no-object', 'the customer call named no customer');
  }

  return id;
}

/** The setup, and the secret the page mounts both elements on. */
export interface SetupToCollectACard {
  readonly setupRef: string;
  readonly clientSecret: string;
}

/**
 * The setup that collects her payment method. The payment method is collected before any
 * subscription exists, because the first invoice of a free month is zero and there is then
 * nothing to confirm: a page waiting for a payment to confirm would work on some cards and not on
 * others.
 */
export async function setupIntentFor(
  held: WhatACallHolds,
  customerRef: string,
): Promise<SetupToCollectACard> {
  const answered = await held.reaches(setupIntentsAddress, {
    method: 'POST',
    headers: headersFor(held.secretKey),
    body: formBodyOf([
      ['customer', customerRef],
      ['usage', offSession],
      // The two elements of the page draw the methods the device has, and both read that list off
      // this setup. A setup that names its methods one by one draws no wallet the account adds later.
      ['automatic_payment_methods[enabled]', 'true'],
    ]),
  });

  const made = objectIn(answered, 'setup');
  const setupRef = textIn(made.id);
  const clientSecret = textIn(made.client_secret);

  if (setupRef === null || clientSecret === null) {
    throw new StripeError('the-answer-names-no-object', 'the setup call named no setup to confirm');
  }

  return { setupRef, clientSecret };
}

/** Where one customer is read, which is how a webhook learns which digest an event is about. */
export function customerAddressFor(customerRef: string): string {
  return `${customersAddress}/${encodeURIComponent(customerRef)}`;
}

/**
 * The digest the customer of an event was made under, or nothing at all where the customer carries
 * none. A customer somebody made by hand in the dashboard is the second case, and it is not a
 * failure: no payment of Emi was ever written under it.
 */
export async function payerDigestOfCustomer(
  held: WhatACallHolds,
  customerRef: string,
): Promise<string | null> {
  const answered = await held.reaches(customerAddressFor(customerRef), {
    method: 'GET',
    headers: headersFor(held.secretKey),
  });

  return textIn(objectIn(answered, 'customer').metadata?.[payerDigestKey]);
}

/** Where the invoices of one customer are listed. Emi keeps no copy of any of them. */
export const invoicesAddress = `${stripeApi}/invoices`;

/** What one listed invoice carries, as far as a receipt of hers is concerned. */
export interface ListedInvoice {
  readonly invoiceRef: string;
  /** The seconds the invoice was made at. */
  readonly created: number;
  /** The amount of the invoice, the tax inside it, in the smallest unit of the currency. */
  readonly total: number;
  readonly currency: string;
  /** The page Stripe serves for it, or nothing at all where Stripe serves none. */
  readonly invoiceUrl: string | null;
}

/** One page of invoices, in the order Stripe listed them, and whether a page follows it. */
export interface ListedInvoices {
  readonly invoices: readonly ListedInvoice[];
  readonly moreToCome: boolean;
}

/** Which invoices are asked for: whose, how many, and where the page starts. */
export interface WhichInvoices {
  readonly customerRef: string;
  readonly limit: number;
  /** The invoice the page starts after, which is the last one of the page before it. */
  readonly after?: string;
}

/** The address one page of invoices is read from, with the three things this api takes. */
export function invoicesAddressFor(which: WhichInvoices): string {
  const asked = new URLSearchParams([
    ['customer', which.customerRef],
    ['limit', String(which.limit)],
  ]);

  if (which.after !== undefined) {
    asked.set('starting_after', which.after);
  }

  return `${invoicesAddress}?${asked.toString()}`;
}

function invoiceIn(listed: unknown): ListedInvoice | null {
  const held = (listed ?? {}) as Readonly<Record<string, unknown>>;
  const invoiceRef = textIn(held.id);
  const currency = textIn(held.currency);

  return invoiceRef === null ||
    currency === null ||
    typeof held.created !== 'number' ||
    typeof held.total !== 'number'
    ? null
    : {
        invoiceRef,
        created: held.created,
        total: held.total,
        currency,
        invoiceUrl: textIn(held.hosted_invoice_url),
      };
}

/**
 * One page of the invoices of one customer. Nothing of the answer is written down anywhere: the
 * page is read, mapped to the four fields a receipt carries, and let go of.
 */
export async function invoicesOf(
  held: WhatACallHolds,
  which: WhichInvoices,
): Promise<ListedInvoices> {
  const answered = await held.reaches(invoicesAddressFor(which), {
    method: 'GET',
    headers: headersFor(held.secretKey),
  });

  const listed = objectIn(answered, 'invoice list');

  if (!Array.isArray(listed.data)) {
    throw new StripeError('the-answer-names-no-object', 'the invoice list named no invoices');
  }

  return {
    invoices: listed.data
      .map((one) => invoiceIn(one))
      .filter((one): one is ListedInvoice => one !== null),
    moreToCome: listed.has_more === true,
  };
}

/** Where one subscription is read and updated. The update of this api is a post, not a patch. */
export function subscriptionAddressFor(subscriptionRef: string): string {
  return `${subscriptionsAddress}/${encodeURIComponent(subscriptionRef)}`;
}

/** The field that stops a renewal at the end of the period she paid for, and starts it again. */
export const cancelAtPeriodEndField = 'cancel_at_period_end';

/**
 * Stops the renewal, or starts it again, and answers whether the subscription renews afterwards.
 *
 * The answer is read rather than assumed. The field Stripe sends back is what the renewal now is,
 * so a call that was taken and did something else writes the something else onto the item.
 */
export async function renewalOfSubscription(
  held: WhatACallHolds,
  subscriptionRef: string,
  renewing: boolean,
): Promise<boolean> {
  const answered = await held.reaches(subscriptionAddressFor(subscriptionRef), {
    method: 'POST',
    headers: headersFor(held.secretKey),
    body: formBodyOf([[cancelAtPeriodEndField, renewing ? 'false' : 'true']]),
  });

  const said = objectIn(answered, 'subscription')[cancelAtPeriodEndField];

  if (typeof said !== 'boolean') {
    throw new StripeError(
      'the-answer-names-no-object',
      'the subscription call named no renewal to read',
    );
  }

  return !said;
}

/** Where one setup is read back, which is how a card change learns whose it is. */
export function setupIntentAddressFor(setupRef: string): string {
  return `${setupIntentsAddress}/${encodeURIComponent(setupRef)}`;
}

/** Where one payment method is taken off the customer it is attached to. */
export function detachAddressFor(paymentMethodRef: string): string {
  return `${paymentMethodsAddress}/${encodeURIComponent(paymentMethodRef)}/detach`;
}

/** The field the default of a customer is written as, which is what every invoice is charged to. */
export const customerDefaultField = 'invoice_settings[default_payment_method]';

/** The field the default of a subscription is written as. */
export const subscriptionDefaultField = 'default_payment_method';

/** The one status a setup she finished carries. Every other status collected no card. */
export const setupSucceeded = 'succeeded';

/** One setup, read back: who it was made for, whether she finished it, and what it collected. */
export interface SetupAsItStands {
  readonly customerRef: string | null;
  readonly status: string | null;
  readonly paymentMethodRef: string | null;
}

/**
 * The setup as Stripe holds it, read rather than taken from the caller. The site sends an
 * identifier and nothing more, so the customer it names and the status it reached are read here:
 * a caller that sent somebody else's identifier would otherwise move somebody else's card.
 */
export async function setupAsItStands(
  held: WhatACallHolds,
  setupRef: string,
): Promise<SetupAsItStands> {
  const answered = await held.reaches(setupIntentAddressFor(setupRef), {
    method: 'GET',
    headers: headersFor(held.secretKey),
  });
  const read = objectIn(answered, 'setup');

  return {
    customerRef: textIn(read.customer),
    status: textIn(read.status),
    paymentMethodRef: textIn(read.payment_method),
  };
}

/** What every invoice of a customer is charged to today, or nothing where it carries none. */
export async function defaultPaymentMethodOf(
  held: WhatACallHolds,
  customerRef: string,
): Promise<string | null> {
  const answered = await held.reaches(customerAddressFor(customerRef), {
    method: 'GET',
    headers: headersFor(held.secretKey),
  });

  return textIn(objectIn(answered, 'customer').invoice_settings?.default_payment_method);
}

/** Makes one payment method what every invoice of the customer is charged to. */
export async function chargeTheCustomerTo(
  held: WhatACallHolds,
  customerRef: string,
  paymentMethodRef: string,
): Promise<void> {
  const answered = await held.reaches(customerAddressFor(customerRef), {
    method: 'POST',
    headers: headersFor(held.secretKey),
    body: formBodyOf([[customerDefaultField, paymentMethodRef]]),
  });

  objectIn(answered, 'customer');
}

/**
 * Makes one payment method what the renewal is charged to. The subscription carries a default of
 * its own, and it wins over the one on the customer, so a change that moved only the customer
 * would leave the yearly charge on the card she replaced.
 */
export async function chargeTheSubscriptionTo(
  held: WhatACallHolds,
  subscriptionRef: string,
  paymentMethodRef: string,
): Promise<void> {
  const answered = await held.reaches(subscriptionAddressFor(subscriptionRef), {
    method: 'POST',
    headers: headersFor(held.secretKey),
    body: formBodyOf([[subscriptionDefaultField, paymentMethodRef]]),
  });

  objectIn(answered, 'subscription');
}

/** Takes one payment method off its customer, so a card she replaced is not left on file. */
export async function detachPaymentMethod(
  held: WhatACallHolds,
  paymentMethodRef: string,
): Promise<void> {
  const answered = await held.reaches(detachAddressFor(paymentMethodRef), {
    method: 'POST',
    headers: headersFor(held.secretKey),
  });

  objectIn(answered, 'payment method');
}
