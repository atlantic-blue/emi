import { payerDigestFor } from '@emi/crypto';

import type { HttpRequestEvent } from '../src/api';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import type { EntitlementRoute, EntitlementStore } from '../src/payments/entitlements';
import { issuerOfPool, userNameClaim } from '../src/payments/poolToken';
import {
  mostReceiptsInOnePage,
  nothingWasListed,
  receiptsCursorFor,
  receiptsFor,
  receiptsInOnePage,
  receiptsPath,
  thatCursorIsForAnotherPayment,
  thatCursorIsNotOne,
  thatTokenReadsNoReceipts,
  type WhatTheReceiptsPageReads,
} from '../src/payments/readReceipts';
import { invoicesAddress } from '../src/payments/stripe';
import { subscriptionRoutes } from '../src/payments/subscriptionRoutes';
import { fakeTable, tableName, type FakeTable } from './fixtures/dynamoTable';
import { aCustomerRef, fakeStripe, type FakeStripe, type OneCall } from './fixtures/stripe';

/**
 * The receipts her account page lists, and what they may not carry.
 *
 * The payment they are listed for is written through the store the money writes it with, so it is
 * the item a delivery of Stripe leaves behind rather than a shape made up here.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const userName = 'SignInWithApple_000482910';
const payerDigest = payerDigestFor(userPoolId, userName);
const theKey = 'the-key-the-operator-wrote-by-hand';

const theNewestInvoice = {
  id: 'in_000000000003',
  object: 'invoice',
  created: 1_794_816_000,
  total: 3900,
  currency: 'eur',
  hosted_invoice_url: 'https://invoice.stripe.com/i/three',
};

const theInvoiceBeforeIt = {
  id: 'in_000000000002',
  object: 'invoice',
  created: 1_763_280_000,
  total: 3900,
  currency: 'eur',
  hosted_invoice_url: 'https://invoice.stripe.com/i/two',
};

/** The free month, which is an invoice of nothing at all. */
const theFirstInvoice = {
  id: 'in_000000000001',
  object: 'invoice',
  created: 1_760_601_600,
  total: 0,
  currency: 'eur',
  hosted_invoice_url: 'https://invoice.stripe.com/i/one',
};

/** The three of them, in the order Stripe lists them, which is the newest first. */
const theInvoices = [theNewestInvoice, theInvoiceBeforeIt, theFirstInvoice];

function aRequest(query?: string, claims?: Readonly<Record<string, string>>): HttpRequestEvent {
  return {
    rawPath: receiptsPath,
    ...(query === undefined ? {} : { rawQueryString: query }),
    headers: {},
    requestContext: {
      http: { method: 'GET' },
      ...(claims === undefined ? {} : { authorizer: { jwt: { claims } } }),
    },
  };
}

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

function aStore(): { store: EntitlementStore; table: FakeTable } {
  const table = fakeTable();

  return { store: dynamoEntitlementStore(table, tableName), table };
}

/** A woman who pays, written the way a delivery of Stripe writes her. */
async function sheIsPaying(
  store: EntitlementStore,
  held: { route?: EntitlementRoute; payerRef?: string } = {},
): Promise<void> {
  await store.writeEntitlement({
    payerDigest,
    eventAt: 1_763_280_000,
    writtenAt: '2026-11-16T09:00:00.000Z',
    paidUntil: '2027-12-16T09:00:00.000Z',
    state: 'active',
    route: 'route' in held ? held.route : 'card',
    payerRef: 'payerRef' in held ? held.payerRef : aCustomerRef,
    subscriptionRef: 'sub_000000000001',
  });
}

const pageOf = (answered: { body: string }): WhatTheReceiptsPageReads =>
  JSON.parse(answered.body) as WhatTheReceiptsPageReads;

const listCallsOf = (stripe: FakeStripe): OneCall[] =>
  stripe.calls().filter((call) => call.address.startsWith(invoicesAddress));

/** The list call at that place, raised on where none was made, so a test says which it wanted. */
function listCallOf(stripe: FakeStripe, at = 0): OneCall {
  const call = listCallsOf(stripe)[at];

  if (call === undefined) {
    throw new Error(`the receipts made no list call number ${at + 1}`);
  }

  return call;
}

function theReceipts(stripe: FakeStripe, store: EntitlementStore) {
  return {
    entitlements: store,
    reaches: stripe.reaches,
    secretKey: () => Promise.resolve(theKey),
    poolId: userPoolId,
  };
}

describe('the receipts her account page lists', () => {
  describe('a woman who pays with a card', () => {
    it('answers the invoices of her customer, newest first', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store);

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf()),
        theReceipts(stripe, store),
      );

      expect(answered.statusCode).toBe(200);
      expect(pageOf(answered).receipts).toEqual([
        {
          invoicedAt: '2026-11-16T08:00:00.000Z',
          amount: 3900,
          currency: 'eur',
          invoiceUrl: 'https://invoice.stripe.com/i/three',
        },
        {
          invoicedAt: '2025-11-16T08:00:00.000Z',
          amount: 3900,
          currency: 'eur',
          invoiceUrl: 'https://invoice.stripe.com/i/two',
        },
        {
          invoicedAt: '2025-10-16T08:00:00.000Z',
          amount: 0,
          currency: 'eur',
          invoiceUrl: 'https://invoice.stripe.com/i/one',
        },
      ]);
    });

    it('orders the newest first whatever order the list came back in', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({
        listsTheseInvoices: [theInvoiceBeforeIt, theFirstInvoice, theNewestInvoice],
      });

      await sheIsPaying(store);

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf()),
        theReceipts(stripe, store),
      );

      expect(pageOf(answered).receipts.map((receipt) => receipt.invoicedAt)).toEqual([
        '2026-11-16T08:00:00.000Z',
        '2025-11-16T08:00:00.000Z',
        '2025-10-16T08:00:00.000Z',
      ]);
    });

    it('lists the customer the payment item holds, and names her digest nowhere', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store, { payerRef: 'cus_000000000477' });

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf()),
        theReceipts(stripe, store),
      );
      const listed = listCallOf(stripe);

      expect(listed.asked.method).toBe('GET');
      expect(stripe.askedIn(listed).customer).toBe('cus_000000000477');
      expect(listed.asked.headers.authorization).toBe(`Bearer ${theKey}`);
      expect(listed.address).not.toContain(payerDigest);
      expect(answered.body).not.toContain(payerDigest);
      expect(answered.body).not.toContain('cus_');
    });

    it('carries no field of an invoice but the date, the amount, the currency and the link', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({
        listsTheseInvoices: [
          {
            ...theNewestInvoice,
            customer: aCustomerRef,
            customer_email: 'she@example.com',
            customer_name: 'A Name',
            subscription: 'sub_000000000001',
            number: 'EMI-0003',
            status: 'paid',
            invoice_pdf: 'https://invoice.stripe.com/i/three/pdf',
          },
        ],
      });

      await sheIsPaying(store);

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf()),
        theReceipts(stripe, store),
      );
      const [receipt] = pageOf(answered).receipts;

      expect(Object.keys(receipt ?? {}).sort()).toEqual([
        'amount',
        'currency',
        'invoiceUrl',
        'invoicedAt',
      ]);
      expect(answered.body).not.toContain('she@example.com');
      expect(answered.body).not.toContain('EMI-0003');
      expect(answered.body).not.toContain('invoice_pdf');
    });

    it('leaves out an invoice Stripe serves no page for, which she could not open', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({
        listsTheseInvoices: [theNewestInvoice, { ...theInvoiceBeforeIt, hosted_invoice_url: null }],
      });

      await sheIsPaying(store);

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf()),
        theReceipts(stripe, store),
      );

      expect(pageOf(answered).receipts.map((receipt) => receipt.invoiceUrl)).toEqual([
        'https://invoice.stripe.com/i/three',
      ]);
    });
  });

  describe('a page of them', () => {
    it('asks Stripe for the page this api answers when she asks for no number', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store);
      await receiptsFor(aRequest(undefined, tokenOf()), theReceipts(stripe, store));

      expect(stripe.askedIn(listCallOf(stripe)).limit).toBe(String(receiptsInOnePage));
    });

    it('holds a page larger than the most to the most, rather than asking for all of them', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store);
      await receiptsFor(aRequest('limit=5000', tokenOf()), theReceipts(stripe, store));

      expect(stripe.askedIn(listCallOf(stripe)).limit).toBe(String(mostReceiptsInOnePage));
    });

    it('takes a page size she asks for when it is one this api lists', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store);
      await receiptsFor(aRequest('limit=3', tokenOf()), theReceipts(stripe, store));

      expect(stripe.askedIn(listCallOf(stripe)).limit).toBe('3');
    });

    it('reads a page size that is not a whole number of receipts as the one it answers', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store);
      await receiptsFor(aRequest('limit=all-of-them', tokenOf()), theReceipts(stripe, store));

      expect(stripe.askedIn(listCallOf(stripe)).limit).toBe(String(receiptsInOnePage));
    });

    it('answers a cursor while Stripe holds a page after this one, and starts the next there', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices, holdsAPageAfterThat: true });

      await sheIsPaying(store);

      const first = await receiptsFor(aRequest(undefined, tokenOf()), theReceipts(stripe, store));
      const cursor = pageOf(first).cursor;

      expect(cursor).toBe(receiptsCursorFor(payerDigest, 'in_000000000001'));

      await receiptsFor(
        aRequest(`cursor=${encodeURIComponent(cursor ?? '')}`, tokenOf()),
        theReceipts(stripe, store),
      );

      expect(stripe.askedIn(listCallOf(stripe, 1)).starting_after).toBe('in_000000000001');
    });

    it('answers no cursor once Stripe holds nothing after the page', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store);

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf()),
        theReceipts(stripe, store),
      );

      expect(pageOf(answered).cursor).toBeNull();
      expect(stripe.askedIn(listCallOf(stripe)).starting_after).toBeUndefined();
    });

    it('refuses a cursor written for another payment, rather than listing against it', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });
      const ofSomebodyElse = receiptsCursorFor(
        payerDigestFor(userPoolId, 'SomebodyElse'),
        'in_000000000001',
      );

      await sheIsPaying(store);

      const answered = await receiptsFor(
        aRequest(`cursor=${ofSomebodyElse}`, tokenOf()),
        theReceipts(stripe, store),
      );

      expect(answered.statusCode).toBe(403);
      expect(JSON.parse(answered.body)).toEqual({ error: thatCursorIsForAnotherPayment });
      expect(listCallsOf(stripe)).toHaveLength(0);
    });

    it('refuses a cursor this api never wrote', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store);

      const answered = await receiptsFor(
        aRequest('cursor=bm90LWEtY3Vyc29y', tokenOf()),
        theReceipts(stripe, store),
      );

      expect(answered.statusCode).toBe(400);
      expect(JSON.parse(answered.body)).toEqual({ error: thatCursorIsNotOne });
      expect(listCallsOf(stripe)).toHaveLength(0);
    });
  });

  describe('a woman with nothing to list', () => {
    it('answers an empty list for a woman who has never paid, and asks Stripe nothing', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf()),
        theReceipts(stripe, store),
      );

      expect(answered.statusCode).toBe(200);
      expect(pageOf(answered)).toEqual({ receipts: [], cursor: null });
      expect(stripe.calls()).toHaveLength(0);
    });

    it('answers an empty list for a woman who paid another way, and asks Stripe nothing', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store, { route: 'stars', payerRef: undefined });

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf()),
        theReceipts(stripe, store),
      );

      expect(answered.statusCode).toBe(200);
      expect(pageOf(answered)).toEqual({ receipts: [], cursor: null });
      expect(stripe.calls()).toHaveLength(0);
    });

    it('answers an empty list for a press that was never finished, and asks Stripe nothing', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store, { route: undefined });

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf()),
        theReceipts(stripe, store),
      );

      expect(pageOf(answered)).toEqual({ receipts: [], cursor: null });
      expect(stripe.calls()).toHaveLength(0);
    });
  });

  describe('a token that lists for nobody', () => {
    it('refuses a token of another pool, because a digest is cut under one pool', async () => {
      const { store, table } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf({ iss: issuerOfPool('us-east-1_SOMEONEELSE') })),
        theReceipts(stripe, store),
      );

      expect(answered.statusCode).toBe(401);
      expect(JSON.parse(answered.body)).toEqual({ error: thatTokenReadsNoReceipts });
      expect(table.calls().getItem).toBe(0);
      expect(stripe.calls()).toHaveLength(0);
    });

    it('refuses a request the token authorizer handed nothing on from', async () => {
      const { store, table } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      const answered = await receiptsFor(aRequest(), theReceipts(stripe, store));

      expect(answered.statusCode).toBe(401);
      expect(table.calls().getItem).toBe(0);
      expect(stripe.calls()).toHaveLength(0);
    });

    it('refuses a token carrying no user name, rather than listing under a digest of nothing', async () => {
      const { store, table } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf({ [userNameClaim]: '' })),
        theReceipts(stripe, store),
      );

      expect(answered.statusCode).toBe(401);
      expect(table.calls().getItem).toBe(0);
      expect(stripe.calls()).toHaveLength(0);
    });
  });

  describe('a Stripe that will not answer', () => {
    it('says nothing was listed, and names neither the status nor the customer', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({
        refusesTheInvoiceList: {
          status: 401,
          body: JSON.stringify({
            error: { type: 'invalid_request_error', code: 'api_key_expired' },
          }),
        },
      });

      await sheIsPaying(store);

      const answered = await receiptsFor(
        aRequest(undefined, tokenOf()),
        theReceipts(stripe, store),
      );

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: nothingWasListed });
      expect(answered.body).not.toContain('api_key_expired');
    });

    it('says the same when the parameter store holds no key yet', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store);

      const answered = await receiptsFor(aRequest(undefined, tokenOf()), {
        ...theReceipts(stripe, store),
        secretKey: () => Promise.reject(new Error('the parameter is not written yet')),
      });

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: nothingWasListed });
      expect(listCallsOf(stripe)).toHaveLength(0);
    });
  });

  describe('the path the receipts are listed on', () => {
    function theRoutes(store: EntitlementStore, stripe: FakeStripe) {
      return subscriptionRoutes({
        entitlements: store,
        reaches: stripe.reaches,
        secretKey: () => Promise.resolve(theKey),
        poolId: userPoolId,
        clock: () => new Date('2026-11-16T09:00:00.000Z'),
      });
    }

    it('sends a read of this path to the receipts, and not to the subscription', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store);

      const answered = await theRoutes(store, stripe)(aRequest(undefined, tokenOf()));

      expect(answered.statusCode).toBe(200);
      expect(pageOf(answered).receipts).toHaveLength(3);
    });

    it('refuses a token this path reads nothing for, in the words the receipts refuse with', async () => {
      const { store } = aStore();
      const stripe = fakeStripe();

      const answered = await theRoutes(store, stripe)(aRequest());

      expect(answered.statusCode).toBe(401);
      expect(JSON.parse(answered.body)).toEqual({ error: thatTokenReadsNoReceipts });
    });

    it('answers a method this path does not take, rather than listing anything', async () => {
      const { store } = aStore();
      const stripe = fakeStripe({ listsTheseInvoices: theInvoices });

      await sheIsPaying(store);

      const answered = await theRoutes(
        store,
        stripe,
      )({
        ...aRequest(undefined, tokenOf()),
        requestContext: {
          http: { method: 'DELETE' },
          authorizer: { jwt: { claims: tokenOf() } },
        },
      });

      expect(answered.statusCode).toBe(405);
      expect(stripe.calls()).toHaveLength(0);
    });
  });
});
