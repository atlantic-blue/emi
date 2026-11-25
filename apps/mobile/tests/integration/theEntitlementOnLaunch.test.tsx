import { join } from 'node:path';

import { renderRouter, waitFor } from 'expo-router/testing-library';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { readSetting, settingKeys, writeSetting } from '../../src/data/settingRepository';
import {
  THE_KEY_THE_ANSWER_IS_HELD_UNDER,
  theSettingTableHolds,
} from '../../src/services/store/theAnswerThePhoneHolds';
import type { WhatSheIsEntitledToNow } from '../../src/services/store/theEntitlement';
import {
  theEntitlementWhenSheOpens,
  watchForATransactionElsewhere,
} from '../../src/services/store/theEntitlementWhenSheOpens';
import {
  theBlackFridayProduct,
  theMonthlyPlan,
  theYearlyPlan,
} from '../../src/services/store/theProducts';
import { theStoreOnThisPhone } from '../../src/services/store/theStoreOnThisPhone';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { openTestDatabase } from '../data/nodeDatabase';
import {
  aTransactionArrivesFromElsewhere,
  aTransactionTheStoreHolds,
  theFreeMonthOffer,
  theOptionsTheReadsWereGiven,
  theRenewalInformation,
  theStoreCannotBeReached,
  theStoreCannotSayWhatSheHolds,
  theStoreHoldsTheseTransactions,
  theStoreNamesNoTransaction,
  theStoreStartsAgain,
  theTransactionsStartAgain,
  theWatchCannotBeAttached,
  theWatchesOnTheStore,
  whatTheLibraryWasAsked,
} from '../fixtures/expoIap';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';

jest.mock('expo-iap', () => jest.requireActual('../fixtures/expoIap'));
jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

const sheOpensItAt = new Date('2026-11-25T09:00:00.000Z');
const aMonth = 30 * 24 * 60 * 60 * 1000;
const aYear = 365 * 24 * 60 * 60 * 1000;
const now = (): Date => sheOpensItAt;

function migrated(): Database {
  const database = openTestDatabase();

  migrate(database);

  return database;
}

/** What the launch read works out, driven through the phone's own store and setting table. */
async function whatSheOpensWith(database: Database): Promise<WhatSheIsEntitledToNow | null> {
  return (
    await theEntitlementWhenSheOpens(theStoreOnThisPhone, theSettingTableHolds(database), now)
  ).entitlement;
}

async function whereTheAnswerCameFrom(database: Database): Promise<string> {
  return (
    await theEntitlementWhenSheOpens(theStoreOnThisPhone, theSettingTableHolds(database), now)
  ).from;
}

/** The answer in the setting row, read back the way the next launch reads it. */
function whatThePhoneIsHolding(database: Database): WhatSheIsEntitledToNow | null {
  return theSettingTableHolds(database).read();
}

function aYearSheIsPayingFor(): ReturnType<typeof aTransactionTheStoreHolds> {
  return aTransactionTheStoreHolds(theYearlyPlan.identifier, {
    expirationDateIOS: sheOpensItAt.getTime() + aYear,
    originalTransactionIdentifierIOS: 'the-first-one',
    isAutoRenewing: true,
  });
}

describe('the entitlement, read on launch', () => {
  beforeEach(() => {
    theStoreStartsAgain();
    theTransactionsStartAgain();
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  describe('what the application asks the store', () => {
    it('opens the connection before it reads what she holds', async () => {
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      await whatSheOpensWith(migrated());

      expect(whatTheLibraryWasAsked()).toEqual(['initConnection', 'getAvailablePurchases']);
    });

    it('asks for every transaction and not only the live ones, so a refund can be read', async () => {
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      await whatSheOpensWith(migrated());

      expect(theOptionsTheReadsWereGiven()).toEqual([{ onlyIncludeActiveItemsIOS: false }]);
    });
  });

  describe('one state for each thing the store can say', () => {
    it('says she never paid where the store holds nothing of hers', async () => {
      theStoreHoldsTheseTransactions([]);

      expect(await whatSheOpensWith(migrated())).toEqual({
        state: 'neverPaid',
        until: null,
        plan: null,
        transaction: null,
        readAt: sheOpensItAt.toISOString(),
      });
    });

    it('says she never paid where the store answers nothing at all', async () => {
      theStoreNamesNoTransaction();

      expect((await whatSheOpensWith(migrated()))?.state).toBe('neverPaid');
    });

    it('says free month while the yearly plan is inside the month it gives away', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() + aMonth,
          offerIOS: theFreeMonthOffer(),
        }),
      ]);

      const opened = await whatSheOpensWith(migrated());

      expect(opened?.state).toBe('freeMonth');
      expect(opened?.plan).toBe(theYearlyPlan.identifier);
      expect(opened?.until).toBe(new Date(sheOpensItAt.getTime() + aMonth).toISOString());
    });

    it('says paid where the plan renews itself and no offer is running', async () => {
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      const opened = await whatSheOpensWith(migrated());

      expect(opened?.state).toBe('paid');
      expect(opened?.transaction).toBe('the-first-one');
    });

    it('says paid for the monthly plan, which carries no offer of any kind', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theMonthlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() + aMonth,
        }),
      ]);

      expect((await whatSheOpensWith(migrated()))?.state).toBe('paid');
    });

    it('says cancelling where the period runs on and the renewal is off', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() + aYear,
          isAutoRenewing: false,
        }),
      ]);

      const opened = await whatSheOpensWith(migrated());

      expect(opened?.state).toBe('cancelling');
      expect(opened?.until).toBe(new Date(sheOpensItAt.getTime() + aYear).toISOString());
    });

    it('says cancelling where she turned the renewal off inside the free month', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() + aMonth,
          offerIOS: theFreeMonthOffer(),
          isAutoRenewing: false,
        }),
      ]);

      expect((await whatSheOpensWith(migrated()))?.state).toBe('cancelling');
    });

    it('says lapsed where the period she paid for ended', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() - aMonth,
          isAutoRenewing: false,
        }),
      ]);

      const opened = await whatSheOpensWith(migrated());

      expect(opened?.state).toBe('lapsed');
      expect(opened?.until).toBe(new Date(sheOpensItAt.getTime() - aMonth).toISOString());
      expect(opened?.plan).toBe(theYearlyPlan.identifier);
    });

    it('says refunded where the store took the transaction back', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() + aYear,
          revocationDateIOS: sheOpensItAt.getTime() - 1000,
        }),
      ]);

      const opened = await whatSheOpensWith(migrated());

      expect(opened?.state).toBe('refunded');
      expect(opened?.until).toBe(new Date(sheOpensItAt.getTime() - 1000).toISOString());
    });

    it('says paid while Apple is still trying her card, because she cannot tell it apart', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() - aMonth,
          renewalInfoIOS: theRenewalInformation({ isInBillingRetry: true }),
        }),
      ]);

      expect((await whatSheOpensWith(migrated()))?.state).toBe('paid');
    });

    it('says paid inside the grace period Apple gives her after a failed renewal', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() - 1000,
          renewalInfoIOS: theRenewalInformation({
            gracePeriodExpirationDate: sheOpensItAt.getTime() + aMonth,
          }),
        }),
      ]);

      expect((await whatSheOpensWith(migrated()))?.state).toBe('paid');
    });

    it('says lapsed once the grace period ends too', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() - aMonth,
          renewalInfoIOS: theRenewalInformation({
            gracePeriodExpirationDate: sheOpensItAt.getTime() - 1000,
          }),
        }),
      ]);

      expect((await whatSheOpensWith(migrated()))?.state).toBe('lapsed');
    });
  });

  describe('a refunded transaction', () => {
    it('is absent from what covers her, so a live refund pays for nothing', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() + aYear,
          revocationDateIOS: sheOpensItAt.getTime() - 1000,
        }),
      ]);

      const opened = await whatSheOpensWith(migrated());

      expect(opened?.state).not.toBe('paid');
      expect(opened?.state).not.toBe('freeMonth');
      expect(opened?.state).not.toBe('cancelling');
      expect(opened?.state).toBe('refunded');
    });

    it('from last year does not make this month a refund, because the later stop decides', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theBlackFridayProduct.identifier, {
          id: 'the-one-she-got-back',
          expirationDateIOS: sheOpensItAt.getTime() - aYear,
          revocationDateIOS: sheOpensItAt.getTime() - aYear,
        }),
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          id: 'the-one-that-ran-out',
          expirationDateIOS: sheOpensItAt.getTime() - aMonth,
        }),
      ]);

      const opened = await whatSheOpensWith(migrated());

      expect(opened?.state).toBe('lapsed');
      expect(opened?.plan).toBe(theYearlyPlan.identifier);
    });

    it('decides a stop she and the store share the instant of, because money went back', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theMonthlyPlan.identifier, {
          id: 'the-one-that-ran-out',
          expirationDateIOS: sheOpensItAt.getTime() - aMonth,
        }),
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          id: 'the-one-she-got-back',
          expirationDateIOS: sheOpensItAt.getTime() + aYear,
          revocationDateIOS: sheOpensItAt.getTime() - aMonth,
        }),
      ]);

      const opened = await whatSheOpensWith(migrated());

      expect(opened?.state).toBe('refunded');
      expect(opened?.plan).toBe(theYearlyPlan.identifier);
    });

    it('covers her again where a later purchase is live', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theMonthlyPlan.identifier, {
          id: 'the-one-she-got-back',
          revocationDateIOS: sheOpensItAt.getTime() - aMonth,
        }),
        aYearSheIsPayingFor(),
      ]);

      expect((await whatSheOpensWith(migrated()))?.state).toBe('paid');
    });
  });

  describe('a transaction of another application', () => {
    it('entitles her to nothing, because the plan is not one Emi sells', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds('blue.atlantic.something.else', {
          expirationDateIOS: sheOpensItAt.getTime() + aYear,
        }),
      ]);

      expect((await whatSheOpensWith(migrated()))?.state).toBe('neverPaid');
    });
  });

  describe('two plans at once', () => {
    it('keeps the date furthest away, so a crossgrade never shortens what she holds', async () => {
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theMonthlyPlan.identifier, {
          id: 'the-month',
          expirationDateIOS: sheOpensItAt.getTime() + aMonth,
        }),
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          id: 'the-year',
          expirationDateIOS: sheOpensItAt.getTime() + aYear,
        }),
      ]);

      const opened = await whatSheOpensWith(migrated());

      expect(opened?.plan).toBe(theYearlyPlan.identifier);
      expect(opened?.until).toBe(new Date(sheOpensItAt.getTime() + aYear).toISOString());
    });
  });

  describe('the answer the phone holds', () => {
    it('is written by the launch read, so the next launch starts from it', async () => {
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      const database = migrated();

      await whatSheOpensWith(database);

      expect(whatThePhoneIsHolding(database)?.state).toBe('paid');
      expect(whatThePhoneIsHolding(database)?.transaction).toBe('the-first-one');
    });

    it('is held under a key that names no fact about her body', () => {
      expect(settingKeys).toContain(THE_KEY_THE_ANSWER_IS_HELD_UNDER);
    });

    it('stands where the store cannot be reached, and nothing is written over it', async () => {
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      const database = migrated();

      await whatSheOpensWith(database);

      const held = whatThePhoneIsHolding(database);

      theStoreCannotBeReached();

      expect(await whatSheOpensWith(database)).toEqual(held);
      expect(whatThePhoneIsHolding(database)).toEqual(held);
      expect(await whereTheAnswerCameFrom(database)).toBe('whatThePhoneHeld');
    });

    it('stands where the store opens and refuses to say what she holds', async () => {
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      const database = migrated();

      await whatSheOpensWith(database);
      theStoreCannotSayWhatSheHolds();

      expect((await whatSheOpensWith(database))?.state).toBe('paid');
    });

    it('says nothing is known yet where the store is away and the phone held no answer', async () => {
      theStoreCannotBeReached();

      const database = migrated();

      expect(await whatSheOpensWith(database)).toBeNull();
      expect(await whereTheAnswerCameFrom(database)).toBe('nothingIsKnownYet');
    });

    it('reads a row this version cannot understand as nothing held at all', () => {
      const database = migrated();

      writeSetting(database, THE_KEY_THE_ANSWER_IS_HELD_UNDER, '{"state":"somethingLater"}');

      expect(whatThePhoneIsHolding(database)).toBeNull();
    });

    it('reads a whole answer naming a state this version cannot name as nothing held', () => {
      const database = migrated();

      writeSetting(
        database,
        THE_KEY_THE_ANSWER_IS_HELD_UNDER,
        JSON.stringify({
          state: 'aStateAVersionAfterThisOneAdded',
          until: '2027-11-25T09:00:00.000Z',
          plan: theYearlyPlan.identifier,
          transaction: 'the-first-one',
          readAt: sheOpensItAt.toISOString(),
        }),
      );

      expect(whatThePhoneIsHolding(database)).toBeNull();
    });

    it('reads a row that is not an answer at all as nothing held', () => {
      const database = migrated();

      writeSetting(database, THE_KEY_THE_ANSWER_IS_HELD_UNDER, 'paid until next year');

      expect(whatThePhoneIsHolding(database)).toBeNull();
    });

    it('is one row, so a phone that stopped mid write cannot hold half an answer', async () => {
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      const database = migrated();

      await whatSheOpensWith(database);

      expect(readSetting(database, THE_KEY_THE_ANSWER_IS_HELD_UNDER)).toContain('"state":"paid"');
    });
  });

  describe('a fresh install on her second phone', () => {
    it('is not asked to pay again, because the store hands over the year she owns', async () => {
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      const aPhoneThatHasHeldNothing = migrated();

      expect(whatThePhoneIsHolding(aPhoneThatHasHeldNothing)).toBeNull();

      const opened = await whatSheOpensWith(aPhoneThatHasHeldNothing);

      expect(opened?.state).toBe('paid');
      expect(opened?.until).toBe(new Date(sheOpensItAt.getTime() + aYear).toISOString());
    });
  });

  describe('a transaction that happens somewhere else', () => {
    it('is watched for, and the watch is dropped when the application lets it go', () => {
      const watching = watchForATransactionElsewhere(
        theStoreOnThisPhone,
        theSettingTableHolds(migrated()),
        now,
      );

      expect(theWatchesOnTheStore()).toBe(1);

      watching.stop();

      expect(theWatchesOnTheStore()).toBe(0);
    });

    it('updates what the phone holds when a renewal lands with nobody pressing anything', async () => {
      const database = migrated();

      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() - aMonth,
          isAutoRenewing: false,
        }),
      ]);
      await whatSheOpensWith(database);
      expect(whatThePhoneIsHolding(database)?.state).toBe('lapsed');

      watchForATransactionElsewhere(theStoreOnThisPhone, theSettingTableHolds(database), now);
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);
      await aTransactionArrivesFromElsewhere();

      expect(whatThePhoneIsHolding(database)?.state).toBe('paid');
    });

    it('updates what the phone holds when Apple refunds her', async () => {
      const database = migrated();

      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);
      await whatSheOpensWith(database);
      expect(whatThePhoneIsHolding(database)?.state).toBe('paid');

      watchForATransactionElsewhere(theStoreOnThisPhone, theSettingTableHolds(database), now);
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theYearlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() + aYear,
          revocationDateIOS: sheOpensItAt.getTime(),
        }),
      ]);
      await aTransactionArrivesFromElsewhere();

      expect(whatThePhoneIsHolding(database)?.state).toBe('refunded');
    });

    it('leaves the held answer alone where the store will not answer the second read', async () => {
      const database = migrated();

      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);
      await whatSheOpensWith(database);

      const held = whatThePhoneIsHolding(database);

      watchForATransactionElsewhere(theStoreOnThisPhone, theSettingTableHolds(database), now);
      theStoreCannotSayWhatSheHolds();
      await aTransactionArrivesFromElsewhere();

      expect(whatThePhoneIsHolding(database)).toEqual(held);
    });

    it('costs nothing on a build with no purchase library in it', () => {
      theWatchCannotBeAttached();

      const watching = watchForATransactionElsewhere(
        theStoreOnThisPhone,
        theSettingTableHolds(migrated()),
        now,
      );

      expect(theWatchesOnTheStore()).toBe(0);
      expect(() => watching.stop()).not.toThrow();
    });
  });

  describe('she opens Emi', () => {
    it('holds the answer the store gave, with nothing of it on screen', async () => {
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      renderRouter(appDirectory, { initialUrl: '/' });

      const herPhone = expoDatabase(openDatabaseSync(databaseFileName));

      await waitFor(() => {
        expect(readSetting(herPhone, THE_KEY_THE_ANSWER_IS_HELD_UNDER)).toBeDefined();
      });

      expect(theSettingTableHolds(herPhone).read()?.state).toBe('paid');
    });
  });
});
