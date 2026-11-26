import { payerDigestFor } from '@emi/crypto';

import type { HttpRequestEvent } from '../src/api';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import { issuerOfPool, userNameClaim } from '../src/payments/poolToken';
import {
  createInvoiceLinkMethod,
  starsCurrency,
  starsPayloadFor,
  theDaysOneStarsPaymentBuys,
  theLongestPayloadTelegramTakes,
  theStarsPriceOnTheOffer,
  theYearlyStarsPrice,
  whatThePayloadNames,
} from '../src/payments/stars';
import {
  aYearIsAlreadyRunning,
  noInvoiceWasMade,
  starsInvoiceFor,
  starsInvoicePath,
  thatTokenBuysNothing,
  theBodyAnInvoiceTakes,
  type WhatTheInvoiceNeeds,
} from '../src/payments/starsInvoice';
import { theBlackFridayOffer, theBlackFridayOfferEnds } from '../src/payments/stripe';
import { fakeTable, tableName, type FakeTable } from './fixtures/dynamoTable';
import { fakeBot, theBotToken, theInvoiceLink, type FakeBot } from './fixtures/telegramBot';

/**
 * The press on Buy with Stars, from the token the api gateway believed to the link she opens.
 *
 * The bot api is a double that answers what the bot api answers, and the table is the double the
 * payment store is already held to, so what is read here is the call the route made and the item
 * the press left behind.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const userName = 'SignInWithApple_000482910';
const payerDigest = payerDigestFor(userPoolId, userName);

/** A moment inside the offer, and one after it closed. */
const whileTheOfferIsOpen = new Date(theBlackFridayOfferEnds.getTime() - 86_400_000);
const afterTheOfferClosed = new Date(theBlackFridayOfferEnds.getTime() + 1000);

function aRequest(
  claims: Readonly<Record<string, string>> | undefined,
  body?: string,
): HttpRequestEvent {
  return {
    rawPath: starsInvoicePath,
    headers: {},
    requestContext: {
      http: { method: 'POST' },
      ...(claims === undefined ? {} : { authorizer: { jwt: { claims } } }),
    },
    ...(body === undefined ? {} : { body }),
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

interface AnInvoice {
  held: WhatTheInvoiceNeeds;
  bot: FakeBot;
  table: FakeTable;
}

function anInvoice(options: { readonly bot?: FakeBot; readonly now?: Date } = {}): AnInvoice {
  const bot = options.bot ?? fakeBot();
  const table = fakeTable();

  return {
    bot,
    table,
    held: {
      entitlements: dynamoEntitlementStore(table, tableName),
      reaches: bot.reaches,
      botToken: () => Promise.resolve(theBotToken),
      poolId: userPoolId,
      clock: () => options.now ?? whileTheOfferIsOpen,
    },
  };
}

/** A payment item under her digest, as a payment of either route leaves one. */
async function seed(
  table: FakeTable,
  held: Readonly<Record<string, string>>,
  eventAt = 1,
): Promise<void> {
  await dynamoEntitlementStore(table, tableName).writeEntitlement({
    payerDigest,
    eventAt,
    writtenAt: new Date('2026-11-01T00:00:00.000Z').toISOString(),
    ...held,
  });
}

describe('the press on Buy with Stars', () => {
  describe('the price, which one constant holds', () => {
    it('sells a year for 2250 Stars, and half of that on the offer', () => {
      expect(theYearlyStarsPrice).toBe(2250);
      expect(theStarsPriceOnTheOffer).toBe(1125);
      expect(theDaysOneStarsPaymentBuys).toBe(365);
    });
  });

  describe('the payload, which is the only thing that travels there and back', () => {
    it('fits the 128 bytes Telegram takes, on the offer and at the full price', () => {
      for (const offer of [undefined, theBlackFridayOffer]) {
        const payload = starsPayloadFor(payerDigest, offer);

        expect(Buffer.byteLength(payload, 'utf8')).toBeLessThanOrEqual(
          theLongestPayloadTelegramTakes,
        );
      }
    });

    it('names the digest that pays and the price she was shown, and nothing else', () => {
      expect(whatThePayloadNames(starsPayloadFor(payerDigest, undefined))).toEqual({
        payerDigest,
        onTheOffer: false,
      });
      expect(whatThePayloadNames(starsPayloadFor(payerDigest, theBlackFridayOffer))).toEqual({
        payerDigest,
        onTheOffer: true,
      });
    });

    it('reads nothing out of a payload another bot made', () => {
      for (const payload of [
        '',
        'emi1',
        `emi2:${payerDigest}:f`,
        `emi1:${payerDigest}`,
        `emi1:${payerDigest}:z`,
        'emi1:not-a-digest:f',
        `emi1:${payerDigest.toLowerCase()}:f`,
      ]) {
        expect(whatThePayloadNames(payload)).toBeNull();
      }
    });
  });

  describe('the call it makes', () => {
    it('asks for one price in Stars, with no provider token, and answers the link', async () => {
      const { held, bot } = anInvoice();

      const answered = await starsInvoiceFor(aRequest(tokenOf(), '{}'), held);

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ invoiceLink: theInvoiceLink });

      const asked = bot.bodyOf(createInvoiceLinkMethod);

      expect(asked?.currency).toBe(starsCurrency);
      expect(asked?.prices).toEqual([{ label: expect.any(String), amount: theYearlyStarsPrice }]);
      expect(asked?.payload).toBe(starsPayloadFor(payerDigest, undefined));
      expect(Object.keys(asked ?? {})).not.toContain('provider_token');
      expect(Object.keys(asked ?? {})).not.toContain('subscription_period');
    });

    it('sells the offer price while the offer is open, and the full price after it closed', async () => {
      const open = anInvoice();
      await starsInvoiceFor(
        aRequest(tokenOf(), JSON.stringify({ offer: theBlackFridayOffer })),
        open.held,
      );

      expect(open.bot.bodyOf(createInvoiceLinkMethod)?.prices).toEqual([
        { label: expect.any(String), amount: theStarsPriceOnTheOffer },
      ]);

      const closed = anInvoice({ now: afterTheOfferClosed });
      await starsInvoiceFor(
        aRequest(tokenOf(), JSON.stringify({ offer: theBlackFridayOffer })),
        closed.held,
      );

      expect(closed.bot.bodyOf(createInvoiceLinkMethod)?.prices).toEqual([
        { label: expect.any(String), amount: theYearlyStarsPrice },
      ]);
    });

    it('writes nothing at all, because only the payment writes a date', async () => {
      const { held, table } = anInvoice();

      await starsInvoiceFor(aRequest(tokenOf(), '{}'), held);

      expect(table.items()).toEqual([]);
      expect(table.calls().updateItem).toBe(0);
    });

    it('takes a press with no body as the full price', async () => {
      const { held, bot } = anInvoice();

      const answered = await starsInvoiceFor(aRequest(tokenOf()), held);

      expect(answered.statusCode).toBe(200);
      expect(bot.bodyOf(createInvoiceLinkMethod)?.prices).toEqual([
        { label: expect.any(String), amount: theYearlyStarsPrice },
      ]);
    });
  });

  describe('every way it refuses', () => {
    it('refuses a request carrying no token, and reaches the bot api for nothing', async () => {
      const { held, bot } = anInvoice();

      const answered = await starsInvoiceFor(aRequest(undefined, '{}'), held);

      expect(answered.statusCode).toBe(401);
      expect(JSON.parse(answered.body)).toEqual({ error: thatTokenBuysNothing });
      expect(bot.calls()).toEqual([]);
    });

    it('refuses a token of another pool and a token carrying no user name, the same way', async () => {
      const { held } = anInvoice();

      for (const claims of [
        tokenOf({ iss: 'https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_SOMEBODY' }),
        tokenOf({ [userNameClaim]: '' }),
      ]) {
        const answered = await starsInvoiceFor(aRequest(claims, '{}'), held);

        expect(answered.statusCode).toBe(401);
        expect(JSON.parse(answered.body)).toEqual({ error: thatTokenBuysNothing });
      }
    });

    it('refuses a body naming a field it does not take, or an offer of its own', async () => {
      const { held, bot } = anInvoice();

      for (const body of [
        JSON.stringify({ offer: 'half-price-forever' }),
        JSON.stringify({ amount: 1 }),
        JSON.stringify({ offer: theBlackFridayOffer, amount: 1 }),
        JSON.stringify([theBlackFridayOffer]),
        'not json at all',
      ]) {
        const answered = await starsInvoiceFor(aRequest(tokenOf(), body), held);

        expect(answered.statusCode).toBe(400);
        expect(JSON.parse(answered.body)).toEqual({ error: theBodyAnInvoiceTakes });
      }

      expect(bot.calls()).toEqual([]);
    });

    it('refuses a woman whose paid year is still running', async () => {
      const { held, table, bot } = anInvoice();
      await seed(table, {
        paidUntil: new Date(whileTheOfferIsOpen.getTime() + 86_400_000).toISOString(),
        route: 'stars',
        state: 'active',
      });

      const answered = await starsInvoiceFor(aRequest(tokenOf(), '{}'), held);

      expect(answered.statusCode).toBe(409);
      expect(JSON.parse(answered.body)).toEqual({ error: aYearIsAlreadyRunning });
      expect(bot.calls()).toEqual([]);
    });

    it('refuses a woman whose card subscription is running, and one that is cancelling', async () => {
      for (const state of ['active', 'cancelling']) {
        const { held, table } = anInvoice();
        await seed(table, { subscriptionRef: 'sub_000000000001', state });

        expect((await starsInvoiceFor(aRequest(tokenOf(), '{}'), held)).statusCode).toBe(409);
      }
    });

    it('sells a year to a woman whose year has passed, and to one who lapsed', async () => {
      const seeds: Readonly<Record<string, string>>[] = [
        { paidUntil: new Date(whileTheOfferIsOpen.getTime() - 86_400_000).toISOString() },
        { subscriptionRef: 'sub_000000000001', state: 'lapsed' },
      ];

      for (const held of seeds) {
        const invoice = anInvoice();
        await seed(invoice.table, held);

        expect((await starsInvoiceFor(aRequest(tokenOf(), '{}'), invoice.held)).statusCode).toBe(
          200,
        );
      }
    });

    it('answers one refusal for every way the bot api stops, naming none of them', async () => {
      const { held } = anInvoice({
        bot: fakeBot({ refusesTheInvoice: { status: 401, body: '{"ok":false}' } }),
      });

      const answered = await starsInvoiceFor(aRequest(tokenOf(), '{}'), held);

      expect(answered.statusCode).toBe(502);
      expect(JSON.parse(answered.body)).toEqual({ error: noInvoiceWasMade });
    });

    it('answers the same refusal when the parameter store holds no token yet', async () => {
      const { bot, table } = anInvoice();
      const held: WhatTheInvoiceNeeds = {
        entitlements: dynamoEntitlementStore(table, tableName),
        reaches: bot.reaches,
        botToken: () => Promise.reject(new Error('the parameter holds no value')),
        poolId: userPoolId,
        clock: () => whileTheOfferIsOpen,
      };

      expect((await starsInvoiceFor(aRequest(tokenOf(), '{}'), held)).statusCode).toBe(502);
      expect(bot.calls()).toEqual([]);
    });
  });

  describe('what never reaches Telegram', () => {
    it('sends the digest and no claim of her token', async () => {
      const { held, bot } = anInvoice();

      await starsInvoiceFor(aRequest(tokenOf(), '{}'), held);

      const sent = JSON.stringify(bot.calls());

      expect(sent).toContain(payerDigest);
      expect(sent).not.toContain(userName);
      expect(sent).not.toContain(userPoolId);
    });
  });
});
