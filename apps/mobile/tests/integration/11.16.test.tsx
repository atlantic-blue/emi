import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MINIMUM_TAP_TARGET, space } from '@emi/tokens';
import { within } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { dayTestID, weekCellTestIDs, weekTestID } from '../../src/features/onboarding/Calendar';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import {
  type Control,
  controlsTooSmallToPress,
  daySquaresLeavingTheRowDead,
} from '../fixtures/tapTargets';
import { type Box, type Phone, aSmallIPhone, anIPhone16, theRow } from '../fixtures/theWidthOfARow';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');
const contractDocument = join(__dirname, '..', '..', '..', '..', 'docs', 'contracts.md');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

/** The two phones the squares are measured on. Both draw one narrower than the floor. */
const bothPhones: readonly Phone[] = [anIPhone16, aSmallIPhone];

/** Points. What the calendar leaves between two squares, and what a touch covers half of. */
const THE_GAP_BETWEEN_SQUARES = space.spaceXs;

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Past the welcome and past the two questions she may skip, on the question about her last one. */
async function sheReachesHerLastPeriod(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/**
 * The week her period started in: the row, the seven boxes that share its width, and the squares
 * she can press. A week the month does not fill keeps a box where it has no day, so the columns
 * are counted off every box and the touch is measured off the squares alone.
 */
function theWeekSheChoosesFrom(): { row: Box; cells: Box[]; squares: Box[] } {
  const row = screen
    .getAllByTestId(weekTestID)
    .find((week) => within(week).queryByTestId(dayTestID(herPeriodStarted)) !== null);

  if (row === undefined) {
    throw new Error('the calendar drew no week holding the day she chooses');
  }

  return {
    row: row as unknown as Box,
    cells: within(row).getAllByTestId(weekCellTestIDs) as unknown as Box[],
    squares: within(row).getAllByTestId(/^day-\d/) as unknown as Box[],
  };
}

/** The width of one column of a week, which is the width of the square standing in it. */
function theColumnsOfTheWeek(phone: Phone): readonly number[] {
  const { row, cells } = theWeekSheChoosesFrom();

  return theRow(row, cells, phone.width).cellWidths;
}

/** A square of a row, drawn as the calendar draws one, with the touch it is handed. */
function aSquareOfTheRow(touch: Record<string, number> | undefined): Control {
  return {
    props: {
      hitSlop: touch,
      style: { flex: 1, minHeight: MINIMUM_TAP_TARGET },
      testID: dayTestID(herPeriodStarted),
    },
  };
}

const aRowOfSquares: Control = { props: { style: { gap: THE_GAP_BETWEEN_SQUARES } } };

describe('a day square of the calendar is narrower than 44 points and her thumb still finds it', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the square she presses on the question about her last period', () => {
    it.each(bothPhones)('is drawn narrower than 44 points on $name', async (phone) => {
      await sheReachesHerLastPeriod();

      expect(theColumnsOfTheWeek(phone)).toHaveLength(7);

      for (const width of theColumnsOfTheWeek(phone)) {
        expect(width).toBeLessThan(MINIMUM_TAP_TARGET);
      }
    });

    it('is 41 points wide on an iPhone 16 and 38.4 on a small one', async () => {
      await sheReachesHerLastPeriod();

      expect(theColumnsOfTheWeek(anIPhone16)).toEqual([41, 41, 41, 41, 41, 41, 41]);
      expect(theColumnsOfTheWeek(aSmallIPhone)).toEqual([38.4, 38.4, 38.4, 38.4, 38.4, 38.4, 38.4]);
    });

    it('keeps the 44 points of height, so its width is the whole of the exception', async () => {
      await sheReachesHerLastPeriod();

      const { squares } = theWeekSheChoosesFrom();

      expect(controlsTooSmallToPress(squares as unknown as Control[])).toEqual([]);
      expect(screen.getByTestId(dayTestID(herPeriodStarted))).toHaveStyle({
        minHeight: MINIMUM_TAP_TARGET,
      });
    });

    it('leaves no point of its row belonging to no square', async () => {
      await sheReachesHerLastPeriod();

      const { row, squares } = theWeekSheChoosesFrom();

      expect(squares).toHaveLength(7);
      expect(
        daySquaresLeavingTheRowDead(row as unknown as Control, squares as unknown as Control[]),
      ).toEqual([]);
    });

    it('takes a touch 45 points wide on an iPhone 16, which is wider than a thumb needs', async () => {
      await sheReachesHerLastPeriod();

      for (const width of theColumnsOfTheWeek(anIPhone16)) {
        expect(width + THE_GAP_BETWEEN_SQUARES).toBe(45);
      }
    });
  });

  describe('a square drawn without the touch that carries it across the gap', () => {
    it('is named, with what it touches either side and the gap it stands in', () => {
      expect(daySquaresLeavingTheRowDead(aRowOfSquares, [aSquareOfTheRow(undefined)])).toEqual([
        'day-2026-05-09 touches 0 and 0 either side of a gap of 4',
      ]);
    });

    it('is named when it reaches only part of the way into the gap', () => {
      expect(
        daySquaresLeavingTheRowDead(aRowOfSquares, [aSquareOfTheRow({ left: 2, right: 1 })]),
      ).toEqual(['day-2026-05-09 touches 2 and 1 either side of a gap of 4']);
    });

    it('passes when it reaches half the gap on each side', () => {
      expect(
        daySquaresLeavingTheRowDead(aRowOfSquares, [aSquareOfTheRow({ left: 2, right: 2 })]),
      ).toEqual([]);
    });

    it('is refused rather than passed when no square takes its width from the row', () => {
      expect(() =>
        daySquaresLeavingTheRowDead(aRowOfSquares, [
          { props: { style: { minHeight: 44, minWidth: 44 }, testID: 'a-square-of-its-own' } },
        ]),
      ).toThrow('no square that takes its width from it');
    });
  });

  describe('every control that is not a day square', () => {
    it('is still named when it is drawn below 44 points on either axis', () => {
      expect(
        controlsTooSmallToPress([
          {
            props: {
              style: { minHeight: MINIMUM_TAP_TARGET, minWidth: MINIMUM_TAP_TARGET - 4 },
              testID: 'a-control-nobody-measured',
            },
          },
        ]),
      ).toEqual(['a-control-nobody-measured is 40 by 44']);
    });

    it('is still named when a square sized by its row is drawn under 44 points high', () => {
      expect(
        controlsTooSmallToPress([
          {
            props: {
              hitSlop: { left: 2, right: 2 },
              style: { flex: 1, minHeight: MINIMUM_TAP_TARGET - 4 },
              testID: dayTestID(herPeriodStarted),
            },
          },
        ]),
      ).toEqual(['day-2026-05-09 is 4 by 40']);
    });
  });

  describe('the contract the calendar is held to', () => {
    it('names the day square as the one exception, and the dead point as an error', () => {
      const contracts = readFileSync(contractDocument, 'utf8');
      const seeThree = contracts
        .slice(contracts.indexOf('### SEE-3'), contracts.indexOf('### SEE-4'))
        .replace(/\s+/g, ' ');

      expect(seeThree).toContain(
        'every interactive element is at least 44 points on both axes, except a day square of a calendar month.',
      );
      expect(seeThree).toContain(
        'Its touch is the width of its column plus half the gap on each side, so no point in the row belongs to no square.',
      );
      expect(seeThree).toContain(
        'A day square whose touch leaves a point of its row with no square.',
      );
    });
  });
});
