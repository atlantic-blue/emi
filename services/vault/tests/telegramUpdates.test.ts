import { payerDigestFor } from '@emi/crypto';

import type { HttpRequestEvent } from '../src/api';
import { dynamoEntitlementStore } from '../src/payments/dynamoEntitlements';
import {
  entitlementSortKey,
  paymentPartitionFor,
  type StoredEntitlement,
} from '../src/payments/entitlements';
import {
  answerPreCheckoutQueryMethod,
  starsCurrency,
  starsPayloadFor,
  theStarsPriceOnTheOffer,
  theYearlyStarsPrice,
} from '../src/payments/stars';
import { secretHeldOnce } from '../src/payments/stripeSecrets';
import { telegramWebhookSecretParameter } from '../src/payments/starsSecrets';
import {
  secretTokenHeader,
  sendThatUpdateAgain,
  telegramUpdatesFor,
  telegramUpdatesPath,
  thatInvoiceIsNotOurs,
  thatPriceHasChanged,
  thatUpdateIsNotOurs,
  type WhatTheUpdatesNeed,
} from '../src/payments/telegramUpdates';
import { theBlackFridayOffer, theBlackFridayOfferEnds } from '../src/payments/stripe';
import type { ParameterStore, ParameterWrite } from '../src/telegram/parameters';
import { fakeTable, tableName, type FakeTable } from './fixtures/dynamoTable';
import { fakeBot, theBotToken, type FakeBot } from './fixtures/telegramBot';

/**
 * The updates of the Emi bot, from the secret of the header to the item.
 *
 * The secret is read through the same parameter store port the deployed function reads, and the
 * table is the double the payment store is already held to, so what is proved here is the check
 * the deployed function carries out and the item the write leaves behind.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const payerDigest = payerDigestFor(userPoolId, 'SignInWithApple_000482910');

/** Not a real secret. Terraform generates the deployed one and no person reads it. */
const theWebhookSecret = 'the-secret-terraform-generated-for-this-bot';

const chargeRef = 'telegram_charge_000000000001';

/** A moment inside the offer, and one after it closed. */
const whileTheOfferIsOpen = new Date(theBlackFridayOfferEnds.getTime() - 86_400_000);
const afterTheOfferClosed = new Date(theBlackFridayOfferEnds.getTime() + 1000);

const secondsOf = (at: Date): number => Math.floor(at.getTime() / 1000);

function parametersHolding(held: Readonly<Record<string, string>>): ParameterStore {
  return {
    read: (name: string): Promise<string | undefined> => Promise.resolve(held[name]),
    writeIfAbsent: (): Promise<ParameterWrite> =>
      Promise.reject(new Error('the webhook writes no parameter')),
  };
}

interface TheUpdates {
  held: WhatTheUpdatesNeed;
  bot: FakeBot;
  table: FakeTable;
  /** The item under her digest, read back through the store the deployed function writes with. */
  item(): Promise<StoredEntitlement | undefined>;
  /** One update, with the secret of the header unless a test names another. */
  send(update: unknown, options?: { readonly secret?: string | null }): Promise<HttpRequestEvent>;
}

function theUpdates(
  options: {
    readonly bot?: FakeBot;
    readonly now?: Date;
    readonly parameters?: ParameterStore;
  } = {},
): TheUpdates {
  const bot = options.bot ?? fakeBot();
  const table = fakeTable();
  const parameters =
    options.parameters ?? parametersHolding({ [telegramWebhookSecretParameter]: theWebhookSecret });
  const store = dynamoEntitlementStore(table, tableName);

  return {
    bot,
    table,
    item: () => store.readEntitlement(payerDigest),
    send: (update, { secret = theWebhookSecret } = {}) =>
      Promise.resolve({
        rawPath: telegramUpdatesPath,
        headers: secret === null ? {} : { [secretTokenHeader]: secret },
        requestContext: { http: { method: 'POST' } },
        body: JSON.stringify(update),
      }),
    held: {
      entitlements: store,
      reaches: bot.reaches,
      botToken: () => Promise.resolve(theBotToken),
      webhookSecret: secretHeldOnce(parameters, telegramWebhookSecretParameter),
      clock: () => options.now ?? whileTheOfferIsOpen,
    },
  };
}

/** A pre checkout query, as Telegram sends one. */
function aPreCheckout(
  held: {
    readonly payload?: string;
    readonly currency?: string;
    readonly amount?: number;
  } = {},
): unknown {
  return {
    update_id: 1,
    pre_checkout_query: {
      id: 'the-query-000000000001',
      // Telegram sends the user who is paying. Nothing of this object is read but the three fields
      // below, and no identifier of hers is written or logged.
      from: { id: 4_118_829_001, first_name: 'Somebody' },
      currency: held.currency ?? starsCurrency,
      total_amount: held.amount ?? theYearlyStarsPrice,
      invoice_payload: held.payload ?? starsPayloadFor(payerDigest, undefined),
    },
  };
}

/** A message carrying a successful payment, as Telegram sends one. */
function aPayment(
  held: {
    readonly payload?: string;
    readonly charge?: string;
    readonly amount?: number;
    readonly at?: Date;
  } = {},
): unknown {
  return {
    update_id: 2,
    message: {
      message_id: 11,
      date: secondsOf(held.at ?? whileTheOfferIsOpen),
      from: { id: 4_118_829_001, first_name: 'Somebody' },
      chat: { id: 4_118_829_001, type: 'private' },
      successful_payment: {
        currency: starsCurrency,
        total_amount: held.amount ?? theYearlyStarsPrice,
        invoice_payload: held.payload ?? starsPayloadFor(payerDigest, undefined),
        telegram_payment_charge_id: held.charge ?? chargeRef,
        provider_payment_charge_id: 'provider_000000000001',
      },
    },
  };
}

const theAnswerTo = (bot: FakeBot): Readonly<Record<string, unknown>> | undefined =>
  bot.bodyOf(answerPreCheckoutQueryMethod);

describe('an update of the Emi bot', () => {
  describe('what it owes before one field of the body is read', () => {
    it('refuses an update whose secret header does not match, and writes nothing', async () => {
      const updates = theUpdates();

      const answered = await telegramUpdatesFor(
        await updates.send(aPayment(), { secret: 'not-the-secret-of-this-bot' }),
        updates.held,
      );

      expect(answered.statusCode).toBe(401);
      expect(JSON.parse(answered.body)).toEqual({ error: thatUpdateIsNotOurs });
      expect(updates.table.items()).toEqual([]);
      expect(updates.bot.calls()).toEqual([]);
    });

    it('refuses an update carrying no secret header at all', async () => {
      const updates = theUpdates();

      const answered = await telegramUpdatesFor(
        await updates.send(aPreCheckout(), { secret: null }),
        updates.held,
      );

      expect(answered.statusCode).toBe(401);
      expect(updates.bot.calls()).toEqual([]);
    });

    it('refuses a secret that is the right value with something added to it', async () => {
      const updates = theUpdates();

      const answered = await telegramUpdatesFor(
        await updates.send(aPayment(), { secret: `${theWebhookSecret}x` }),
        updates.held,
      );

      expect(answered.statusCode).toBe(401);
      expect(updates.table.items()).toEqual([]);
    });

    it('asks for the update again when the parameter store holds no secret yet', async () => {
      const updates = theUpdates({ parameters: parametersHolding({}) });

      const answered = await telegramUpdatesFor(await updates.send(aPayment()), updates.held);

      expect(answered.statusCode).toBe(500);
      expect(JSON.parse(answered.body)).toEqual({ error: sendThatUpdateAgain });
      expect(updates.table.items()).toEqual([]);
    });
  });

  describe('the pre checkout query, which is answered before anything is written', () => {
    it('answers ok for the price the payload names, and writes nothing', async () => {
      const updates = theUpdates();

      const answered = await telegramUpdatesFor(await updates.send(aPreCheckout()), updates.held);

      expect(answered.statusCode).toBe(200);
      expect(theAnswerTo(updates.bot)?.ok).toBe(true);
      expect(theAnswerTo(updates.bot)?.error_message).toBeUndefined();
      expect(updates.table.items()).toEqual([]);
    });

    it('answers ok for the offer price while the offer is open', async () => {
      const updates = theUpdates();

      await telegramUpdatesFor(
        await updates.send(
          aPreCheckout({
            payload: starsPayloadFor(payerDigest, theBlackFridayOffer),
            amount: theStarsPriceOnTheOffer,
          }),
        ),
        updates.held,
      );

      expect(theAnswerTo(updates.bot)?.ok).toBe(true);
    });

    it('answers not ok for an amount that is not the price the payload names', async () => {
      for (const amount of [theYearlyStarsPrice - 1, theStarsPriceOnTheOffer, 0]) {
        const updates = theUpdates();

        await telegramUpdatesFor(await updates.send(aPreCheckout({ amount })), updates.held);

        expect(theAnswerTo(updates.bot)?.ok).toBe(false);
        expect(theAnswerTo(updates.bot)?.error_message).toBe(thatPriceHasChanged);
      }
    });

    it('answers not ok for the offer price once the offer has closed', async () => {
      const updates = theUpdates({ now: afterTheOfferClosed });

      await telegramUpdatesFor(
        await updates.send(
          aPreCheckout({
            payload: starsPayloadFor(payerDigest, theBlackFridayOffer),
            amount: theStarsPriceOnTheOffer,
          }),
        ),
        updates.held,
      );

      expect(theAnswerTo(updates.bot)?.ok).toBe(false);
      expect(theAnswerTo(updates.bot)?.error_message).toBe(thatPriceHasChanged);
    });

    it('answers not ok for a currency that is not Stars', async () => {
      const updates = theUpdates();

      await telegramUpdatesFor(await updates.send(aPreCheckout({ currency: 'EUR' })), updates.held);

      expect(theAnswerTo(updates.bot)?.ok).toBe(false);
    });

    it('answers not ok for a payload no invoice of ours made', async () => {
      const updates = theUpdates();

      await telegramUpdatesFor(
        await updates.send(aPreCheckout({ payload: 'another-bot-made-this' })),
        updates.held,
      );

      expect(theAnswerTo(updates.bot)?.ok).toBe(false);
      expect(theAnswerTo(updates.bot)?.error_message).toBe(thatInvoiceIsNotOurs);
    });
  });

  describe('the payment, which is the one thing that writes a date', () => {
    it('writes the year, the route and the charge under the digest the payload names', async () => {
      const updates = theUpdates();

      const answered = await telegramUpdatesFor(await updates.send(aPayment()), updates.held);

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ written: true });

      const item = await updates.item();

      expect(item?.route).toBe('stars');
      expect(item?.state).toBe('active');
      expect(item?.chargeRef).toBe(chargeRef);
      expect(item?.paidUntil).toBe(
        new Date(whileTheOfferIsOpen.getTime() + 365 * 86_400_000).toISOString(),
      );
      expect(item?.subscriptionRef).toBeUndefined();
      expect(item?.payerRef).toBeUndefined();
    });

    it('writes the year on top of a date she already holds', async () => {
      const updates = theUpdates();
      const held = new Date(whileTheOfferIsOpen.getTime() + 40 * 86_400_000).toISOString();

      await updates.held.entitlements.writeEntitlement({
        payerDigest,
        eventAt: 1,
        writtenAt: whileTheOfferIsOpen.toISOString(),
        paidUntil: held,
        route: 'card',
        state: 'active',
      });

      await telegramUpdatesFor(await updates.send(aPayment()), updates.held);

      expect((await updates.item())?.paidUntil).toBe(
        new Date(Date.parse(held) + 365 * 86_400_000).toISOString(),
      );
    });

    it('writes the year from now when the date she holds has passed', async () => {
      const updates = theUpdates();
      const passed = new Date(whileTheOfferIsOpen.getTime() - 86_400_000).toISOString();

      await updates.held.entitlements.writeEntitlement({
        payerDigest,
        eventAt: 1,
        writtenAt: passed,
        paidUntil: passed,
        state: 'lapsed',
      });

      await telegramUpdatesFor(await updates.send(aPayment()), updates.held);

      expect((await updates.item())?.paidUntil).toBe(
        new Date(whileTheOfferIsOpen.getTime() + 365 * 86_400_000).toISOString(),
      );
    });

    it('writes one year for one charge, however many times the update arrives', async () => {
      const updates = theUpdates();
      const update = await updates.send(aPayment());

      expect(JSON.parse((await telegramUpdatesFor(update, updates.held)).body)).toEqual({
        written: true,
      });

      const afterTheFirst = await updates.item();

      for (const again of [1, 2]) {
        expect(again).toBeGreaterThan(0);
        expect(JSON.parse((await telegramUpdatesFor(update, updates.held)).body)).toEqual({
          written: false,
        });
      }

      expect(await updates.item()).toEqual(afterTheFirst);
      expect(updates.table.items()).toHaveLength(1);
    });

    it('writes a second year for a second charge, a year later', async () => {
      const updates = theUpdates();
      await telegramUpdatesFor(await updates.send(aPayment()), updates.held);

      const aYearOn = new Date(whileTheOfferIsOpen.getTime() + 366 * 86_400_000);
      const second = await updates.send(
        aPayment({ charge: 'telegram_charge_000000000002', at: aYearOn }),
      );

      expect(JSON.parse((await telegramUpdatesFor(second, updates.held)).body)).toEqual({
        written: true,
      });

      const item = await updates.item();

      expect(item?.chargeRef).toBe('telegram_charge_000000000002');
      expect(Date.parse(item?.paidUntil ?? '')).toBeGreaterThan(aYearOn.getTime());
    });

    it('writes nothing for a payload no invoice of ours made', async () => {
      const updates = theUpdates();

      const answered = await telegramUpdatesFor(
        await updates.send(aPayment({ payload: 'another-bot-made-this' })),
        updates.held,
      );

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ written: false });
      expect(updates.table.items()).toEqual([]);
    });

    it('writes nothing for a payment naming no charge', async () => {
      const updates = theUpdates();
      const update = aPayment() as {
        message: { successful_payment: Record<string, unknown> };
      };
      delete update.message.successful_payment.telegram_payment_charge_id;

      await telegramUpdatesFor(await updates.send(update), updates.held);

      expect(updates.table.items()).toEqual([]);
    });
  });

  describe('what it never writes down', () => {
    it('holds no Telegram identifier of hers in the item or in its key', async () => {
      const updates = theUpdates();

      await telegramUpdatesFor(await updates.send(aPayment()), updates.held);

      const written = JSON.stringify(updates.table.items());

      expect(written).toContain(paymentPartitionFor(payerDigest));
      expect(written).toContain(entitlementSortKey);
      expect(written).not.toContain('4118829001');
      expect(written).not.toContain('Somebody');
      expect(written).not.toContain('provider_000000000001');
    });
  });

  describe('an update it does not answer', () => {
    it('takes a message she typed and writes nothing, so Telegram does not send it again', async () => {
      const updates = theUpdates();

      const answered = await telegramUpdatesFor(
        await updates.send({ update_id: 3, message: { message_id: 4, text: 'hello' } }),
        updates.held,
      );

      expect(answered.statusCode).toBe(200);
      expect(JSON.parse(answered.body)).toEqual({ written: false });
      expect(updates.bot.calls()).toEqual([]);
      expect(updates.table.items()).toEqual([]);
    });

    it('takes a body that is not an update at all', async () => {
      const updates = theUpdates();
      const update = await updates.send(aPayment());

      const answered = await telegramUpdatesFor({ ...update, body: 'not json' }, updates.held);

      expect(answered.statusCode).toBe(200);
      expect(updates.table.items()).toEqual([]);
    });
  });
});
