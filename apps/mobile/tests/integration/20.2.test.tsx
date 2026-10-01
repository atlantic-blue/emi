import { join } from 'node:path';

import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { listCycles } from '../../src/data/cycleRepository';
import { profileRow, readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import {
  firstForecastActionTestID,
  firstForecastTestID,
} from '../../src/features/onboarding/FirstForecast';
import { longerTestID } from '../../src/features/onboarding/CycleLength';
import { HOLD_MILLISECONDS } from '../../src/features/onboarding/HoldToBegin';
import {
  onboardingActionTestID,
  onboardingBackTestID,
  onboardingSkipTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { promiseActionTestID } from '../../src/features/onboarding/ThePromise';
import { todayTestID } from '../../src/features/onboarding/Today';
import { whatEmiDoesActionTestID } from '../../src/features/onboarding/WhatEmiDoesWithIt';
import { type TodaySymptom, defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { theProfileVaultOnHerPhone, theVaultOnHerPhone } from '../fixtures/herVault';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = '2026-05-14';

/** A day she could have named, used only to prove the way past forgets it again. */
const aDaySheCouldHaveNamed = '2026-05-09';

/** One cycle before that day, which is the only answer the period before question accepts. */
const thePeriodBeforeThat = '2026-04-11';

/** Not the number the screen offers, so a length that reads back is a length she gave. */
const sheSaysHerCycleRuns = defaultCycleLengthDays + 2;

/** The instant the hold ends, which is the instant everything she answered carries. */
const whenSheFinishesTheHold = new Date(whenSheOpensIt.getTime() + HOLD_MILLISECONDS);

/**
 * The questions between the cycle length and the three screens she reads rather than answers:
 * her period length, how steady her cycle is, how she feels, her goals, her focus and today.
 */
const theQuestionsLeftAfterTheCycleLength = 6;

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

interface OpenApp {
  readonly pathname: () => string;
}

async function sheOpensEmi(): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Past the welcome and past the two questions she skips, on the question about her last one. */
async function sheReachesTheQuestionSheCannotAnswer(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/**
 * Everything after the question about her last period, answered, which leaves her at the hold.
 * The length is the one answer she gives, so a profile that reads back holds something of hers.
 */
async function sheAnswersTheRest(feelsToday: readonly TodaySymptom[] = []): Promise<void> {
  for (let pressed = defaultCycleLengthDays; pressed < sheSaysHerCycleRuns; pressed += 1) {
    await shePresses(longerTestID);
  }

  await shePresses(onboardingActionTestID);

  for (let question = 1; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
    await shePresses(onboardingSkipTestID);
  }

  if (feelsToday.length === 0) {
    await shePresses(onboardingSkipTestID);
  } else {
    for (const slug of feelsToday) {
      await shePresses(todayTestID(slug));
    }

    await shePresses(onboardingActionTestID);
  }

  await shePresses(firstForecastActionTestID);
  await shePresses(promiseActionTestID);
  await shePresses(whatEmiDoesActionTestID);
}

describe('the way past the last period question passes the period before with it', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('the hold, for a woman who gave no date', () => {
    it('writes the answers she did give, and the marker that the first run is done', async () => {
      await sheOpensEmi();
      await sheReachesTheQuestionSheCannotAnswer();
      await shePresses(onboardingWayPastTestID);
      await sheAnswersTheRest();
      await sheHoldsTheRing();

      const sealed = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

      expect(sealed?.cycleLengthDays).toBe(sheSaysHerCycleRuns);
      expect(sealed?.recordedAt).toBe(whenSheFinishesTheHold.toISOString());
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(
        whenSheFinishesTheHold.toISOString(),
      );
    });

    it('writes no day at all, because she named none and Emi guesses none for her', async () => {
      await sheOpensEmi();
      await sheReachesTheQuestionSheCannotAnswer();
      await shePresses(onboardingWayPastTestID);
      await sheAnswersTheRest();
      await sheHoldsTheRing();

      expect(profileRow(herDatabase())).toBeDefined();
      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(listCycles(herDatabase())).toEqual([]);
    });

    it('leaves her on the screen that says the ring needs a period', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheQuestionSheCannotAnswer();
      await shePresses(onboardingWayPastTestID);
      await sheAnswersTheRest();
      await sheHoldsTheRing();

      expect(app.pathname()).toBe('/');
    });

    it('still writes what she says she feels today, as a day of its own with no flow', async () => {
      await sheOpensEmi();
      await sheReachesTheQuestionSheCannotAnswer();
      await shePresses(onboardingWayPastTestID);
      await sheAnswersTheRest(['cramps']);
      await sheHoldsTheRing();

      const vault = await theVaultOnHerPhone();
      const written = listDayLogs(herDatabase()).map((row) => vault.open(row.payload));

      expect(written.map((record) => record.day)).toEqual([today]);
      expect(written[0]?.symptoms).toEqual(['cramps']);
      expect(written[0]?.flow).toBeUndefined();
    });
  });

  describe('a date she picked before she pressed the way past', () => {
    it('is forgotten, so the hold writes no day for it', async () => {
      await sheOpensEmi();
      await sheReachesTheQuestionSheCannotAnswer();
      await shePresses(dayTestID(aDaySheCouldHaveNamed));
      await shePresses(onboardingWayPastTestID);
      await sheAnswersTheRest();
      await sheHoldsTheRing();

      expect(listDayLogs(herDatabase())).toEqual([]);
    });

    it('takes the period before she picked with it, when she walks back to press it', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheQuestionSheCannotAnswer();
      await shePresses(dayTestID(aDaySheCouldHaveNamed));
      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/period-before');

      await shePresses(dayTestID(thePeriodBeforeThat));
      await shePresses(onboardingBackTestID);

      expect(app.pathname()).toBe('/onboarding/last-period');

      await shePresses(onboardingWayPastTestID);
      await sheAnswersTheRest();
      await sheHoldsTheRing();

      expect(app.pathname()).toBe('/');
      expect(listDayLogs(herDatabase())).toEqual([]);
    });
  });

  describe('the forecast between the last question and the hold', () => {
    it('takes her on rather than back to the question she could not answer', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheQuestionSheCannotAnswer();
      await shePresses(onboardingWayPastTestID);

      for (let pressed = defaultCycleLengthDays; pressed < sheSaysHerCycleRuns; pressed += 1) {
        await shePresses(longerTestID);
      }

      await shePresses(onboardingActionTestID);

      for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
        await shePresses(onboardingSkipTestID);
      }

      expect(app.pathname()).not.toBe('/onboarding/last-period');
      expect(screen.getByTestId(firstForecastTestID)).toBeTruthy();
    });
  });
});
