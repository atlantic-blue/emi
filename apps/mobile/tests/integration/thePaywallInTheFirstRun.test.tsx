import { join } from 'node:path';

import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { waitFor } from '@testing-library/react-native';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { profileRow } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import {
  accountEmailCodeFieldTestID,
  accountEmailCodeScreenTestID,
  accountEmailCodeSignInTestID,
} from '../../src/features/account/AccountEmailCode';
import {
  accountGateEmailTestID,
  accountGateScreenTestID,
  accountGateSendCodeTestID,
} from '../../src/features/account/AccountGate';
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
import { planOfferTestID } from '../../src/features/paywall/PlanRow';
import { identityRefreshItem } from '../../src/services/signIn/herSignIn';
import { theSettingTableHolds } from '../../src/services/store/theAnswerThePhoneHolds';
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
import { resetExpoSecureStore, setItemAsync } from '../fixtures/expoSecureStore';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { theCognitoSheReaches, theRightCode } from '../fixtures/theCognitoSheReaches';
import { herPhoneHoldsTheState } from '../fixtures/theSubscription';
import { sheTapsSaveAndStart } from '../fixtures/theSave';

jest.mock('expo-iap', () => jest.requireActual('../fixtures/expoIap'));
jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The end of the first run. She answers every question, her answers are written, and then Emi asks
 * her for an account and for money, in that order.
 *
 * Every case walks the real router through the real screens, so the order is the order the
 * application performs rather than the order a call was made in.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her first run reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';
const aYear = 365 * 24 * 60 * 60 * 1000;

const herAddress = 'julia@example.com';

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

/** An account she signed in to on this phone before, which the keychain is what holds. */
async function sheIsAlreadySignedIn(): Promise<void> {
  await setItemAsync(
    identityRefreshItem,
    JSON.stringify({
      way: 'email',
      address: herAddress,
      since: '2026-05-01',
      refreshToken: 'a-refresh-token-made-up-for-the-test',
    }),
  );
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

/** The address, the code the stand in for the pool takes, and the account she is left with. */
async function sheSignsIn(): Promise<void> {
  await act(async () => {
    await fireEvent.changeText(screen.getByTestId(accountGateEmailTestID), herAddress);
  });
  await shePresses(accountGateSendCodeTestID);
  await screen.findByTestId(accountEmailCodeScreenTestID);
  await act(async () => {
    await fireEvent.changeText(screen.getByTestId(accountEmailCodeFieldTestID), theRightCode);
  });
  await shePresses(accountEmailCodeSignInTestID);
}

interface ADrawnNode {
  readonly type?: string;
  readonly props?: Record<string, unknown>;
  readonly children?: readonly unknown[];
}

/**
 * Whether the navigator refuses a swipe back off the screen that carries this test identifier.
 *
 * A swipe is the navigator's to refuse, so the answer is read off the screen the body sits inside
 * and never off the body itself. The innermost screen holding it is the one she swipes.
 */
function theScreenHoldingRefusesTheSwipe(testID: string): boolean {
  const refusals: boolean[] = [];
  const holdsIt = (node: unknown): boolean => {
    if (node === null || typeof node !== 'object') {
      return false;
    }

    const one = node as ADrawnNode;
    const inside = (one.children ?? []).map(holdsIt).includes(true);

    if (inside && one.type === 'RNSScreen') {
      refusals.push(one.props?.gestureEnabled === false);
    }

    return inside || one.props?.testID === testID;
  };

  holdsIt(screen.toJSON());

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
    theCognitoSheReaches();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the order of the last three screens', () => {
    it('asks for an account after the last question, with her answers already written', async () => {
      theTourIsBehindHer();
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();

      expect(app.pathname()).toBe('/onboarding/sign-in');
      expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
      expect(whatHerPhoneHolds()).toEqual({
        days: [herPeriodStarted],
        hasAnswers: true,
        firstRunFinishedAt: whenSheOpensIt.toISOString(),
      });
    });

    it('asks for money once she has an account', async () => {
      theTourIsBehindHer();
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();
      await sheSignsIn();

      await waitFor(() => {
        expect(app.pathname()).toBe('/onboarding/paywall');
      });
      expect(screen.getByTestId(paywallTestID)).toBeTruthy();
      expect(await screen.findByTestId(paywallActionTestID)).toBeTruthy();
      expect(screen.getByTestId(paywallRestoreTestID)).toBeTruthy();
    });

    it('takes a woman who already has an account straight to the paywall', async () => {
      theTourIsBehindHer();
      await sheIsAlreadySignedIn();
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();

      expect(app.pathname()).toBe('/onboarding/paywall');
      expect(screen.queryByTestId(accountGateScreenTestID)).toBeNull();
    });

    it('offers her the free month, because she has never paid', async () => {
      theTourIsBehindHer();
      await sheIsAlreadySignedIn();
      await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();
      await screen.findByTestId(paywallActionTestID);

      expect(screen.getByTestId(planOfferTestID('yearly'))).toBeTruthy();
    });

    it('refuses a swipe back off the sign in and off the paywall', async () => {
      theTourIsBehindHer();
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();

      expect(theScreenHoldingRefusesTheSwipe(accountGateScreenTestID)).toBe(true);

      await sheSignsIn();
      await waitFor(() => {
        expect(app.pathname()).toBe('/onboarding/paywall');
      });

      expect(theScreenHoldingRefusesTheSwipe(paywallTestID)).toBe(true);
    });

    it('asks her for nothing where the write refused, and holds her on the save', async () => {
      theTourIsBehindHer();
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();
      // The day goes in before her answers do, so a profile table that is not there stops the
      // write after the first row. Nothing may be written, and nothing may be asked of her.
      herDatabase().execute('DROP TABLE profile');

      await sheTapsSaveAndStart();

      expect(app.pathname()).toBe('/onboarding/hold');
      expect(screen.queryByTestId(accountGateScreenTestID)).toBeNull();
      expect(screen.queryByTestId(paywallTestID)).toBeNull();
      expect(screen.getByTestId(saveRefusedTestID)).toHaveTextContent(firstRunCopy.start.refused);
      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();
    });
  });

  describe('the way past the tour', () => {
    it('reaches the questions, and then the sign in', async () => {
      migrate(herDatabase());
      const app = await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await shePresses(tourSkipTestID);

      expect(app.pathname()).toBe('/onboarding/name');

      await sheAnswersEveryQuestionOfTheFirstRun();
      await sheTapsSaveAndStart();

      expect(app.pathname()).toBe('/onboarding/sign-in');
    });
  });

  describe('the two ways off the paywall', () => {
    it('leaves it for the home screen when she buys the year', async () => {
      theTourIsBehindHer();
      await sheIsAlreadySignedIn();
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

    it('leaves it for the home screen when she restores the year she owns', async () => {
      theTourIsBehindHer();
      await sheIsAlreadySignedIn();
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
        herPhoneHoldsTheState(herDatabase(), state, whenSheOpensIt);
        const app = await sheOpensEmi();

        await sheAnswersEveryQuestionOfTheFirstRun();
        await sheTapsSaveAndStart();

        expect(app.pathname()).toBe('/');
        expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
        expect(screen.queryByTestId(paywallTestID)).toBeNull();
        expect(screen.queryByTestId(accountGateScreenTestID)).toBeNull();
      },
    );

    it.each(theStatesAWriteIsRefusedIn)('is asked to pay in the %s state', async (state) => {
      theTourIsBehindHer();
      await sheIsAlreadySignedIn();
      theStoreCannotBeReached();
      herPhoneHoldsTheState(herDatabase(), state, whenSheOpensIt);
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
});
