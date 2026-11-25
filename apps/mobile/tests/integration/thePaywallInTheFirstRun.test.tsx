import { join } from 'node:path';

import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { waitFor } from '@testing-library/react-native';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { profileRow } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import { saveRefusedTestID } from '../../src/features/onboarding/SaveAndStart';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import { tourSkipTestID } from '../../src/features/onboarding/TourScreen';
import { firstRunCopy } from '../../src/features/onboarding/copy';
import {
  paywallActionTestID,
  paywallRestoreTestID,
  paywallTestID,
} from '../../src/features/paywall/Paywall';
import { theSettingTableHolds } from '../../src/services/store/theAnswerThePhoneHolds';
import type { WhatSheIsEntitledTo } from '../../src/services/store/theEntitlement';
import { theMonthlyPlan, theYearlyPlan } from '../../src/services/store/theProducts';
import { theStatesThatLetHerIn } from '../../src/services/store/thePurchase';
import { theStatesAWriteIsRefusedIn } from '../../src/services/store/theWriteGate';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import {
  aProductTheStoreHolds,
  aTransactionTheStoreHolds,
  theStoreCannotBeReached,
  theStoreHolds,
  theStoreHoldsTheseTransactions,
  theStoreSells,
  theStoreStartsAgain,
  thePressesStartAgain,
  theTransactionsStartAgain,
} from '../fixtures/expoIap';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../fixtures/herPhone';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheTapsSaveAndStart } from '../fixtures/theSave';

jest.mock('expo-iap', () => jest.requireActual('../fixtures/expoIap'));
jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The end of the first run. She answers every question, her answers are written, and then Emi asks
 * her to pay for it.
 *
 * Every case walks the real router through the real screens, so the order of the write and the
 * paywall is the order the application performs rather than the order a call was made in.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her first run reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const herPeriodStarted = '2026-05-09';
const aYear = 365 * 24 * 60 * 60 * 1000;

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): Database {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());

  return database;
}

/** What the store quotes for the two plans, so the paywall draws a row for each of them. */
function theStoreQuotesBothPlans(): void {
  theStoreHolds([
    aProductTheStoreHolds(theYearlyPlan.identifier, '39 euros'),
    aProductTheStoreHolds(theMonthlyPlan.identifier, '5 euros'),
  ]);
}

/** The yearly subscription, as the store describes one she is paying for. */
function aYearSheIsPayingFor(): ReturnType<typeof aTransactionTheStoreHolds> {
  return aTransactionTheStoreHolds(theYearlyPlan.identifier, {
    expirationDateIOS: whenSheOpensIt.getTime() + aYear,
    originalTransactionIdentifierIOS: 'the-first-one',
  });
}

/** One of the states the App Store can leave her in, held on the phone the way a launch holds it. */
function herPhoneHoldsTheState(state: WhatSheIsEntitledTo): void {
  theSettingTableHolds(herDatabase()).hold({
    state,
    until: new Date(whenSheOpensIt.getTime() + aYear).toISOString(),
    plan: theYearlyPlan.identifier,
    transaction: 'the-first-one',
    readAt: whenSheOpensIt.toISOString(),
  });
}

interface OpenApp {
  readonly pathname: () => string;
}

async function sheOpensEmi(): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname() };
}

/** Every question answered, which leaves her looking at Save and start. */
async function sheAnswersEveryQuestionOfTheFirstRun(): Promise<void> {
  await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
}

async function shePresses(testID: string): Promise<void> {
  await act(async () => {
    await fireEvent.press(screen.getByTestId(testID));
  });
}

interface ADrawnNode {
  readonly type?: string;
  readonly props?: Record<string, unknown>;
  readonly children?: readonly unknown[];
}

/**
 * Whether the navigator refuses a swipe back off the screen the paywall is drawn on.
 *
 * A swipe is the navigator's to refuse, so the answer is read off the screen the paywall sits
 * inside and never off the paywall itself. The innermost screen holding it is the one she swipes.
 */
function theScreenThePaywallSitsOnRefusesTheSwipe(): boolean {
  const refusals: boolean[] = [];
  const holdsThePaywall = (node: unknown): boolean => {
    if (node === null || typeof node !== 'object') {
      return false;
    }

    const one = node as ADrawnNode;
    const inside = (one.children ?? []).map(holdsThePaywall).includes(true);

    if (inside && one.type === 'RNSScreen') {
      refusals.push(one.props?.gestureEnabled === false);
    }

    return inside || one.props?.testID === paywallTestID;
  };

  holdsThePaywall(screen.toJSON());

  return refusals[0] === true;
}

/** What the first run wrote, read as rows rather than through her key. */
function whatHerPhoneHolds(): {
  readonly days: readonly string[];
  readonly hasAnswers: boolean;
  readonly firstRunFinishedAt: string | undefined;
} {
  const database = herDatabase();

  return {
    days: listDayLogs(database).map((row) => row.day),
    hasAnswers: profileRow(database) !== undefined,
    firstRunFinishedAt: readSetting(database, 'firstRunCompletedAt'),
  };
}

describe('the paywall in the first run', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theStoreStartsAgain();
    theTransactionsStartAgain();
    thePressesStartAgain();
    theStoreQuotesBothPlans();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('where it sits', () => {
    it('asks her to pay after the last question, with her answers already written', async () => {
      theTourIsBehindHer();
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();

      expect(app.pathname()).toBe('/onboarding/paywall');
      expect(screen.getByTestId(paywallTestID)).toBeTruthy();
      expect(whatHerPhoneHolds()).toEqual({
        days: [herPeriodStarted],
        hasAnswers: true,
        firstRunFinishedAt: whenSheOpensIt.toISOString(),
      });
    });

    it('draws a row for each plan the store quotes, and a way to restore one she owns', async () => {
      theTourIsBehindHer();
      await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();

      expect(await screen.findByTestId(paywallActionTestID)).toBeTruthy();
      expect(screen.getByTestId(paywallRestoreTestID)).toBeTruthy();
    });

    it('refuses a swipe back off it, so her answers are not the way out', async () => {
      theTourIsBehindHer();
      await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();

      expect(theScreenThePaywallSitsOnRefusesTheSwipe()).toBe(true);
    });

    it('shows her no paywall where the write refused, and holds her on the save', async () => {
      theTourIsBehindHer();
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      // The day goes in before her answers do, so a profile table that is not there stops the
      // write after the first row. Nothing may be written and nothing may be sold.
      herDatabase().execute('DROP TABLE profile');

      await sheTapsSaveAndStart();

      expect(app.pathname()).toBe('/onboarding/hold');
      expect(screen.queryByTestId(paywallTestID)).toBeNull();
      expect(screen.getByTestId(saveRefusedTestID)).toHaveTextContent(firstRunCopy.start.refused);
      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();
    });
  });

  describe('the way past the tour', () => {
    it('reaches the questions, and then the paywall', async () => {
      migrate(herDatabase());
      const app = await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await shePresses(tourSkipTestID);

      expect(app.pathname()).toBe('/onboarding/name');

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();

      expect(app.pathname()).toBe('/onboarding/paywall');
      expect(screen.getByTestId(paywallTestID)).toBeTruthy();
    });
  });

  describe('the two ways off it', () => {
    it('leaves the paywall for the home screen when she buys the year', async () => {
      theTourIsBehindHer();
      theStoreSells(aYearSheIsPayingFor());
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();
      await screen.findByTestId(paywallActionTestID);
      // The store holds the year from the press onwards, which is what it holds in life: nothing
      // of hers before she pressed, and the subscription afterwards.
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      await shePresses(paywallActionTestID);

      await waitFor(() => {
        expect(app.pathname()).toBe('/');
      });
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(theSettingTableHolds(herDatabase()).read()?.state).toBe('paid');
    });

    it('leaves the paywall for the home screen when she restores the year she owns', async () => {
      theTourIsBehindHer();
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();
      await screen.findByTestId(paywallRestoreTestID);
      // The year she bought on another phone, which the store names once it is asked to restore.
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);

      await shePresses(paywallRestoreTestID);

      await waitFor(() => {
        expect(app.pathname()).toBe('/');
      });
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });
  });

  describe('a woman the App Store already pays for', () => {
    it.each(theStatesThatLetHerIn)(
      'goes from the last question to the home screen in the %s state',
      async (state) => {
        theTourIsBehindHer();
        theStoreCannotBeReached();
        herPhoneHoldsTheState(state);
        const app = await sheOpensEmi();

        await sheAnswersEveryQuestionOfTheFirstRun();
        await sheTapsSaveAndStart();

        expect(app.pathname()).toBe('/');
        expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
        expect(screen.queryByTestId(paywallTestID)).toBeNull();
      },
    );

    it.each(theStatesAWriteIsRefusedIn)('asks her to pay in the %s state', async (state) => {
      theTourIsBehindHer();
      theStoreCannotBeReached();
      herPhoneHoldsTheState(state);
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();

      expect(app.pathname()).toBe('/onboarding/paywall');
    });

    it('installs Emi again with the year she owns and never reads the paywall', async () => {
      theTourIsBehindHer();
      theStoreHoldsTheseTransactions([aYearSheIsPayingFor()]);
      const app = await sheOpensEmi();

      await waitFor(() => {
        expect(theSettingTableHolds(herDatabase()).read()?.state).toBe('paid');
      });

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();

      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });
  });

  describe('a woman whose first run is already behind her', () => {
    it('opens Emi on the home screen, with nothing held about a subscription', async () => {
      await herPhoneHolds(whenSheOpensIt, [aBleedingDay(today)]);
      theStoreCannotBeReached();
      const app = await sheOpensEmi();

      expect(theSettingTableHolds(herDatabase()).read()).toBeNull();
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(paywallTestID)).toBeNull();
    });
  });
});
