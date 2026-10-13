import { join } from 'node:path';

import { space } from '@emi/tokens';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { within } from '@testing-library/react-native';
import { sheGivesAPeriod } from '../fixtures/thePastPeriods';
import { pastPeriodRowTestID } from '../../src/features/pastPeriods/PastPeriodsList';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import {
  calendarTestID,
  dayTestID,
  weekCellTestIDs,
  weekTestID,
} from '../../src/features/onboarding/Calendar';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import {
  type Box,
  type Phone,
  aSmallIPhone,
  anIPhone16,
  theRow,
  widthGivenTo,
} from '../fixtures/theWidthOfARow';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

/** The floor SEE-3 holds a control to, and what a square of the calendar keeps of it. */
const MINIMUM_TAP_TARGET = 44;

/** The two phones every case below is measured on. */
const bothPhones: readonly Phone[] = [anIPhone16, aSmallIPhone];

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

async function sheOpensEmi(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Past the welcome and the two questions she may skip, with the first row of her periods open. */
async function sheReachesHerLastPeriod(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(pastPeriodRowTestID(0));
}

/** The first row given, with the second row open, where the same grid asks for the period before. */
async function sheReachesThePeriodBefore(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await sheGivesAPeriod(0, herPeriodStarted);
  await shePresses(pastPeriodRowTestID(1));
}

/**
 * A week of the month she is looking at, with the seven boxes that stand in it. The grid keeps a
 * box for a day the month has no room for, so every week holds seven of them whatever month it is.
 */
function aWeekOfTheMonth(): { row: Box; cells: Box[] } {
  const last = screen.getAllByTestId(weekTestID).at(-1);

  if (last === undefined) {
    throw new Error('the calendar drew no weeks, so there was no row to measure');
  }

  return {
    row: last as unknown as Box,
    cells: within(last).getAllByTestId(weekCellTestIDs) as unknown as Box[],
  };
}

/** The room a control takes a touch in beyond the box it is drawn as. */
function theTouchOf(control: { props: { hitSlop?: unknown } }): { left: number; right: number } {
  const slop = (control.props.hitSlop ?? {}) as Record<string, unknown>;
  const side = (name: string): number => (typeof slop[name] === 'number' ? slop[name] : 0);

  return { left: side('left'), right: side('right') };
}

describe('the calendar of her last period fits on an iPhone 16', () => {
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

  describe('the month she picks her last period from', () => {
    it.each(bothPhones)('ends inside the calendar on $name', async (phone) => {
      await sheOpensEmi();
      await sheReachesHerLastPeriod();

      const { row, cells } = aWeekOfTheMonth();
      const measured = theRow(row, cells, phone.width);

      expect(cells).toHaveLength(7);
      expect(measured.rightEdge).toBeLessThanOrEqual(measured.width);
    });

    it.each(bothPhones)('fills the width the calendar gives it on $name', async (phone) => {
      await sheOpensEmi();
      await sheReachesHerLastPeriod();

      const { row, cells } = aWeekOfTheMonth();
      const measured = theRow(row, cells, phone.width);

      expect(measured.rightEdge).toBe(measured.width);
    });

    it.each(bothPhones)(
      'stands a gutter in from each edge of the glass on $name',
      async (phone) => {
        await sheOpensEmi();
        await sheReachesHerLastPeriod();

        expect(
          widthGivenTo(screen.getByTestId(calendarTestID) as unknown as Box, phone.width),
        ).toBe(phone.width - 2 * space.spaceLg);
      },
    );

    it('keeps a square as high as a thumb needs, whatever the width does', async () => {
      await sheOpensEmi();
      await sheReachesHerLastPeriod();

      const square = screen.getByTestId(dayTestID(herPeriodStarted));

      expect(square).toHaveStyle({ minHeight: MINIMUM_TAP_TARGET });
    });

    it('carries the touch of a square across the gap, so no part of the row is dead', async () => {
      await sheOpensEmi();
      await sheReachesHerLastPeriod();

      const slop = theTouchOf(screen.getByTestId(dayTestID(herPeriodStarted)));

      expect(slop.left + slop.right).toBe(space.spaceXs);
    });

    it('leaves a square taking a touch as wide as a thumb needs on an iPhone 16', async () => {
      await sheOpensEmi();
      await sheReachesHerLastPeriod();

      const { row, cells } = aWeekOfTheMonth();
      const slop = theTouchOf(screen.getByTestId(dayTestID(herPeriodStarted)));

      for (const square of theRow(row, cells, anIPhone16.width).cellWidths) {
        expect(square + slop.left + slop.right).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
      }
    });
  });

  describe('the month she picks the period before from', () => {
    it.each(bothPhones)('ends inside the calendar on $name', async (phone) => {
      await sheOpensEmi();
      await sheReachesThePeriodBefore();

      const { row, cells } = aWeekOfTheMonth();
      const measured = theRow(row, cells, phone.width);

      expect(cells).toHaveLength(7);
      expect(measured.rightEdge).toBeLessThanOrEqual(measured.width);
    });

    it.each(bothPhones)(
      'stands a gutter in from each edge of the glass on $name',
      async (phone) => {
        await sheOpensEmi();
        await sheReachesThePeriodBefore();

        expect(
          widthGivenTo(screen.getByTestId(calendarTestID) as unknown as Box, phone.width),
        ).toBe(phone.width - 2 * space.spaceLg);
      },
    );
  });

  describe('the named days the redesign took away', () => {
    it('draws no Today and no Yesterday above the calendar', async () => {
      await sheOpensEmi();
      await sheReachesHerLastPeriod();

      expect(screen.queryByTestId('named-days')).toBeNull();
      expect(screen.queryAllByTestId(/^named-day-/)).toHaveLength(0);
    });
  });
});
