import { join } from 'node:path';

import { type DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { keyholdingItems } from '../../../../tools/pipeline/keyLeak';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { readProfile } from '../../src/data/profileRepository';

import {
  historyTestID,
  homeScreenTestID,
  settingsTestID,
} from '../../src/features/home/HomeScreen';
import {
  deleteActionTestID,
  deleteBackTestID,
  deleteRefusedTestID,
  deleteScreenTestID,
  deletedScreenTestID,
  goesTestID,
  startAgainTestID,
} from '../../src/features/settings/DeleteEverything';
import {
  settingsDeleteTestID,
  settingsScreenTestID,
} from '../../src/features/settings/SettingsScreen';
import { settingsCopy } from '../../src/features/settings/copy';
import { longerTestID } from '../../src/features/onboarding/CycleLength';
import { dayTestID } from '../../src/features/onboarding/LastPeriod';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import { tourScreenTestID, tourSkipTestID } from '../../src/features/onboarding/TourScreen';
import {
  everyTable,
  freePagesHeld,
  rowsHeld,
  wipedKeychainItems,
} from '../../src/services/vault/wipe';
import { resetExpoSqlite } from '../data/expoSqlite';
import {
  itemsInTheKeychain,
  resetExpoSecureStore,
  setItemAsync,
  theKeychainRefusesToRemove,
} from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { herProfileVault, theVaultOnHerPhone } from '../fixtures/herVault';
import { textIn, visibleTextIn } from '../fixtures/renderedText';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** The first run names its screens by this, which is how the other tests of it find them. */
const theFirstScreenOfTheFirstRun = 'onboarding-welcome';

/** Midday, and away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const today = dayOf(whenSheOpensIt);
const herCycleLengthDays = 28;
const herPeriodDays = 4;
const herCycleCount = 6;

/** Thirteen days behind her, so the cycle she is in today is nowhere near its end. */
const herLastPeriodStarted = addDays(today, -13);

const herPeriodStarts: readonly string[] = Array.from({ length: herCycleCount }, (_at, back) =>
  addDays(herLastPeriodStarted, -(herCycleCount - 1 - back) * herCycleLengthDays),
);

/** Six cycles of her life, written the way the logging screen writes them. */
function herSixCycles(): DayRecord[] {
  return herPeriodStarts.flatMap((start) =>
    Array.from({ length: herPeriodDays }, (_unused, day) => aBleedingDay(addDays(start, day))),
  );
}

/**
 * A phone that has been through everything Emi can do: it holds all four keychain items, not only
 * the key. The names come from the pipeline's own list rather than from the delete's list, so an
 * item the delete forgot is an item this test still finds afterwards.
 */
async function herKeychainHoldsEverything(): Promise<void> {
  for (const held of keyholdingItems) {
    if (itemsInTheKeychain()[held.item] === undefined) {
      await setItemAsync(held.item, 'something this phone kept');
    }
  }
}

async function sheOpensEmi(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheWalksToTheDeleteScreen(): Promise<void> {
  await shePresses(settingsTestID);
  await shePresses(settingsDeleteTestID);
}

/** Every row the database holds, counted by reading it rather than by asking the application. */
function rowsOnHerPhone(): number {
  return rowsHeld(herDatabase());
}

function whatSheCanRead(): string[] {
  return visibleTextIn(screen.toJSON());
}

/**
 * Only the screen on top, because the navigator keeps the screens she came through mounted
 * underneath it and a read of the whole tree would be reading a screen nobody is looking at.
 */
function whatThatScreenSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

describe('after deleting, the database and the keychain are both empty', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHolds(whenSheOpensIt, herSixCycles(), herCycleLengthDays);
    await herKeychainHoldsEverything();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the way to it', () => {
    it('is two presses from the screen she opens on', async () => {
      await sheOpensEmi();

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();

      await shePresses(settingsTestID);

      expect(screen.getByTestId(settingsScreenTestID)).toBeTruthy();

      await shePresses(settingsDeleteTestID);

      expect(screen.getByTestId(deleteScreenTestID)).toBeTruthy();
    });

    it('lists what goes before she presses anything', async () => {
      await sheOpensEmi();
      await sheWalksToTheDeleteScreen();

      for (const [at, line] of settingsCopy.delete.goes.entries()) {
        expect(screen.getByTestId(goesTestID(at))).toHaveTextContent(line);
      }
      expect(whatSheCanRead()).toContain(settingsCopy.delete.line);
    });

    it('leaves her data alone when she takes the way back out', async () => {
      const before = rowsOnHerPhone();
      await sheOpensEmi();
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteBackTestID);

      expect(screen.getByTestId(settingsScreenTestID)).toBeTruthy();
      expect(rowsOnHerPhone()).toBe(before);
    });
  });

  describe('one press, and it is done', () => {
    beforeEach(async () => {
      await sheOpensEmi();
      await sheWalksToTheDeleteScreen();
    });

    it('starts from six cycles of her life, so the delete has something to take', () => {
      expect(listDayLogs(herDatabase())).toHaveLength(herCycleCount * herPeriodDays);
      expect(readProfile(herDatabase(), herProfileVault())?.cycleLengthDays).toBe(
        herCycleLengthDays,
      );
    });

    it('leaves no row in any table, read from the database rather than from Emi', async () => {
      await shePresses(deleteActionTestID);

      const database = herDatabase();

      expect(everyTable(database).length).toBeGreaterThan(2);
      for (const table of everyTable(database)) {
        expect({ table, rows: database.all(`SELECT * FROM "${table}"`) }).toEqual({
          table,
          rows: [],
        });
      }
      expect(rowsHeld(database)).toBe(0);
    });

    it('leaves no page holding what it deleted', async () => {
      await shePresses(deleteActionTestID);

      expect(freePagesHeld(herDatabase())).toBe(0);
    });

    it('leaves no item in the keychain, read from the keychain rather than from Emi', async () => {
      expect(Object.keys(itemsInTheKeychain()).sort()).toEqual(
        keyholdingItems.map((held) => held.item).sort(),
      );

      await shePresses(deleteActionTestID);

      expect(itemsInTheKeychain()).toEqual({});
    });

    it('asks nothing else first, so the press she made is the whole action', async () => {
      await shePresses(deleteActionTestID);

      expect(rowsOnHerPhone()).toBe(0);
      expect(screen.queryByTestId(deleteScreenTestID)).toBeNull();
      expect(screen.getByTestId(deletedScreenTestID)).toBeTruthy();
    });

    it('keeps nothing back for a waiting period, so a second launch finds the same nothing', async () => {
      await shePresses(deleteActionTestID);

      jest.setSystemTime(new Date(whenSheOpensIt.getTime() + 60 * 24 * 60 * 60 * 1000));

      expect(rowsOnHerPhone()).toBe(0);
      expect(itemsInTheKeychain()).toEqual({});
    });
  });

  describe('what she is left looking at', () => {
    beforeEach(async () => {
      await sheOpensEmi();
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);
    });

    it('says it is gone, and offers the one thing left to do', () => {
      expect(whatSheCanRead()).toContain(settingsCopy.deleted.title);
      expect(whatSheCanRead()).toContain(settingsCopy.deleted.line);
      expect(screen.getByTestId(startAgainTestID)).toBeTruthy();
    });

    it('names no day, no date and no cycle of hers on the screen she is left on', () => {
      const said = whatThatScreenSays(deletedScreenTestID);

      expect(said).toContain(settingsCopy.deleted.title);
      expect(said).not.toContain(herLastPeriodStarted);
      expect(said).not.toContain(String(herCycleLengthDays));
      expect(said).not.toContain(String(new Date(whenSheOpensIt).getFullYear()));
    });

    it('puts her back at the tour, and at the first run behind it, when she starts again', async () => {
      await shePresses(startAgainTestID);

      // The delete empties the setting table, and the marker of the tour is a row in it, so the
      // four cards come back with the two questions they exist to explain.
      expect(screen.getByTestId(tourScreenTestID('ring'))).toBeTruthy();
      expect(screen.queryByTestId(homeScreenTestID)).toBeNull();

      await shePresses(tourSkipTestID);

      expect(screen.getByTestId(theFirstScreenOfTheFirstRun)).toBeTruthy();
    });

    it('holds a key again once she starts again, so the day she logs can be sealed', async () => {
      await shePresses(startAgainTestID);

      expect(Object.keys(itemsInTheKeychain())).toEqual([wipedKeychainItems[0]]);
    });

    it('takes her the whole way through the first run and opens the day she wrote', async () => {
      await shePresses(startAgainTestID);

      await shePresses(tourSkipTestID);
      await shePresses(onboardingActionTestID);
      await shePresses(dayTestID(addDays(today, -2)));
      await shePresses(onboardingActionTestID);
      await shePresses(longerTestID);
      await shePresses(onboardingActionTestID);
      await sheHoldsTheRing();

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.getByTestId(historyTestID)).toBeTruthy();

      const rows = listDayLogs(herDatabase());
      const vault = await theVaultOnHerPhone();

      expect(rows).toHaveLength(1);
      expect(vault.open((rows[0] as (typeof rows)[number]).payload).day).toBe(addDays(today, -2));
    });
  });

  describe('a phone that will not let go of an item', () => {
    const theOneItKeeps = wipedKeychainItems[1] as string;

    it('tells her the delete did not finish rather than saying it is gone', async () => {
      theKeychainRefusesToRemove(theOneItKeeps);
      await sheOpensEmi();
      await sheWalksToTheDeleteScreen();

      await shePresses(deleteActionTestID);

      expect(screen.queryByTestId(deletedScreenTestID)).toBeNull();
      expect(screen.getByTestId(deleteRefusedTestID)).toBeTruthy();
      expect(whatThatScreenSays(deleteScreenTestID)).toContain(settingsCopy.delete.refused);
    });

    it('has taken her days anyway, and takes the item on the press after it', async () => {
      theKeychainRefusesToRemove(theOneItKeeps);
      await sheOpensEmi();
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);

      expect(rowsOnHerPhone()).toBe(0);
      expect(Object.keys(itemsInTheKeychain())).toEqual([theOneItKeeps]);

      theKeychainRefusesToRemove(null);
      await shePresses(deleteActionTestID);

      expect(itemsInTheKeychain()).toEqual({});
      expect(screen.getByTestId(deletedScreenTestID)).toBeTruthy();
    });
  });

  describe('every control she can press on the way through', () => {
    it('is at least 44 points on both axes, and the failure names any that is not', async () => {
      await sheOpensEmi();
      await sheWalksToTheDeleteScreen();

      const onTheScreen = screen.queryAllByRole('button');

      expect(onTheScreen.length).toBeGreaterThan(1);
      expect(controlsTooSmallToPress(onTheScreen)).toEqual([]);
    });

    it('is at least 44 points on the screen she is left on too', async () => {
      await sheOpensEmi();
      await sheWalksToTheDeleteScreen();
      await shePresses(deleteActionTestID);

      expect(controlsTooSmallToPress(screen.queryAllByRole('button'))).toEqual([]);
    });
  });

  describe('nothing is kept back', () => {
    it('removes every keychain item the pipeline knows Emi holds', () => {
      expect(keyholdingItems.map((held) => held.item).sort()).toEqual(
        [...wipedKeychainItems].sort(),
      );
    });
  });
});
