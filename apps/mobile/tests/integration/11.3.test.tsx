import { join } from 'node:path';

import { cyclesFrom } from '@emi/cycle';

import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { Database } from '../../src/data/database';
import type { DayVault } from '../../src/services/vault/dayVault';
import { listCycles } from '../../src/data/cycleRepository';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { HOLD_MILLISECONDS } from '../../src/features/onboarding/HoldToBegin';
import { learningCyclesWantedTestID } from '../../src/features/forecast/Learning';
import { cyclesWantedSentence } from '../../src/features/forecast/copy';
import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import { dayTestID, earlierMonthTestID } from '../../src/features/onboarding/Calendar';
import { firstForecastActionTestID } from '../../src/features/onboarding/FirstForecast';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import {
  periodBeforeGapTestID,
  periodBeforeRefusedTestID,
} from '../../src/features/onboarding/PeriodBefore';
import { daysBetweenSentence, firstRunCopy } from '../../src/features/onboarding/copy';
import {
  type FirstRunRefusal,
  type FirstRunVaults,
  FirstRunError,
  completeFirstRun,
  maximumCycleLengthDays,
  minimumCycleLengthDays,
} from '../../src/features/onboarding/firstRun';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { openTestDatabase } from '../data/nodeDatabase';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herProfileVault, herVault, theVaultOnHerPhone } from '../fixtures/herVault';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

/** The instant the write carries, because the hold moves her clock on by its own length. */
const whenSheFinishesTheHold = new Date(whenSheOpensIt.getTime() + HOLD_MILLISECONDS);

/** Twenty eight days before the one she gave, which is one cycle she lived. */
const theCycleSheLived = 28;
const theOneBefore = '2026-04-11';

/** Twenty days back, a day nearer than any cycle runs, so the screen refuses it. */
const tooSoonBefore = '2026-04-19';

/** Forty six days back, one day further than any cycle runs. */
const tooLongBefore = '2026-03-24';

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

/**
 * Past the welcome, past the two questions she may skip and past her last period, standing on the
 * question every case below is about.
 */
async function sheReachesThePeriodBefore(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(dayTestID(herPeriodStarted));
  await shePresses(onboardingActionTestID);
}

/** Every day she sealed, opened again with the key her own phone drew at the hold. */
async function herSealedDays() {
  const database = herDatabase();
  const vault = await theVaultOnHerPhone();

  return listDayLogs(database).map((row) => vault.open(row.payload));
}

/** The cycles her own days make, worked out by the arithmetic every screen reads. */
async function theCyclesBehindHer() {
  return cyclesFrom(recordedDays(herDatabase(), (await theVaultOnHerPhone()).open));
}

const theSecondDayFails = 'this vault seals one day and refuses the next';

/**
 * A vault that seals her first day and then refuses. Nothing in the product behaves this way: it
 * is here to stop the write half way through, which is the only way to read whether the two days
 * travel together.
 */
function aVaultThatFailsOnTheSecondDay(): DayVault {
  const sealed = herVault();
  let count = 0;

  return {
    open: sealed.open,
    seal: (record) => {
      count += 1;

      if (count > 1) {
        throw new Error(theSecondDayFails);
      }

      return sealed.seal(record);
    },
  };
}

function herVaults(): FirstRunVaults {
  return { day: herVault(), profile: herProfileVault() };
}

/** The refusal a call gives, so a case names the rule rather than the wording of a message. */
function refusalFrom(run: () => void): FirstRunRefusal {
  try {
    run();
  } catch (error) {
    if (error instanceof FirstRunError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the first run accepted an answer it is written to refuse');
}

describe('the period before makes her first forecast from a cycle she lived', () => {
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

  describe('the period she remembers', () => {
    it('is asked for after her last period, and says how far apart the two are', async () => {
      const app = await sheOpensEmi();

      await sheReachesThePeriodBefore();

      expect(app.pathname()).toBe('/onboarding/period-before');
      expect(screen.getByText(firstRunCopy.periodBefore.title)).toBeTruthy();
      expect(screen.queryByTestId(periodBeforeGapTestID)).toBeNull();

      await shePresses(dayTestID(theOneBefore));

      expect(screen.getByTestId(periodBeforeGapTestID)).toHaveTextContent(
        daysBetweenSentence(theCycleSheLived),
      );
      expect(screen.getByTestId(onboardingActionTestID)).not.toBeDisabled();
    });

    it('becomes a second sealed day, and one whole cycle behind her forecast', async () => {
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        periodBeforeStartedOn: theOneBefore,
      });
      await sheHoldsTheRing();

      expect(await herSealedDays()).toEqual([
        { day: theOneBefore, flow: 'medium', recordedAt: whenSheFinishesTheHold.toISOString() },
        { day: herPeriodStarted, flow: 'medium', recordedAt: whenSheFinishesTheHold.toISOString() },
      ]);
      expect(await theCyclesBehindHer()).toMatchObject([
        { startedOn: theOneBefore, lengthDays: theCycleSheLived },
        { startedOn: herPeriodStarted, lengthDays: null },
      ]);
      expect(app.pathname()).toBe('/');
    });

    it('reaches her home screen through the cache, which the hold leaves for her first write', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        periodBeforeStartedOn: theOneBefore,
      });
      await sheHoldsTheRing();

      // The screen reads the cycle cache rather than her days, and the hold rebuilds it, so the
      // cycle she lived is behind the sentence she reads: one more cycle is wanted and not two.
      expect(listCycles(herDatabase())).toMatchObject([
        { startedOn: theOneBefore, lengthDays: theCycleSheLived },
        { startedOn: herPeriodStarted, lengthDays: null },
      ]);
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.getByTestId(learningCyclesWantedTestID)).toHaveTextContent(
        cyclesWantedSentence({ kind: 'learning', completeCycles: 1, needsCycles: 2 }),
      );
    });

    it('is refused at the hold as well, so the screen is not the only thing holding it', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            herVaults(),
            {
              periodStartedOn: herPeriodStarted,
              periodBeforeStartedOn: tooSoonBefore,
              cycleLengthDays: 28,
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('period-before-is-out-of-range');
      expect(listDayLogs(database)).toEqual([]);
    });

    it('is written in the same transaction as her last period, so neither lands alone', () => {
      const database = openTestDatabase();
      migrate(database);

      // The second day she gives fails to seal. Both days are written under one transaction, so
      // the first one has to leave with it.
      expect(() =>
        completeFirstRun(
          database,
          { day: aVaultThatFailsOnTheSecondDay(), profile: herProfileVault() },
          {
            periodStartedOn: herPeriodStarted,
            periodBeforeStartedOn: theOneBefore,
            cycleLengthDays: 28,
          },
          whenSheOpensIt,
        ),
      ).toThrow(theSecondDayFails);
      expect(listDayLogs(database)).toEqual([]);
    });
  });

  describe('a day no cycle could run between', () => {
    it('keeps her on the question and names what a cycle runs between', async () => {
      const app = await sheOpensEmi();

      await sheReachesThePeriodBefore();
      await shePresses(dayTestID(tooSoonBefore));

      expect(app.pathname()).toBe('/onboarding/period-before');
      expect(screen.getByTestId(periodBeforeRefusedTestID)).toHaveTextContent(
        firstRunCopy.periodBefore.outOfRange,
      );
      // The sentence is held to naming both bounds as well as to being the refusal, because a
      // refusal built without them would still match itself.
      expect(firstRunCopy.periodBefore.outOfRange).toContain(String(minimumCycleLengthDays));
      expect(firstRunCopy.periodBefore.outOfRange).toContain(String(maximumCycleLengthDays));
      expect(screen.queryByTestId(periodBeforeGapTestID)).toBeNull();

      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/period-before');
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    it('is refused at the far end too, because a cycle has two bounds', async () => {
      await sheOpensEmi();

      await sheReachesThePeriodBefore();
      await shePresses(earlierMonthTestID);
      await shePresses(dayTestID(tooLongBefore));

      expect(screen.getByTestId(periodBeforeRefusedTestID)).toBeTruthy();
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    it('lets her on as soon as she picks a day a cycle could run to', async () => {
      const app = await sheOpensEmi();

      await sheReachesThePeriodBefore();
      await shePresses(dayTestID(tooSoonBefore));
      await shePresses(dayTestID(theOneBefore));

      expect(screen.queryByTestId(periodBeforeRefusedTestID)).toBeNull();

      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/cycle-length');
    });
  });

  describe('the period she does not remember', () => {
    it('writes her last period and nothing else', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();

      expect(await herSealedDays()).toEqual([
        { day: herPeriodStarted, flow: 'medium', recordedAt: whenSheFinishesTheHold.toISOString() },
      ]);
      expect(await theCyclesBehindHer()).toMatchObject([{ startedOn: herPeriodStarted }]);
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    it('forgets the day she picked before she pressed the way past it', async () => {
      await sheOpensEmi();

      await sheReachesThePeriodBefore();
      await shePresses(dayTestID(theOneBefore));
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(firstForecastActionTestID);
      await sheHoldsTheRing();

      expect((await herSealedDays()).map((day) => day.day)).toEqual([herPeriodStarted]);
    });
  });

  describe('the words of the screen', () => {
    it('ask for one more period and say what adding it buys her', async () => {
      await sheOpensEmi();

      await sheReachesThePeriodBefore();

      expect(screen.getByText(firstRunCopy.periodBefore.title)).toBeTruthy();
      for (const line of firstRunCopy.periodBefore.lines) {
        expect(screen.getByText(line)).toBeTruthy();
      }
      expect(screen.getByTestId(onboardingActionTestID)).toHaveTextContent(
        firstRunCopy.periodBefore.action,
      );
      expect(screen.getByTestId(onboardingSkipTestID)).toHaveTextContent(
        firstRunCopy.periodBefore.skip,
      );
    });
  });
});
