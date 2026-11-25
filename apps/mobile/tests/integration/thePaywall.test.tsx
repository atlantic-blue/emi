import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, BackHandler } from 'react-native';

import type { Database } from '../../src/data/database';
import { migrate } from '../../src/data/schema';
import { getLocales } from 'expo-localization';

import { forgetLanguage } from '../../src/language';
import type { Language } from '../../src/language/language';
import {
  Paywall,
  paywallActionTestID,
  paywallGetTestID,
  paywallLineTestID,
  paywallPrivacyTestID,
  paywallRenewalTestID,
  paywallRestoreTestID,
  paywallTermsTestID,
  paywallTestID,
  paywallTitleTestID,
} from '../../src/features/paywall/Paywall';
import {
  planLineTestID,
  planNameTestID,
  planOfferTestID,
  planPriceTestID,
  planRowTestID,
} from '../../src/features/paywall/PlanRow';
import { THE_TERMS_OF_USE } from '../../src/features/paywall/copy';
import { theSettingTableHolds } from '../../src/services/store/theAnswerThePhoneHolds';
import type { WhatSheIsEntitledToNow } from '../../src/services/store/theEntitlement';
import type { APlanInTheStore } from '../../src/services/store/thePlans';
import { theMonthlyPlan, theYearlyPlan } from '../../src/services/store/theProducts';
import { theStoreOnThisPhone } from '../../src/services/store/theStoreOnThisPhone';
import { theStatesSheCanBeIn } from '../../src/services/store/theEntitlement';
import {
  THE_STATE_THE_PAYWALL_HOLDS,
  sheIsPaidUp,
  theStatesThatLetHerIn,
} from '../../src/services/store/thePurchase';
import { theStatesAWriteIsRefusedIn } from '../../src/services/store/theWriteGate';
import { openTestDatabase } from '../data/nodeDatabase';
import { resetExpoSqlite } from '../data/expoSqlite';
import {
  aTransactionTheStoreHolds,
  sheCancelsThePurchase,
  theFreeMonthOffer,
  thePressesOnTheStore,
  thePressesStartAgain,
  theRestoresAskedFor,
  theStoreHoldsTheseTransactions,
  theStoreRefusesThePurchase,
  theStoreRefusesTheRestore,
  theStoreSells,
  theStoreStartsAgain,
  theTransactionsFinished,
  theTransactionsStartAgain,
  whatTheLibraryWasAsked,
} from '../fixtures/expoIap';
import { visibleTextIn } from '../fixtures/renderedText';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';
import {
  theWordsTheBoardWrites,
  wordsMissingFromTheScreen,
} from '../fixtures/theBoardOfThePaywall';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'en-GB' }]) }));
jest.mock('expo-iap', () => jest.requireActual('../fixtures/expoIap'));
jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));

/**
 * The paywall of the first run: the one screen that sells Emi, with no way off it.
 *
 * The purchase runs through the stand in for the purchase library at the module boundary, so every
 * line between her press and the state the phone holds is the application's own.
 */

const sheOpensItAt = new Date('2026-11-25T09:00:00.000Z');
const aMonth = 30 * 24 * 60 * 60 * 1000;
const aYear = 365 * 24 * 60 * 60 * 1000;
const now = (): Date => sheOpensItAt;

const theYearlyPrice = '39 euros';
const theMonthlyPrice = '5 euros';

const thePlansTheStoreNamed: readonly APlanInTheStore[] = [
  { product: theYearlyPlan, priceInWords: theYearlyPrice, currency: 'EUR' },
  { product: theMonthlyPlan, priceInWords: theMonthlyPrice, currency: 'EUR' },
];

function migrated(): Database {
  const database = openTestDatabase();

  migrate(database);

  return database;
}

interface Opened {
  readonly database: Database;
  readonly paid: WhatSheIsEntitledToNow[];
  readonly opened: string[];
}

/** The phone she holds, and the language she reads Emi in. */
const asAPhone = getLocales as jest.MockedFunction<typeof getLocales>;

/**
 * One root for each case, with the screen remounted under a fresh key where she opens it twice.
 *
 * Unmounting a render leaves every later query in the same case reading an empty tree, so the
 * root stays up and the key is what gives her a screen that has forgotten which row she pressed.
 * The runner takes the root down between cases on its own.
 */
let theGlass: Awaited<ReturnType<typeof render>> | null = null;
let opens = 0;

async function sheOpensThePaywall(language: Language = 'en'): Promise<Opened> {
  asAPhone.mockReturnValue([{ languageTag: language } as ReturnType<typeof getLocales>[number]]);
  forgetLanguage();

  const database = migrated();
  const paid: WhatSheIsEntitledToNow[] = [];
  const opened: string[] = [];

  opens += 1;

  const element = (
    <OnAPhone>
      <Paywall
        buying={theStoreOnThisPhone}
        holding={theSettingTableHolds(database)}
        key={opens}
        now={now}
        onPaid={(entitlement) => paid.push(entitlement)}
        openThePage={(address) => opened.push(address)}
        plans={thePlansTheStoreNamed}
      />
    </OnAPhone>
  );

  if (theGlass === null) {
    theGlass = await render(element);
  } else {
    await theGlass.rerender(element);
  }

  return { database, opened, paid };
}

async function shePresses(testID: string): Promise<void> {
  await act(async () => {
    await fireEvent.press(screen.getByTestId(testID));
  });
}

function said(testID: string): string {
  return visibleTextIn(screen.getByTestId(testID)).join(' ');
}

/**
 * Everything on the glass that takes a touch, with the role a screen reader reads it as.
 *
 * A press is a host view carrying a responder, so a control drawn here answers whatever it is
 * named: a close cross, a back arrow and a skip would each show up in this list. The list is the
 * whole of what she can do on this screen.
 */
function everythingThatTakesATouch(): { readonly role: string; readonly testID: string }[] {
  return screen
    .queryAllByTestId(/.+/)
    .filter((node) => typeof node.props.onStartShouldSetResponder === 'function')
    .map((node) => ({
      role: String(node.props.accessibilityRole ?? ''),
      testID: String(node.props.testID),
    }));
}

function everyWordOnTheGlass(): string[] {
  return visibleTextIn(theScreenIn({ toJSON: () => screen.toJSON() }));
}

function aYearSheJustBought(): ReturnType<typeof aTransactionTheStoreHolds> {
  return aTransactionTheStoreHolds(theYearlyPlan.identifier, {
    expirationDateIOS: sheOpensItAt.getTime() + aYear,
    originalTransactionIdentifierIOS: 'the-first-one',
  });
}

function theFreeMonthSheJustStarted(): ReturnType<typeof aTransactionTheStoreHolds> {
  return aTransactionTheStoreHolds(theYearlyPlan.identifier, {
    expirationDateIOS: sheOpensItAt.getTime() + aMonth,
    offerIOS: theFreeMonthOffer(),
  });
}

describe('the paywall', () => {
  beforeEach(() => {
    theStoreStartsAgain();
    theTransactionsStartAgain();
    thePressesStartAgain();
    resetExpoSqlite();
    forgetLanguage();
    theGlass = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    forgetLanguage();
  });

  describe('every line App Review asks a subscription to carry', () => {
    const theLanguages: readonly Language[] = ['en', 'es', 'ru'];

    it.each(theLanguages)('names each plan and its period, in %s', async (language) => {
      await sheOpensThePaywall(language);

      for (const which of ['yearly', 'monthly'] as const) {
        expect(said(planNameTestID(which))).not.toBe('');
        expect(said(planPriceTestID(which))).toContain(
          which === 'yearly' ? theYearlyPrice : theMonthlyPrice,
        );
      }
    });

    it.each(theLanguages)(
      'shows the full renewal price under the button, in %s',
      async (language) => {
        await sheOpensThePaywall(language);

        const renewal = said(paywallRenewalTestID);

        expect(renewal).toContain(theYearlyPrice);
        expect(renewal.length).toBeGreaterThan(60);
      },
    );

    it.each(theLanguages)(
      'says how long the free month lasts and what follows it, in %s',
      async (language) => {
        await sheOpensThePaywall(language);

        const line = said(planLineTestID('yearly'));

        expect(line).toContain(theYearlyPrice);
        expect(said(planOfferTestID('yearly')).length).toBeGreaterThan(0);
      },
    );

    it.each(theLanguages)('offers a way to restore a purchase, in %s', async (language) => {
      await sheOpensThePaywall(language);

      expect(said(paywallRestoreTestID).length).toBeGreaterThan(0);
    });

    it.each(theLanguages)(
      'presses to the terms and to the privacy policy, in %s',
      async (language) => {
        await sheOpensThePaywall(language);

        expect(said(paywallTermsTestID).length).toBeGreaterThan(0);
        expect(said(paywallPrivacyTestID).length).toBeGreaterThan(0);
      },
    );

    it.each(theLanguages)('argues for the price before it asks for it, in %s', async (language) => {
      await sheOpensThePaywall(language);

      expect(said(paywallTitleTestID).length).toBeGreaterThan(0);
      expect(said(paywallLineTestID).length).toBeGreaterThan(0);

      for (const at of [0, 1, 2]) {
        expect(said(paywallGetTestID(at)).length).toBeGreaterThan(0);
      }
    });

    it('says all of it in different words in each language, so nothing fell back to English', async () => {
      const titles: string[] = [];

      for (const language of theLanguages) {
        await sheOpensThePaywall(language);
        titles.push(said(paywallTitleTestID));
      }

      expect(new Set(titles).size).toBe(theLanguages.length);
    });
  });

  describe('the board it was approved as', () => {
    it('writes every sentence the screen draws, in the order the board writes them', async () => {
      await sheOpensThePaywall();

      const board = theWordsTheBoardWrites();

      expect(board.length).toBeGreaterThan(10);
      expect(wordsMissingFromTheScreen(board, everyWordOnTheGlass())).toEqual([]);
    });
  });

  describe('the free month, which belongs to the yearly plan alone', () => {
    it('promises no month on the monthly row, in any language', async () => {
      for (const language of ['en', 'es', 'ru'] as const) {
        await sheOpensThePaywall(language);

        expect(screen.queryByTestId(planOfferTestID('monthly'))).toBeNull();
        expect(said(planLineTestID('monthly'))).toBe(said(planLineTestID('monthly')));
        expect(said(planLineTestID('monthly'))).not.toBe(said(planLineTestID('yearly')));
      }
    });

    it('drops the free month out of the button and the renewal line once she picks monthly', async () => {
      await sheOpensThePaywall();

      const yearly = { action: said(paywallActionTestID), renewal: said(paywallRenewalTestID) };

      await shePresses(planRowTestID('monthly'));

      expect(said(paywallActionTestID)).not.toBe(yearly.action);
      expect(said(paywallActionTestID)).toContain(theMonthlyPrice);
      expect(said(paywallRenewalTestID)).not.toBe(yearly.renewal);
      expect(said(paywallRenewalTestID)).toContain(theMonthlyPrice);
      expect(said(paywallRenewalTestID)).not.toContain(theYearlyPrice);
    });

    it('chooses the yearly plan for her, before she presses anything', async () => {
      await sheOpensThePaywall();

      expect(screen.getByTestId(planRowTestID('yearly')).props.accessibilityState).toEqual({
        checked: true,
      });
      expect(screen.getByTestId(planRowTestID('monthly')).props.accessibilityState).toEqual({
        checked: false,
      });
    });
  });

  describe('the states it lets her past', () => {
    it('lets her past exactly the states a write is allowed in, less the one it holds her on', () => {
      const allowed = theStatesSheCanBeIn.filter(
        (state) => !theStatesAWriteIsRefusedIn.includes(state),
      );

      expect(theStatesThatLetHerIn).toEqual(
        allowed.filter((state) => state !== THE_STATE_THE_PAYWALL_HOLDS),
      );
      expect(theStatesThatLetHerIn).toEqual(['freeMonth', 'paid', 'cancelling']);
    });

    it('holds a woman who never paid, and one the store refunded or let lapse', () => {
      for (const state of theStatesSheCanBeIn) {
        expect(sheIsPaidUp({ state, until: null, plan: null, transaction: null, readAt: '' })).toBe(
          theStatesThatLetHerIn.includes(state),
        );
      }

      expect(sheIsPaidUp(null)).toBe(false);
    });
  });

  describe('the way out', () => {
    it('draws no control that leaves the screen, so a purchase or a restore is the only way on', async () => {
      await sheOpensThePaywall();

      const presses = everythingThatTakesATouch();

      expect(presses.map(({ testID }) => testID).sort()).toEqual(
        [
          paywallActionTestID,
          paywallPrivacyTestID,
          paywallRestoreTestID,
          paywallTermsTestID,
          planRowTestID('monthly'),
          planRowTestID('yearly'),
        ].sort(),
      );
    });

    it('names each one of them as a plan, a purchase, a restore or a link, and nothing else', async () => {
      await sheOpensThePaywall();

      const roles = everythingThatTakesATouch();

      expect(roles).toHaveLength(6);
      expect(roles.every(({ role }) => ['radio', 'button', 'link'].includes(role))).toBe(true);
    });

    it('answers the hardware back of the phone, so the system does not take her off it', async () => {
      const held = jest.spyOn(BackHandler, 'addEventListener');

      await sheOpensThePaywall();

      const [event, answer] = held.mock.calls[0] ?? [];

      expect(event).toBe('hardwareBackPress');
      expect(answer?.({ timeStamp: 0, type: 'hardwareBackPress' })).toBe(true);
    });
  });

  describe('the two pages the links open', () => {
    it("opens Apple's own standard agreement for the terms", async () => {
      const { opened } = await sheOpensThePaywall();

      await shePresses(paywallTermsTestID);

      expect(opened).toEqual([THE_TERMS_OF_USE]);
    });

    it.each([
      ['en', 'https://myemi.app/en/privacy-policy/'],
      ['es', 'https://myemi.app/es/privacy-policy/'],
      ['ru', 'https://myemi.app/ru/privacy-policy/'],
    ])('opens the privacy policy in %s', async (language, address) => {
      const { opened } = await sheOpensThePaywall(language as Language);

      await shePresses(paywallPrivacyTestID);

      expect(opened).toEqual([address]);
    });
  });

  describe('she buys the yearly plan', () => {
    it('leaves her paid up, with the answer written where the launch read writes it', async () => {
      theStoreSells(aYearSheJustBought());
      theStoreHoldsTheseTransactions([aYearSheJustBought()]);

      const { database, paid } = await sheOpensThePaywall();

      await shePresses(paywallActionTestID);

      expect(paid).toHaveLength(1);
      expect(paid[0]?.state).toBe('paid');
      expect(theSettingTableHolds(database).read()?.state).toBe('paid');
      expect(theSettingTableHolds(database).read()?.transaction).toBe('the-first-one');
    });

    it('leaves her in the free month where the plan opens on the offer', async () => {
      theStoreSells(theFreeMonthSheJustStarted());
      theStoreHoldsTheseTransactions([theFreeMonthSheJustStarted()]);

      const { database, paid } = await sheOpensThePaywall();

      await shePresses(paywallActionTestID);

      expect(paid[0]?.state).toBe('freeMonth');
      expect(theSettingTableHolds(database).read()?.state).toBe('freeMonth');
    });

    it('presses for the product she chose and finishes the transaction before it reads the state', async () => {
      theStoreSells(aYearSheJustBought());
      theStoreHoldsTheseTransactions([aYearSheJustBought()]);

      await sheOpensThePaywall();
      await shePresses(paywallActionTestID);

      expect(thePressesOnTheStore()).toEqual([
        { request: { apple: { sku: theYearlyPlan.identifier } }, type: 'subs' },
      ]);
      expect(theTransactionsFinished()).toHaveLength(1);
      expect(whatTheLibraryWasAsked()).toEqual([
        'initConnection',
        'requestPurchase',
        'finishTransaction',
        'initConnection',
        'getAvailablePurchases',
      ]);
    });

    it('presses for the monthly product once she picks that row', async () => {
      theStoreSells(aTransactionTheStoreHolds(theMonthlyPlan.identifier));
      theStoreHoldsTheseTransactions([
        aTransactionTheStoreHolds(theMonthlyPlan.identifier, {
          expirationDateIOS: sheOpensItAt.getTime() + aMonth,
        }),
      ]);

      await sheOpensThePaywall();
      await shePresses(planRowTestID('monthly'));
      await shePresses(paywallActionTestID);

      expect(thePressesOnTheStore()).toEqual([
        { request: { apple: { sku: theMonthlyPlan.identifier } }, type: 'subs' },
      ]);
    });
  });

  describe('a purchase she stops herself', () => {
    it('leaves her on the paywall with nothing new on it', async () => {
      sheCancelsThePurchase();

      const alert = jest.spyOn(Alert, 'alert');
      const { database, paid } = await sheOpensThePaywall();
      const before = everyWordOnTheGlass();

      await shePresses(paywallActionTestID);

      expect(paid).toEqual([]);
      expect(alert).not.toHaveBeenCalled();
      expect(screen.getByTestId(paywallTestID)).toBeTruthy();
      expect(everyWordOnTheGlass()).toEqual(before);
      expect(theSettingTableHolds(database).read()).toBeNull();
    });

    it('takes a second press afterwards, because cancelling is an answer and not a fault', async () => {
      sheCancelsThePurchase();

      await sheOpensThePaywall();
      await shePresses(paywallActionTestID);

      theStoreSells(aYearSheJustBought());
      theStoreHoldsTheseTransactions([aYearSheJustBought()]);

      await shePresses(paywallActionTestID);

      expect(thePressesOnTheStore()).toHaveLength(2);
    });
  });

  describe('a purchase the store refuses', () => {
    it('shows one alert with one title, one line and one way to close it', async () => {
      theStoreRefusesThePurchase();

      const alert = jest.spyOn(Alert, 'alert');

      await sheOpensThePaywall();
      await shePresses(paywallActionTestID);

      expect(alert).toHaveBeenCalledTimes(1);

      const [title, line, actions] = alert.mock.calls[0] ?? [];

      expect(String(title).length).toBeGreaterThan(0);
      expect(String(line).length).toBeGreaterThan(0);
      expect(actions).toHaveLength(1);
    });

    it('leaves her on the paywall, with nothing written and no new screen', async () => {
      theStoreRefusesThePurchase();
      jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

      const { database, paid } = await sheOpensThePaywall();
      const before = everyWordOnTheGlass();

      await shePresses(paywallActionTestID);

      expect(paid).toEqual([]);
      expect(everyWordOnTheGlass()).toEqual(before);
      expect(theSettingTableHolds(database).read()).toBeNull();
    });
  });

  describe('Restore purchases', () => {
    it('asks the store once, and only when she presses', async () => {
      theStoreHoldsTheseTransactions([aYearSheJustBought()]);

      await sheOpensThePaywall();

      expect(theRestoresAskedFor()).toBe(0);

      await shePresses(paywallRestoreTestID);

      expect(theRestoresAskedFor()).toBe(1);
    });

    it('applies the answer the way the launch read applies it', async () => {
      theStoreHoldsTheseTransactions([aYearSheJustBought()]);

      const { database, paid } = await sheOpensThePaywall();

      await shePresses(paywallRestoreTestID);

      expect(paid[0]?.state).toBe('paid');
      expect(theSettingTableHolds(database).read()?.state).toBe('paid');
    });

    it('leaves her on the paywall where the store holds nothing of hers', async () => {
      theStoreHoldsTheseTransactions([]);

      const { paid } = await sheOpensThePaywall();

      await shePresses(paywallRestoreTestID);

      expect(paid).toEqual([]);
      expect(screen.getByTestId(paywallTestID)).toBeTruthy();
    });

    it('shows the alert where the store cannot be reached at all', async () => {
      theStoreRefusesTheRestore();

      const alert = jest.spyOn(Alert, 'alert');

      await sheOpensThePaywall();
      await shePresses(paywallRestoreTestID);

      expect(alert).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId(paywallTestID)).toBeTruthy();
    });
  });
});
