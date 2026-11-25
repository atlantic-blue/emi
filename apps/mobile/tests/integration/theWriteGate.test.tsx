import { join } from 'node:path';

import { addDays } from '@emi/cycle';
import { tabTestID } from '@emi/ui';
import { waitFor } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { Database } from '../../src/data/database';
import { listDayLogs, readDayLog } from '../../src/data/dayLogRepository';
import {
  exportActionTestID,
  exportHeldTestID,
  exportScreenTestID,
} from '../../src/features/export/ExportScreen';
import { exportFileStem } from '../../src/features/export/files';
import { dayParameter } from '../../src/features/calendar/askedMonth';
import { editPeriodSaveTestID } from '../../src/features/calendar/EditPeriodScreen';
import { flowOptionTestID } from '../../src/features/log/FlowPicker';
import { logFlowTestID } from '../../src/features/log/LogFlow';
import {
  deleteActionTestID,
  deletedScreenTestID,
} from '../../src/features/settings/DeleteEverything';
import { paywallDeleteTestID, paywallExportTestID } from '../../src/features/paywall/Paywall';
import { identityRefreshItem } from '../../src/services/signIn/herSignIn';
import { theSettingTableHolds } from '../../src/services/store/theAnswerThePhoneHolds';
import type { WhatSheIsEntitledTo } from '../../src/services/store/theEntitlement';
import { theStatesSheCanBeIn } from '../../src/services/store/theEntitlement';
import { theYearlyPlan } from '../../src/services/store/theProducts';
import {
  aWriteIsAllowedIn,
  theStatesAWriteIsRefusedIn,
} from '../../src/services/store/theWriteGate';
import { rowsHeld } from '../../src/services/vault/wipe';
import { resetExpoSqlite } from '../data/expoSqlite';
import { fileOnThePhone, resetExpoFileSystem } from '../fixtures/expoFileSystem';
import { theStoreCannotBeReached, theStoreStartsAgain } from '../fixtures/expoIap';
import { resetExpoSecureStore, setItemAsync } from '../fixtures/expoSecureStore';
import { resetExpoSharing } from '../fixtures/expoSharing';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { herPhoneKnowsNothingAboutHerSubscription } from '../fixtures/theSubscription';
import { herVault } from '../fixtures/herVault';

jest.mock('expo-iap', () => jest.requireActual('../fixtures/expoIap'));
jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));
jest.mock('expo-file-system', () => jest.requireActual('../fixtures/expoFileSystem'));
jest.mock('expo-sharing', () => jest.requireActual('../fixtures/expoSharing'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** The flow she taps on the log, which is a flow she has never given this day. */
const theFlowSheTaps = 'light';

/** The tab she presses in the dock, named as the navigator names the screen it reaches. */
const theLogTab = 'log/index';

const herCycleLengthDays = 28;
const herPeriodLengthDays = 3;

/**
 * Three periods behind her, the newest five days ago, so the history has two complete cycles to
 * draw and the export has days to carry. None of them is today, so the gate alone decides every
 * write the cases below make.
 */
const herPeriodStarts: readonly string[] = [2, 1, 0].map((back) =>
  addDays(addDays(today, -5), -back * herCycleLengthDays),
);

const herRecordedDays: readonly string[] = herPeriodStarts.flatMap((start) =>
  Array.from({ length: herPeriodLengthDays }, (_unused, day) => addDays(start, day)),
);

/** An earlier day she already wrote, which is the day the edit cases reopen. */
const theDaySheCorrects = herRecordedDays[herRecordedDays.length - 1] as string;

/** The first day of her newest period, which is where the period editor opens. */
const herNewestPeriodStarted = herPeriodStarts[herPeriodStarts.length - 1] as string;

async function sheOpensEmi(at = '/'): Promise<{ readonly pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: at });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** An account she signed in to on this phone before, which the keychain is what holds. */
async function sheIsAlreadySignedIn(): Promise<void> {
  await setItemAsync(
    identityRefreshItem,
    JSON.stringify({
      way: 'email',
      address: 'julia@example.com',
      since: '2026-05-01',
      refreshToken: 'a-refresh-token-made-up-for-the-test',
    }),
  );
}

/**
 * Her phone, in one of the states the App Store can leave her in.
 *
 * Her days are seeded before the state is held, because seeding writes them through the same path
 * the screens write through, and that path asks the gate.
 *
 * The store is away for the whole of this file, so the read on launch leaves the held row exactly
 * as this sets it. The gate is held to what the phone holds, which is the whole point of holding
 * it: an answer that needed the store would refuse a woman on a train.
 */
async function herPhoneIsIn(state: WhatSheIsEntitledTo | 'nothingIsKnownYet'): Promise<Database> {
  await herPhoneHolds(whenSheOpensIt, herRecordedDays.map(aBleedingDay), herCycleLengthDays);

  const database = herDatabase();

  if (state === 'nothingIsKnownYet') {
    herPhoneKnowsNothingAboutHerSubscription(database);
  } else {
    theSettingTableHolds(database).hold({
      state,
      until: new Date(whenSheOpensIt.getTime() + 60 * 1000).toISOString(),
      plan: theYearlyPlan.identifier,
      transaction: 'the-first-one',
      readAt: whenSheOpensIt.toISOString(),
    });
  }

  return database;
}

/** The log tab, pressed in the dock, and one tap on a flow: the shortest write she can make. */
async function sheTapsToLogADay(): Promise<void> {
  await shePresses(tabTestID(theLogTab));
  await shePresses(flowOptionTestID(theFlowSheTaps));
}

/** What a day holds, opened under her own key, and nothing where no record of it exists. */
function theRecordOf(day: string): Record<string, unknown> | undefined {
  const row = readDayLog(herDatabase(), day);

  return row === undefined
    ? undefined
    : (herVault().open(row.payload) as unknown as Record<string, unknown>);
}

/** Every day the table holds, so a refused write can be read as no row rather than as no flow. */
function theDaysOnHerPhone(): readonly string[] {
  return listDayLogs(herDatabase()).map((row) => row.day);
}

/** The days the export carries, read out of the file the press wrote on her phone. */
function theDaysTheExportCarries(): readonly string[] {
  const written = fileOnThePhone(`${exportFileStem(whenSheOpensIt)}.json`);
  const file = JSON.parse(written) as {
    readonly tables: Record<string, readonly { readonly day?: string }[]>;
  };

  return (file.tables.day_log ?? []).flatMap((row) => (row.day === undefined ? [] : [row.day]));
}

describe('the write gate on the phone', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    theStoreStartsAgain();
    theStoreCannotBeReached();
    resetExpoSqlite();
    resetExpoSecureStore();
    resetExpoFileSystem();
    resetExpoSharing();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the states the gate is written against', () => {
    it('refuses a write in the lapsed state and in the refunded state, and in no other', () => {
      expect([...theStatesAWriteIsRefusedIn]).toEqual(['lapsed', 'refunded']);
      expect(theStatesSheCanBeIn.filter((state) => !aWriteIsAllowedIn(state))).toEqual([
        'lapsed',
        'refunded',
      ]);
    });

    it('allows a write where nobody has worked an answer out yet, so a test build keeps writing', () => {
      expect(aWriteIsAllowedIn(null)).toBe(true);
      expect(aWriteIsAllowedIn('neverPaid')).toBe(true);
    });
  });

  describe('she taps to log a day while she is paying', () => {
    it.each(['freeMonth', 'paid', 'cancelling'] as const)(
      'writes the day and shows her the flow she tapped, in the %s state',
      async (state) => {
        await herPhoneIsIn(state);
        await sheOpensEmi();

        await sheTapsToLogADay();

        expect(theRecordOf(today)?.flow).toBe(theFlowSheTaps);
        expect(screen.getByTestId(flowOptionTestID(theFlowSheTaps))).toBeChecked();
      },
    );
  });

  /**
   * The gate allows a write in these two states, and nothing reaches it to ask: Emi has no free
   * content, so the way to paying stands in front of every screen that writes. The allowance is
   * what keeps the first run writing her answers, which is the one write that happens in front of
   * the paywall.
   */
  describe('she has no answer about money on the phone', () => {
    it.each(['neverPaid', 'nothingIsKnownYet'] as const)(
      'is on the way to paying rather than on the log, in the %s state',
      async (state) => {
        await herPhoneIsIn(state);
        const app = await sheOpensEmi();

        await waitFor(() => {
          expect(app.pathname()).toBe('/onboarding/sign-in');
        });
        expect(screen.queryByTestId(logFlowTestID)).toBeNull();
        expect(theDaysOnHerPhone()).toEqual([...herRecordedDays]);
      },
    );
  });

  /**
   * Two gates stand in front of a write once the money stops, and each one is enough on its own.
   * The paywall takes her off every screen that writes, and the gate below it refuses the write a
   * screen would make. A day she already wrote is left exactly as it was either way.
   */
  describe('she reaches no write at all after the money stopped', () => {
    it.each(['lapsed', 'refunded'] as const)(
      'is on the paywall rather than on the log, in the %s state',
      async (state) => {
        await herPhoneIsIn(state);
        const app = await sheOpensEmi();

        await waitFor(() => {
          expect(app.pathname()).toBe('/onboarding/sign-in');
        });
        expect(screen.queryByTestId(logFlowTestID)).toBeNull();
        expect(theRecordOf(today)).toBeUndefined();
        expect(theDaysOnHerPhone()).toEqual([...herRecordedDays]);
      },
    );

    it.each([
      [
        'the editor of a whole period',
        `/calendar/period?${dayParameter}=${herNewestPeriodStarted}`,
      ],
      ['a day she already wrote', `/day/${theDaySheCorrects}`],
    ])(
      'takes her off %s, opened by its own address, and changes nothing',
      async (_what, address) => {
        await herPhoneIsIn('lapsed');

        const before = theRecordOf(theDaySheCorrects);
        const app = await sheOpensEmi(address);

        await waitFor(() => {
          expect(app.pathname()).toBe('/onboarding/sign-in');
        });

        expect(screen.queryByTestId(editPeriodSaveTestID)).toBeNull();
        expect(theRecordOf(theDaySheCorrects)).toEqual(before);
        expect(theDaysOnHerPhone()).toEqual([...herRecordedDays]);
        expect(readDayLog(herDatabase(), theDaySheCorrects)?.revision).toBe(1);
      },
    );
  });

  /**
   * Taking her days and deleting them never stop, which is contracts KEEP-2 and KEEP-3. She is
   * signed in here, so the paywall is the screen she lands on, and both links are on it.
   */
  describe('she is lapsed and she wants her own days', () => {
    it('exports every day she ever wrote, and the export finishes', async () => {
      await herPhoneIsIn('lapsed');
      await sheIsAlreadySignedIn();
      const app = await sheOpensEmi();

      await waitFor(() => {
        expect(app.pathname()).toBe('/onboarding/paywall');
      });

      await shePresses(paywallExportTestID);
      expect(screen.getByTestId(exportScreenTestID)).toBeTruthy();

      await shePresses(exportActionTestID);

      await waitFor(() => {
        expect(screen.getByTestId(exportHeldTestID)).toBeTruthy();
      });

      expect(theDaysTheExportCarries()).toEqual([...herRecordedDays]);
    });

    it('deletes everything in one press, and the phone is left holding no row at all', async () => {
      await herPhoneIsIn('lapsed');
      await sheIsAlreadySignedIn();
      const app = await sheOpensEmi();

      await waitFor(() => {
        expect(app.pathname()).toBe('/onboarding/paywall');
      });

      await shePresses(paywallDeleteTestID);
      await shePresses(deleteActionTestID);

      expect(screen.getByTestId(deletedScreenTestID)).toBeTruthy();
      expect(rowsHeld(herDatabase())).toBe(0);
    });
  });

  describe('she subscribes again', () => {
    it('writes the day she taps, with every day she wrote before the lapse still there', async () => {
      const database = await herPhoneIsIn('lapsed');

      theSettingTableHolds(database).hold({
        state: 'paid',
        until: new Date(whenSheOpensIt.getTime() + 60 * 1000).toISOString(),
        plan: theYearlyPlan.identifier,
        transaction: 'the-first-one',
        readAt: whenSheOpensIt.toISOString(),
      });

      await sheOpensEmi();
      await sheTapsToLogADay();

      expect(theRecordOf(today)?.flow).toBe(theFlowSheTaps);
      expect(theDaysOnHerPhone()).toEqual([...herRecordedDays, today]);
    });
  });
});
