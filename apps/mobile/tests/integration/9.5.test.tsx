import { join } from 'node:path';

import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { cycleRingTestID } from '../../src/components/CycleRing';
import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { readProfile } from '../../src/data/profileRepository';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import {
  tourActionTestID,
  tourScreenTestID,
  tourSkipTestID,
} from '../../src/features/onboarding/TourScreen';
import { firstRunCopy, tourCopy } from '../../src/features/onboarding/copy';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { markTourSeen, tourIsSeen } from '../../src/features/onboarding/tour';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';
import { theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { controlsTooSmallToPress as tooSmallToPress } from '../fixtures/tapTargets';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Well away from any summer time change, so the calendar below reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const millisecondsInADay = 24 * 60 * 60 * 1000;

function dayOf(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const herPeriodStarted = dayOf(new Date(whenSheOpensIt.getTime() - 5 * millisecondsInADay));

interface OpenApp {
  /** The route she is looking at. It is read from the router rather than from the screen. */
  readonly pathname: () => string;
  readonly close: () => Promise<void>;
}

/**
 * renderRouter hangs its own readers on the promise it returns, so the promise is kept and the
 * resolved view is kept beside it.
 */
async function sheOpensEmi(): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });
  const view = await app;

  return { pathname: () => app.getPathname(), close: () => view.unmount() };
}

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

function aMigratedPhone(): Database {
  const database = herDatabase();

  migrate(database);

  return database;
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function theTourIsShown(): boolean {
  return screen.queryByTestId(tourScreenTestID) !== null;
}

/** Every question of the first run, answered, so a case can end on her home screen. */
async function sheAnswersEveryQuestionOfTheFirstRun(): Promise<void> {
  await sheAnswersEveryQuestion({
    periodStartedOn: herPeriodStarted,
    cycleLengthDays: defaultCycleLengthDays + 1,
  });
  // Her answers are written at the hold and nowhere else, so the walk ends there.
  await sheHoldsTheRing();
}

function everyControlOnTheScreen(): string[] {
  return tooSmallToPress([...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')]);
}

describe('the welcome comes first, the tour follows it, and the tour does not come back', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the first time she opens Emi', () => {
    it('shows her the welcome, and not the tour', async () => {
      const app = await sheOpensEmi();

      expect(app.pathname()).toBe('/onboarding/welcome');
      expect(screen.getByTestId('onboarding-welcome')).toBeTruthy();
      expect(theTourIsShown()).toBe(false);
    });

    it('shows her the tour when she continues from the welcome', async () => {
      const app = await sheOpensEmi();

      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/tour');
      expect(theTourIsShown()).toBe(true);
      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
    });
  });

  describe('the tour', () => {
    it('is one card, so it draws no count, no way back and no progress bar', async () => {
      await sheOpensEmi();
      await shePresses(onboardingActionTestID);

      expect(screen.queryByText('1 of 4')).toBeNull();
      expect(screen.queryByTestId('tour-back')).toBeNull();
      expect(screen.queryByTestId('onboarding-progress')).toBeNull();
      expect(screen.getByTestId(tourActionTestID)).toHaveTextContent(tourCopy.action);
    });

    it('holds every control at 44 points or more on both axes', async () => {
      await sheOpensEmi();
      await shePresses(onboardingActionTestID);

      expect(everyControlOnTheScreen()).toEqual([]);
    });
  });

  for (const [way, testID] of [
    ['Next', tourActionTestID],
    ['Skip', tourSkipTestID],
  ] as const) {
    describe(`${way}, pressed on the tour`, () => {
      it('lands her on the first question with the instant written', async () => {
        const app = await sheOpensEmi();

        await shePresses(onboardingActionTestID);
        await shePresses(testID);

        expect(app.pathname()).toBe('/onboarding/name');
        expect(screen.getByTestId('onboarding-name')).toBeTruthy();
        expect(readSetting(herDatabase(), 'tourSeenAt')).toBe(whenSheOpensIt.toISOString());
      });
    });
  }

  describe('the launch after she has seen it', () => {
    it('shows the welcome, and the welcome leads to the first question with no tour', async () => {
      writeSetting(aMigratedPhone(), 'tourSeenAt', whenSheOpensIt.toISOString());

      const app = await sheOpensEmi();

      expect(app.pathname()).toBe('/onboarding/welcome');

      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/name');
      expect(theTourIsShown()).toBe(false);
    });

    it('shows her home screen once she has answered every question', async () => {
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestionOfTheFirstRun();

      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId('home-screen')).toBeTruthy();
      expect(readSetting(herDatabase(), 'tourSeenAt')).toBe(whenSheOpensIt.toISOString());
      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.cycleLengthDays).toBe(
        defaultCycleLengthDays + 1,
      );
    });

    it('never lets the tour step over the questions to her home screen', async () => {
      const app = await sheOpensEmi();

      await shePresses(onboardingActionTestID);
      await shePresses(tourSkipTestID);

      expect(app.pathname()).not.toBe('/');
      expect(screen.queryByTestId('home-screen')).toBeNull();
      expect(screen.queryByText(firstRunCopy.welcome.title)).toBeNull();
    });
  });

  describe('the instant the tour was left', () => {
    it('is the first one, however many times the tour is left again', async () => {
      const database = aMigratedPhone();
      const later = new Date(whenSheOpensIt.getTime() + 60_000);

      markTourSeen(database, whenSheOpensIt);
      markTourSeen(database, later);

      expect(readSetting(database, 'tourSeenAt')).toBe(whenSheOpensIt.toISOString());
      expect(tourIsSeen(database)).toBe(true);
    });

    it('is absent on a phone that has never been through it', () => {
      expect(tourIsSeen(aMigratedPhone())).toBe(false);
    });
  });
});
