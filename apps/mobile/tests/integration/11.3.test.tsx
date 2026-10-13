import { join } from 'node:path';

import { cyclesFrom } from '@emi/cycle';

import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { Database } from '../../src/data/database';
import type { DayVault } from '../../src/services/vault/dayVault';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { learningCyclesWantedTestID } from '../../src/features/forecast/Learning';
import { cyclesWantedSentence } from '../../src/features/forecast/copy';
import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import { tabTestID } from '@emi/ui';

import { english } from '../../src/language';
import { dayTestID, earlierMonthTestID } from '../../src/features/onboarding/Calendar';
import {
  firstForecastActionTestID,
  firstForecastRangeTestID,
  firstForecastStillLearningTestID,
} from '../../src/features/onboarding/FirstForecast';
import {
  onboardingActionTestID,
  onboardingQuestionTestID,
  onboardingSkipTestID,
  onboardingStepLabelTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { cycleLengthDaysTestID } from '../../src/features/onboarding/CycleLength';
import {
  firstRunCopy,
  firstRunScreenCount,
  firstRunScreens,
} from '../../src/features/onboarding/copy';
import {
  type FirstRunRefusal,
  type FirstRunVaults,
  FirstRunError,
  completeFirstRun,
  forecastFromHerAnswers,
  maximumCycleLengthDays,
  minimumCycleLengthDays,
} from '../../src/features/onboarding/firstRun';
import { cycleLengthSentence } from '../../src/features/history/copy';
import { historyCycleTestID } from '../../src/features/history/HistoryScreen';
import {
  pastPeriodLengthTestID,
  pastPeriodPickerCancelTestID,
  pastPeriodPickerDoneTestID,
  pastPeriodPickerRefusedTestID,
  pastPeriodPickerRemoveTestID,
  pastPeriodPickerTestID,
} from '../../src/features/pastPeriods/PastPeriodPicker';
import { pastPeriodRowTestID } from '../../src/features/pastPeriods/PastPeriodsList';
import { pastPeriodsCopy } from '../../src/features/pastPeriods/copy';
import { textIn } from '../fixtures/renderedText';
import { sheGivesAPeriod } from '../fixtures/thePastPeriods';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { openTestDatabase } from '../data/nodeDatabase';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herProfileVault, herVault, theVaultOnHerPhone } from '../fixtures/herVault';
import { sheAnswersEveryQuestion, sheReadsThePromise } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

/** Twenty eight days before the one she gave, which is one cycle she lived. */
const theCycleSheLived = 28;
const theOneBefore = '2026-04-11';
/** Twenty eight days before that, the third row. */
const theOneBeforeThat = '2026-03-14';

/** The length she gives each of the three, the newest first. */
const herLengths = [5, 6, 4] as const;

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

/** Past the welcome and the two questions she may skip, standing on the list of her periods. */
async function sheReachesHerPeriods(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/** Every day she said she bled, from a start, for a length, oldest first. */
function theDaysOf(startedOn: string, lengthDays: number): string[] {
  return Array.from({ length: lengthDays }, (_unused, at) => {
    const day = new Date(`${startedOn}T00:00:00.000Z`);
    day.setUTCDate(day.getUTCDate() + at);
    return day.toISOString().slice(0, 10);
  });
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

describe('her last three periods, in one step of the first run', () => {
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

  describe('the step', () => {
    it('stands after the year she was born, as one step with three rows', async () => {
      const app = await sheOpensEmi();

      await sheReachesHerPeriods();

      expect(app.pathname()).toBe('/onboarding/three-periods');
      expect(screen.getByText(pastPeriodsCopy.title)).toBeTruthy();
      expect(screen.getByTestId(onboardingQuestionTestID)).toHaveTextContent(
        `${pastPeriodsCopy.forecastLine} ${pastPeriodsCopy.estimateLine}`,
      );
      for (const row of [0, 1, 2]) {
        expect(screen.getByTestId(pastPeriodRowTestID(row))).toBeTruthy();
      }
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
      expect(screen.getByTestId(onboardingWayPastTestID)).toHaveTextContent(
        pastPeriodsCopy.wayPast,
      );
      expect(screen.queryByTestId(onboardingSkipTestID)).toBeNull();
    });

    it('counts one step where two stood, so the bar keeps its true arithmetic', async () => {
      await sheOpensEmi();

      await sheReachesHerPeriods();

      expect(firstRunScreens).toContain('threePeriods');
      expect(firstRunScreens).not.toContain('lastPeriod');
      expect(firstRunScreens).not.toContain('periodBefore');
      expect(firstRunScreenCount).toBe(12);
      expect(screen.getByTestId(onboardingStepLabelTestID)).toHaveTextContent(
        `Step ${String(firstRunScreens.indexOf('threePeriods') + 1)} of ${String(firstRunScreenCount)}`,
      );
    });

    it('opens only the next row to give, and says every row after the first can be skipped', async () => {
      await sheOpensEmi();

      await sheReachesHerPeriods();

      expect(screen.getByTestId(pastPeriodRowTestID(0))).not.toBeDisabled();
      expect(screen.getByTestId(pastPeriodRowTestID(1))).toBeDisabled();
      expect(screen.getByTestId(pastPeriodRowTestID(2))).toBeDisabled();
      expect(textIn(screen.getByTestId(pastPeriodRowTestID(2)))).toContain(
        pastPeriodsCopy.skipThisOne,
      );

      await sheGivesAPeriod(0, herPeriodStarted, 7);

      expect(textIn(screen.getByTestId(pastPeriodRowTestID(0)))).toEqual(
        expect.arrayContaining(['9 May', '7 days']),
      );
      expect(screen.getByTestId(pastPeriodRowTestID(1))).not.toBeDisabled();
      expect(screen.getByTestId(onboardingActionTestID)).not.toBeDisabled();
    });

    it('waits on Done until she picks a day and a length, and keeps nothing she cancels', async () => {
      await sheOpensEmi();

      await sheReachesHerPeriods();
      await shePresses(pastPeriodRowTestID(0));

      expect(screen.getByTestId(pastPeriodPickerDoneTestID)).toBeDisabled();
      await shePresses(dayTestID(herPeriodStarted));
      expect(screen.getByTestId(pastPeriodPickerDoneTestID)).toBeDisabled();
      await shePresses(pastPeriodLengthTestID(5));
      expect(screen.getByTestId(pastPeriodPickerDoneTestID)).not.toBeDisabled();

      await shePresses(pastPeriodPickerCancelTestID);

      expect(screen.queryByTestId(pastPeriodPickerTestID)).toBeNull();
      expect(textIn(screen.getByTestId(pastPeriodRowTestID(0)))).toContain(
        pastPeriodsCopy.addStart,
      );
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });
  });

  describe('three periods', () => {
    it('writes every day she bled, for the length she gave each period', async () => {
      const app = await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        periodBeforeStartedOn: theOneBefore,
        periodBeforeThatStartedOn: theOneBeforeThat,
        periodLengthDaysEach: 5,
      });
      await sheHoldsTheRing();

      const sealed = await herSealedDays();
      expect(sealed.map((day) => day.day)).toEqual([
        ...theDaysOf(theOneBeforeThat, 5),
        ...theDaysOf(theOneBefore, 5),
        ...theDaysOf(herPeriodStarted, 5),
      ]);
      expect(sealed.every((day) => day.flow === 'medium')).toBe(true);
      expect(app.pathname()).toBe('/');
    });

    it('makes two complete cycles, so the forecast is ready from the first day', async () => {
      await sheOpensEmi();

      await sheReachesHerPeriods();
      await sheGivesAPeriod(0, herPeriodStarted, herLengths[0]);
      await sheGivesAPeriod(1, theOneBefore, herLengths[1]);
      await sheGivesAPeriod(2, theOneBeforeThat, herLengths[2]);
      await shePresses(onboardingActionTestID);
      await shePresses(cycleLengthDaysTestID(28));
      await shePresses(onboardingActionTestID);
      // How long her period lasts takes its way past, then five questions and the reminder.
      await shePresses(onboardingWayPastTestID);
      for (let question = 0; question < 6; question += 1) {
        await shePresses(onboardingSkipTestID);
      }

      expect(screen.getByTestId(firstForecastRangeTestID)).toBeTruthy();
      expect(screen.queryByTestId(firstForecastStillLearningTestID)).toBeNull();

      await shePresses(firstForecastActionTestID);
      await sheReadsThePromise();
      await sheHoldsTheRing();

      expect(await theCyclesBehindHer()).toMatchObject([
        { startedOn: theOneBeforeThat, lengthDays: theCycleSheLived, periodDays: herLengths[2] },
        { startedOn: theOneBefore, lengthDays: theCycleSheLived, periodDays: herLengths[1] },
        { startedOn: herPeriodStarted, lengthDays: null },
      ]);
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(learningCyclesWantedTestID)).toBeNull();
    });

    it('lets Insights read how many days of each cycle she bled, not one', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        periodBeforeStartedOn: theOneBefore,
        periodBeforeThatStartedOn: theOneBeforeThat,
        periodLengthDaysEach: 6,
      });
      await sheHoldsTheRing();
      await shePresses(tabTestID('history'));

      expect(textIn(screen.getByTestId(historyCycleTestID(theOneBefore))).join(' ')).toContain(
        cycleLengthSentence(theCycleSheLived, 6),
      );
      expect(textIn(screen.getByTestId(historyCycleTestID(theOneBefore))).join(' ')).not.toContain(
        cycleLengthSentence(theCycleSheLived, 1),
      );
    });

    it('is refused at the hold where two starts are nearer than a cycle runs', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            herVaults(),
            {
              periods: [
                { startedOn: herPeriodStarted, lengthDays: 5 },
                { startedOn: tooSoonBefore, lengthDays: 5 },
              ],
              cycleLengthDays: 28,
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('period-before-is-out-of-range');
      expect(listDayLogs(database)).toEqual([]);
    });

    it('is refused at the hold where a period runs longer than the arithmetic reads as one', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            herVaults(),
            { periods: [{ startedOn: theOneBefore, lengthDays: 9 }], cycleLengthDays: 28 },
            whenSheOpensIt,
          ),
        ),
      ).toBe('past-period-length-is-out-of-range');
    });

    it('is refused at the hold where it holds more than three periods', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            herVaults(),
            {
              periods: [
                { startedOn: herPeriodStarted, lengthDays: 1 },
                { startedOn: theOneBefore, lengthDays: 1 },
                { startedOn: theOneBeforeThat, lengthDays: 1 },
                { startedOn: '2026-02-14', lengthDays: 1 },
              ],
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('more-periods-than-asked');
    });

    it('writes every day in one transaction, so no period lands alone', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(() =>
        completeFirstRun(
          database,
          { day: aVaultThatFailsOnTheSecondDay(), profile: herProfileVault() },
          {
            periods: [
              { startedOn: herPeriodStarted, lengthDays: 1 },
              { startedOn: theOneBefore, lengthDays: 1 },
            ],
            cycleLengthDays: 28,
          },
          whenSheOpensIt,
        ),
      ).toThrow(theSecondDayFails);
      expect(listDayLogs(database)).toEqual([]);
    });

    it('never writes a day of her newest period that is still ahead of her', () => {
      const database = openTestDatabase();
      migrate(database);

      completeFirstRun(
        database,
        herVaults(),
        { periods: [{ startedOn: '2026-05-12', lengthDays: 6 }] },
        whenSheOpensIt,
      );

      expect(listDayLogs(database).map((row) => row.day)).toEqual([
        '2026-05-12',
        '2026-05-13',
        '2026-05-14',
      ]);
    });

    it('puts what she feels today on the day she bled today, in one row', () => {
      const database = openTestDatabase();
      migrate(database);

      completeFirstRun(
        database,
        herVaults(),
        { periods: [{ startedOn: '2026-05-13', lengthDays: 3 }], symptoms: ['cramps'] },
        whenSheOpensIt,
      );

      const today = listDayLogs(database).filter((row) => row.day === '2026-05-14');
      expect(today).toHaveLength(1);
      expect(herVault().open((today[0] as { payload: Uint8Array }).payload)).toMatchObject({
        flow: 'medium',
        symptoms: ['cramps'],
      });
    });
  });

  describe('two periods', () => {
    it('makes one complete cycle, and the forecast is still learning', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        periodBeforeStartedOn: theOneBefore,
      });
      await sheHoldsTheRing();

      expect(await theCyclesBehindHer()).toMatchObject([
        { startedOn: theOneBefore, lengthDays: theCycleSheLived },
        { startedOn: herPeriodStarted, lengthDays: null },
      ]);
      expect(screen.getByTestId(learningCyclesWantedTestID)).toHaveTextContent(
        cyclesWantedSentence({ kind: 'learning', completeCycles: 1, needsCycles: 2 }),
      );
    });
  });

  describe('no period at all', () => {
    it('takes "Skip, I will log as I go" and writes no day', async () => {
      const app = await sheOpensEmi();

      await sheReachesHerPeriods();
      await shePresses(onboardingWayPastTestID);

      expect(app.pathname()).toBe('/onboarding/cycle-length');
    });

    it('forgets every row she gave before she pressed the way past', async () => {
      await sheOpensEmi();

      await sheReachesHerPeriods();
      await sheGivesAPeriod(0, herPeriodStarted, 5);
      await sheGivesAPeriod(1, theOneBefore, 5);
      await shePresses(onboardingWayPastTestID);
      await shePresses(cycleLengthDaysTestID(28));
      await shePresses(onboardingActionTestID);
      // How long her period lasts takes its way past, then five questions and the reminder.
      await shePresses(onboardingWayPastTestID);
      for (let question = 0; question < 6; question += 1) {
        await shePresses(onboardingSkipTestID);
      }
      await shePresses(firstForecastActionTestID);
      await sheReadsThePromise();
      await sheHoldsTheRing();

      expect(await herSealedDays()).toEqual([]);
    });
  });

  describe('a row no cycle could run to', () => {
    it('keeps Done waiting and names what a cycle runs between', async () => {
      await sheOpensEmi();

      await sheReachesHerPeriods();
      await sheGivesAPeriod(0, herPeriodStarted, 5);
      await shePresses(pastPeriodRowTestID(1));
      await shePresses(dayTestID(tooSoonBefore));
      await shePresses(pastPeriodLengthTestID(5));

      expect(screen.getByTestId(pastPeriodPickerRefusedTestID)).toHaveTextContent(
        pastPeriodsCopy.outOfRange,
      );
      expect(pastPeriodsCopy.outOfRange).toContain(String(minimumCycleLengthDays));
      expect(pastPeriodsCopy.outOfRange).toContain(String(maximumCycleLengthDays));
      expect(screen.getByTestId(pastPeriodPickerDoneTestID)).toBeDisabled();

      await shePresses(earlierMonthTestID);
      await shePresses(dayTestID(tooLongBefore));
      expect(screen.getByTestId(pastPeriodPickerDoneTestID)).toBeDisabled();
    });

    it('drops a row below the one she moved, once it is no longer a cycle before it', async () => {
      await sheOpensEmi();

      await sheReachesHerPeriods();
      await sheGivesAPeriod(0, herPeriodStarted, 5);
      await sheGivesAPeriod(1, theOneBefore, 5);
      await shePresses(pastPeriodRowTestID(0));
      await shePresses(dayTestID('2026-05-01'));
      await shePresses(pastPeriodPickerDoneTestID);

      expect(textIn(screen.getByTestId(pastPeriodRowTestID(0)))).toContain('1 May');
      expect(textIn(screen.getByTestId(pastPeriodRowTestID(1)))).toContain(
        pastPeriodsCopy.addStart,
      );
    });

    it('takes a row off with every row below it when she removes it', async () => {
      await sheOpensEmi();

      await sheReachesHerPeriods();
      await sheGivesAPeriod(0, herPeriodStarted, 5);
      await sheGivesAPeriod(1, theOneBefore, 5);
      await shePresses(pastPeriodRowTestID(0));
      await shePresses(pastPeriodPickerRemoveTestID);

      expect(textIn(screen.getByTestId(pastPeriodRowTestID(0)))).toContain(
        pastPeriodsCopy.addStart,
      );
      expect(screen.getByTestId(pastPeriodRowTestID(1))).toBeDisabled();
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });
  });

  describe('the two steps it replaced', () => {
    it('are gone from the walk, the routes and the words', async () => {
      const app = await sheOpensEmi();

      await sheReachesHerPeriods();

      expect(app.pathname()).not.toBe('/onboarding/last-period');
      expect(screen.queryByTestId('onboarding-lastPeriod')).toBeNull();
      expect(screen.queryByTestId('onboarding-periodBefore')).toBeNull();
      const wordKeys = Object.keys(english);
      expect(wordKeys).not.toContain('onboarding.lastPeriod.title');
      expect(wordKeys).not.toContain('onboarding.periodBefore.title');
      expect(wordKeys).not.toContain('onboarding.periodBefore.skip');
      expect(Object.keys(firstRunCopy)).not.toContain('lastPeriod');
      expect(Object.keys(firstRunCopy)).not.toContain('periodBefore');
    });

    it('cannot be reached by their old addresses', async () => {
      const app = renderRouter(appDirectory, { initialUrl: '/onboarding/period-before' });
      await app;

      expect(screen.queryByTestId('onboarding-periodBefore')).toBeNull();
      expect(screen.queryByTestId('onboarding-lastPeriod')).toBeNull();
    });
  });

  describe('the words of the screen', () => {
    it('promise only what three periods buy, which the forecast rule holds to', () => {
      const three = forecastFromHerAnswers({
        periods: [
          { startedOn: herPeriodStarted, lengthDays: 5 },
          { startedOn: theOneBefore, lengthDays: 5 },
          { startedOn: theOneBeforeThat, lengthDays: 5 },
        ],
        cycleLengthDays: 28,
      });
      const two = forecastFromHerAnswers({
        periods: [
          { startedOn: herPeriodStarted, lengthDays: 5 },
          { startedOn: theOneBefore, lengthDays: 5 },
        ],
        cycleLengthDays: 28,
      });

      expect(pastPeriodsCopy.forecastLine).toBe(
        'With three periods, Emi can forecast your next ones from the first day.',
      );
      expect(three.kind).toBe('forecast');
      expect(two.kind).toBe('learning');
    });
  });
});
