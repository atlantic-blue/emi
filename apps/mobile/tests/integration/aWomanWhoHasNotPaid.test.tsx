import { join } from 'node:path';

import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { waitFor } from '@testing-library/react-native';

import type { Database } from '../../src/data/database';
import { listDayLogs } from '../../src/data/dayLogRepository';
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
import {
  exportActionTestID,
  exportBackTestID,
  exportScreenTestID,
} from '../../src/features/export/ExportScreen';
import { exportFileStem } from '../../src/features/export/files';
import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import {
  paywallDeleteTestID,
  paywallExportTestID,
  paywallRenewalTestID,
  paywallRestoreTestID,
  paywallTestID,
} from '../../src/features/paywall/Paywall';
import {
  planLineTestID,
  planOfferTestID,
  planPriceTestID,
} from '../../src/features/paywall/PlanRow';
import { deleteBackTestID, deleteScreenTestID } from '../../src/features/settings/DeleteEverything';
import { identityRefreshItem } from '../../src/services/signIn/herSignIn';
import type { WhatSheIsEntitledTo } from '../../src/services/store/theEntitlement';
import { theMonthlyPlan, theYearlyPlan } from '../../src/services/store/theProducts';
import { theStatesThatLetHerIn } from '../../src/services/store/thePurchase';
import { theStatesAWriteIsRefusedIn } from '../../src/services/store/theWriteGate';
import { resetExpoSqlite } from '../data/expoSqlite';
import {
  aProductTheStoreHolds,
  aTransactionTheStoreHolds,
  theFreeMonthOffer,
  theStoreCannotSayWhatSheHolds,
  theStoreHolds,
  theStoreHoldsTheseTransactions,
  theStoreStartsAgain,
  thePressesStartAgain,
  theTransactionsStartAgain,
} from '../fixtures/expoIap';
import { fileOnThePhone, resetExpoFileSystem } from '../fixtures/expoFileSystem';
import { resetExpoSecureStore, setItemAsync } from '../fixtures/expoSecureStore';
import { resetExpoSharing } from '../fixtures/expoSharing';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { visibleTextIn } from '../fixtures/renderedText';
import { theCognitoSheReaches, theRightCode } from '../fixtures/theCognitoSheReaches';
import {
  theBoardOfThePaywallAfterALapse,
  theWordsTheBoardWrites,
  wordsMissingFromTheScreen,
} from '../fixtures/theBoardOfThePaywall';
import {
  herPhoneHoldsTheState,
  herPhoneKnowsNothingAboutHerSubscription,
} from '../fixtures/theSubscription';
import { theScreenIn } from '../fixtures/theSafeArea';

jest.mock('expo-iap', () => jest.requireActual('../fixtures/expoIap'));
jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));
jest.mock('expo-file-system', () => jest.requireActual('../fixtures/expoFileSystem'));
jest.mock('expo-sharing', () => jest.requireActual('../fixtures/expoSharing'));

/**
 * Emi has no free content, so a woman who has not paid reaches the sign in, the paywall, and for a
 * woman who paid before, her export and her delete. She reaches nothing else, whatever her phone
 * holds and whatever screen Emi opens on.
 *
 * Every case opens the real router on a phone that already finished its first run, which is every
 * woman on a build today.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const herCycleLengthDays = 28;

const herAddress = 'julia@example.com';

/** What the board was drawn with, so the sentences on the glass are the sentences on the board. */
const theYearlyPrice = '39 euros';
const theMonthlyPrice = '5 euros';

function theStoreQuotesBothPlans(): void {
  theStoreHolds([
    aProductTheStoreHolds(theYearlyPlan.identifier, theYearlyPrice),
    aProductTheStoreHolds(theMonthlyPlan.identifier, theMonthlyPrice),
  ]);
}

const aMonth = 30 * 24 * 60 * 60 * 1000;
const aYear = 365 * 24 * 60 * 60 * 1000;
const aDay = 24 * 60 * 60 * 1000;

/** The yearly subscription the store holds for her, as each state leaves it. */
function whatTheStoreHoldsIn(
  state: WhatSheIsEntitledTo,
): readonly ReturnType<typeof aTransactionTheStoreHolds>[] {
  const started = whenSheOpensIt.getTime();
  const aYearly = (
    these: Partial<Parameters<typeof aTransactionTheStoreHolds>[1]>,
  ): ReturnType<typeof aTransactionTheStoreHolds> =>
    aTransactionTheStoreHolds(theYearlyPlan.identifier, {
      originalTransactionIdentifierIOS: 'the-first-one',
      ...these,
    });

  switch (state) {
    case 'neverPaid':
      return [];
    case 'freeMonth':
      return [aYearly({ expirationDateIOS: started + aMonth, offerIOS: theFreeMonthOffer() })];
    case 'paid':
      return [aYearly({ expirationDateIOS: started + aYear })];
    case 'cancelling':
      return [aYearly({ expirationDateIOS: started + aYear, isAutoRenewing: false })];
    case 'lapsed':
      return [aYearly({ expirationDateIOS: started - aDay })];
    case 'refunded':
      return [aYearly({ expirationDateIOS: started - aDay, revocationDateIOS: started - aDay })];
  }
}

/**
 * Her phone with the first run behind her and one day on it, in one of the states the App Store
 * can leave her in.
 *
 * The row the launch read writes is held and the store is set to the transactions that work that
 * same state out, so the read the application makes agrees with the row rather than replacing it.
 * A phone that knows nothing is a store that answered the plans and would not say what she holds.
 */
async function herPhoneIsIn(state: WhatSheIsEntitledTo | 'nothingIsKnownYet'): Promise<Database> {
  await herPhoneHolds(whenSheOpensIt, [aBleedingDay(today)], herCycleLengthDays);

  const database = herDatabase();

  if (state === 'nothingIsKnownYet') {
    herPhoneKnowsNothingAboutHerSubscription(database);
    theStoreCannotSayWhatSheHolds();

    return database;
  }

  herPhoneHoldsTheState(database, state, whenSheOpensIt);
  theStoreHoldsTheseTransactions(whatTheStoreHoldsIn(state));

  return database;
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

async function sheOpensEmi(at = '/'): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: at });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await act(async () => {
    await fireEvent.press(screen.getByTestId(testID));
  });
}

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

function said(testID: string): string {
  return visibleTextIn(screen.getByTestId(testID)).join(' ');
}

function everyWordOnTheGlass(): string[] {
  return visibleTextIn(theScreenIn({ toJSON: () => screen.toJSON() }));
}

describe('a woman who has not paid reaches nothing but the way to paying', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    resetExpoFileSystem();
    resetExpoSharing();
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

  describe('the state her phone holds decides where she lands', () => {
    const theStatesSheIsHeldIn: readonly (WhatSheIsEntitledTo | 'nothingIsKnownYet')[] = [
      'nothingIsKnownYet',
      'neverPaid',
      ...theStatesAWriteIsRefusedIn,
    ];

    it.each(theStatesSheIsHeldIn)('sends her to the sign in in the %s state', async (state) => {
      await herPhoneIsIn(state);
      const app = await sheOpensEmi();

      await waitFor(() => {
        expect(app.pathname()).toBe('/onboarding/sign-in');
      });
      expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(homeScreenTestID)).toBeNull();
    });

    it.each(theStatesSheIsHeldIn)(
      'sends her to the paywall in the %s state once she has an account',
      async (state) => {
        await herPhoneIsIn(state);
        await sheIsAlreadySignedIn();
        const app = await sheOpensEmi();

        await waitFor(() => {
          expect(app.pathname()).toBe('/onboarding/paywall');
        });
        expect(screen.getByTestId(paywallTestID)).toBeTruthy();
        expect(screen.queryByTestId(homeScreenTestID)).toBeNull();
      },
    );

    it.each(theStatesThatLetHerIn)('opens her home screen in the %s state', async (state) => {
      await herPhoneIsIn(state);
      const app = await sheOpensEmi();

      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(paywallTestID)).toBeNull();
      expect(screen.queryByTestId(accountGateScreenTestID)).toBeNull();
    });

    it('sends her to the paywall from the day a notification would open', async () => {
      await herPhoneIsIn('lapsed');
      await sheIsAlreadySignedIn();
      const app = await sheOpensEmi('/log');

      await waitFor(() => {
        expect(app.pathname()).toBe('/onboarding/paywall');
      });
    });

    it('takes her from the sign in to the paywall when she signs in there', async () => {
      await herPhoneIsIn('neverPaid');
      const app = await sheOpensEmi();

      await waitFor(() => {
        expect(app.pathname()).toBe('/onboarding/sign-in');
      });

      await sheSignsIn();

      await waitFor(() => {
        expect(app.pathname()).toBe('/onboarding/paywall');
      });
    });
  });

  describe('the paywall she reads after a lapse', () => {
    it('promises no free month, on the row, on the button or under it', async () => {
      await herPhoneIsIn('lapsed');
      await sheIsAlreadySignedIn();
      await sheOpensEmi();
      await screen.findByTestId(paywallRenewalTestID);

      expect(screen.queryByTestId(planOfferTestID('yearly'))).toBeNull();
      expect(said(planPriceTestID('yearly'))).toContain(theYearlyPrice);
      expect(said(planLineTestID('yearly'))).toBe(`${theYearlyPrice} today, then every year.`);
      expect(said(paywallRenewalTestID)).toBe(
        `${theYearlyPrice} today, then ${theYearlyPrice} every year until you cancel. ` +
          'You cancel in your App Store settings.',
      );
    });

    it('writes every sentence of the board it was approved as, in that order', async () => {
      await herPhoneIsIn('refunded');
      await sheIsAlreadySignedIn();
      await sheOpensEmi();
      await screen.findByTestId(paywallRenewalTestID);

      const board = theWordsTheBoardWrites(theBoardOfThePaywallAfterALapse);

      expect(board.length).toBeGreaterThan(10);
      expect(wordsMissingFromTheScreen(board, everyWordOnTheGlass())).toEqual([]);
    });

    it('offers her a restore, because the year she owns may be on another phone', async () => {
      await herPhoneIsIn('lapsed');
      await sheIsAlreadySignedIn();
      await sheOpensEmi();

      expect(await screen.findByTestId(paywallRestoreTestID)).toBeTruthy();
    });
  });

  describe('her own records, reached from the paywall after a lapse', () => {
    it('exports the days she wrote and comes back to the paywall', async () => {
      await herPhoneIsIn('lapsed');
      await sheIsAlreadySignedIn();
      const app = await sheOpensEmi();
      await screen.findByTestId(paywallExportTestID);

      await shePresses(paywallExportTestID);

      expect(app.pathname()).toBe('/export');
      expect(screen.getByTestId(exportScreenTestID)).toBeTruthy();

      await shePresses(exportActionTestID);

      expect(JSON.parse(fileOnThePhone(`${exportFileStem(whenSheOpensIt)}.json`))).toMatchObject({
        tables: { day_log: [{ day: today }] },
      });

      await shePresses(exportBackTestID);

      await waitFor(() => {
        expect(app.pathname()).toBe('/onboarding/paywall');
      });
      expect(screen.getByTestId(paywallTestID)).toBeTruthy();
    });

    it('opens the delete and comes back to the paywall with her days still there', async () => {
      await herPhoneIsIn('lapsed');
      await sheIsAlreadySignedIn();
      const app = await sheOpensEmi();
      await screen.findByTestId(paywallDeleteTestID);

      await shePresses(paywallDeleteTestID);

      expect(app.pathname()).toBe('/settings/delete');
      expect(screen.getByTestId(deleteScreenTestID)).toBeTruthy();

      await shePresses(deleteBackTestID);

      await waitFor(() => {
        expect(app.pathname()).toBe('/onboarding/paywall');
      });
      expect(screen.getByTestId(paywallTestID)).toBeTruthy();
      expect(listDayLogs(herDatabase()).map((row) => row.day)).toEqual([today]);
    });

    it('offers neither on the board a woman who never paid reads', async () => {
      await herPhoneIsIn('neverPaid');
      await sheIsAlreadySignedIn();
      await sheOpensEmi();
      await screen.findByTestId(paywallRestoreTestID);

      expect(screen.queryByTestId(paywallExportTestID)).toBeNull();
      expect(screen.queryByTestId(paywallDeleteTestID)).toBeNull();
    });
  });
});
