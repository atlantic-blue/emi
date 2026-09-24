import { join } from 'node:path';

import { cyclesFrom, forecastFrom } from '@emi/cycle';
import { render, screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import { listCycles } from '../../src/data/cycleRepository';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import {
  FirstForecast,
  firstForecastActionTestID,
  firstForecastLearningTestID,
  firstForecastOnThisPhoneTestID,
  firstForecastRangeTestID,
  firstForecastTestID,
  firstForecastWhyTestID,
} from '../../src/features/onboarding/FirstForecast';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import { learningRangeTestID, learningTestID } from '../../src/features/forecast/Learning';
import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import { cycleRingTestID } from '../../src/components/CycleRing';
import { rangeSentence } from '../../src/features/forecast/copy';
import { firstRunCopy } from '../../src/features/onboarding/copy';
import { completeFirstRun, forecastFromHerAnswers } from '../../src/features/onboarding/firstRun';
import { words } from '../../src/language';
import { openTestDatabase } from '../data/nodeDatabase';
import { resetExpoSqlite } from '../data/expoSqlite';
import { OnAPhone } from '../fixtures/theSafeArea';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase } from '../fixtures/herPhone';
import { herProfileVault, herVault } from '../fixtures/herVault';
import { daysNamedIn, textIn } from '../fixtures/renderedText';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';
import {
  describeSingleDayUse,
  singleDayUsesUnder,
} from '../../../../tools/pipeline/singleDayForecast';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');
const repositoryRoot = join(__dirname, '..', '..', '..', '..');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** A day inside the ninety the first run reaches back over, and not today. */
const herPeriodStarted = '2026-05-09';

/** Twenty eight days before that one, which is one whole cycle she lived. */
const theOneBefore = '2026-04-11';

const herCycleLengthDays = 28;

/** The two files this step adds to the interface, which the single day scan reads with the rest. */
const theNewInterfaceFiles = [
  join('apps', 'mobile', 'src', 'features', 'onboarding', 'FirstForecast.tsx'),
  join('apps', 'mobile', 'src', 'app', 'onboarding', 'first-forecast.tsx'),
];

async function sheOpensEmi(): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

/** Past every question, standing on the forecast this step draws, with nothing written yet. */
async function sheReachesHerFirstForecast(
  answers: {
    readonly periodStartedOn?: string;
    readonly periodBeforeStartedOn?: string;
    readonly cycleLengthDays?: number;
  } = {},
): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(dayTestID(answers.periodStartedOn ?? herPeriodStarted));
  await shePresses(onboardingActionTestID);

  if (answers.periodBeforeStartedOn === undefined) {
    await shePresses(onboardingSkipTestID);
  } else {
    await shePresses(dayTestID(answers.periodBeforeStartedOn));
    await shePresses(onboardingActionTestID);
  }

  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/** The words of the range she is reading, on whichever screen names it. */
function theRangeDrawn(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/** The range the arithmetic gives for the answers below, worked out the way the screens work it out. */
function theRangeFor(answers: {
  readonly periodStartedOn: string;
  readonly periodBeforeStartedOn?: string;
  readonly cycleLengthDays: number;
}): string {
  const forecast = forecastFromHerAnswers(answers);

  if (forecast.start === undefined) {
    throw new Error('her answers left the arithmetic with no range to draw');
  }

  return rangeSentence(forecast.start);
}

/** Her two vaults, with a reader that refuses, so the rebuild inside the hold cannot finish. */
function aVaultThatCannotBeRead() {
  return {
    day: {
      seal: herVault().seal,
      open: () => {
        throw new Error('this vault seals a day and cannot read one back');
      },
    },
    profile: herProfileVault(),
  };
}

describe('her first forecast is a range, before anything is written', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the screen she reaches after the last question', () => {
    it('is where the last question hands her, whether she answered it or passed it by', async () => {
      const app = await sheOpensEmi();

      await sheReachesHerFirstForecast();

      expect(app.pathname()).toBe('/onboarding/first-forecast');
      expect(screen.getByTestId(firstForecastTestID)).toBeTruthy();
    });

    it('draws the range her own answers make, counted by the arithmetic the home screen reads', async () => {
      await sheOpensEmi();

      await sheReachesHerFirstForecast();

      expect(theRangeDrawn(firstForecastRangeTestID)).toBe(
        theRangeFor({ periodStartedOn: herPeriodStarted, cycleLengthDays: herCycleLengthDays }),
      );
      expect(theRangeDrawn(firstForecastRangeTestID)).toBe('Between the 3rd and the 9th of June');
    });

    it('names two days and never one, so no date is promised', async () => {
      await sheOpensEmi();

      await sheReachesHerFirstForecast();
      const drawn = theRangeDrawn(firstForecastRangeTestID);

      expect(daysNamedIn(drawn)).toHaveLength(2);
      expect(daysNamedIn(drawn)[0]).not.toBe(daysNamedIn(drawn)[1]);
    });

    it('counts from the cycle she lived where she gave the period before it', async () => {
      await sheOpensEmi();

      await sheReachesHerFirstForecast({ periodBeforeStartedOn: theOneBefore });

      expect(theRangeDrawn(firstForecastRangeTestID)).toBe(
        theRangeFor({
          periodStartedOn: herPeriodStarted,
          periodBeforeStartedOn: theOneBefore,
          cycleLengthDays: herCycleLengthDays,
        }),
      );
    });

    it('says Emi is still learning, and what it says after two cycles', async () => {
      await sheOpensEmi();

      await sheReachesHerFirstForecast();

      expect(screen.getByTestId(firstForecastLearningTestID)).toHaveTextContent(
        words('onboarding.firstForecast.line.learning'),
      );
      expect(screen.getByText(firstRunCopy.firstForecast.title)).toBeTruthy();
    });

    it('says why the answer is a range and where it was worked out', async () => {
      await sheOpensEmi();

      await sheReachesHerFirstForecast();

      expect(textIn(screen.getByTestId(firstForecastWhyTestID))).toEqual([
        words('onboarding.firstForecast.why.title'),
        words('onboarding.firstForecast.why.line'),
      ]);
      expect(textIn(screen.getByTestId(firstForecastOnThisPhoneTestID))).toEqual([
        words('onboarding.firstForecast.onThisPhone.title'),
        words('onboarding.firstForecast.onThisPhone.line'),
      ]);
    });

    it('carries no tolerance, no model version and no word about calibration', async () => {
      await sheOpensEmi();

      await sheReachesHerFirstForecast();
      const said = textIn(screen.getByTestId(firstForecastTestID)).join(' ');

      expect(said).not.toMatch(/tolerance/i);
      expect(said).not.toMatch(/model/i);
      expect(said).not.toMatch(/calibrat/i);
      expect(said).not.toMatch(/±/);
    });

    it('has written nothing at all while she stands on it', async () => {
      await sheOpensEmi();

      await sheReachesHerFirstForecast({ periodBeforeStartedOn: theOneBefore });

      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(listCycles(herDatabase())).toEqual([]);
      expect(readProfile(herDatabase(), herProfileVault())).toBeUndefined();
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();
    });

    it('sends her back to the question that asks for a day, where she reached it without one', async () => {
      const app = renderRouter(appDirectory, { initialUrl: '/onboarding/first-forecast' });

      await app;

      expect(app.getPathname()).toBe('/onboarding/last-period');
      expect(screen.queryByTestId(firstForecastTestID)).toBeNull();
    });

    it('hands her to the hold when she presses Continue', async () => {
      const app = await sheOpensEmi();

      await sheReachesHerFirstForecast();

      expect(screen.getByTestId(firstForecastActionTestID)).toHaveTextContent(
        words('onboarding.firstForecast.action'),
      );

      await shePresses(firstForecastActionTestID);

      expect(app.pathname()).toBe('/onboarding/hold');
    });
  });

  describe('the home screen she lands on after the hold', () => {
    it('shows the same range, with no day logged in between', async () => {
      const app = await sheOpensEmi();

      await sheReachesHerFirstForecast();
      const readBeforeTheHold = theRangeDrawn(firstForecastRangeTestID);
      await shePresses(firstForecastActionTestID);
      await sheHoldsTheRing();

      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.getByTestId(learningTestID)).toBeTruthy();
      expect(theRangeDrawn(learningRangeTestID)).toBe(readBeforeTheHold);
    });

    it('shows the same range where she gave the period before as well', async () => {
      await sheOpensEmi();

      await sheReachesHerFirstForecast({ periodBeforeStartedOn: theOneBefore });
      const readBeforeTheHold = theRangeDrawn(firstForecastRangeTestID);
      await shePresses(firstForecastActionTestID);
      await sheHoldsTheRing();

      expect(theRangeDrawn(learningRangeTestID)).toBe(readBeforeTheHold);
    });

    it('draws her ring, because the hold left the cache the screen reads', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        periodBeforeStartedOn: theOneBefore,
      });
      await sheHoldsTheRing();

      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
      expect(listCycles(herDatabase())).toMatchObject([
        { startedOn: theOneBefore, lengthDays: 28 },
        { startedOn: herPeriodStarted, lengthDays: null },
      ]);
    });

    it('holds the cache her one day makes, where she does not remember the period before', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();

      expect(listCycles(herDatabase())).toMatchObject([
        { startedOn: herPeriodStarted, endedOn: null, lengthDays: null },
      ]);
      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
    });

    it('counts the cycle from the day she logs today, where today is a day she bled', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: today });
      await sheHoldsTheRing();

      expect(listCycles(herDatabase())).toMatchObject([{ startedOn: today, lengthDays: null }]);
    });
  });

  describe('the cache and her days, at the hold', () => {
    it('writes nothing at all where the rebuild cannot finish', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(() =>
        completeFirstRun(
          database,
          aVaultThatCannotBeRead(),
          {
            periodStartedOn: herPeriodStarted,
            periodBeforeStartedOn: theOneBefore,
            cycleLengthDays: herCycleLengthDays,
          },
          whenSheOpensIt,
        ),
      ).toThrow('cannot read one back');
      expect(listDayLogs(database)).toEqual([]);
      expect(listCycles(database)).toEqual([]);
      expect(readProfile(database, herProfileVault())).toBeUndefined();
      expect(readSetting(database, 'firstRunCompletedAt')).toBeUndefined();
    });

    it('leaves the cache holding every cycle her days make', () => {
      const database = openTestDatabase();
      migrate(database);

      completeFirstRun(
        database,
        { day: herVault(), profile: herProfileVault() },
        {
          periodStartedOn: herPeriodStarted,
          periodBeforeStartedOn: theOneBefore,
          cycleLengthDays: herCycleLengthDays,
        },
        whenSheOpensIt,
      );

      expect(listCycles(database)).toMatchObject([
        { startedOn: theOneBefore, endedOn: '2026-05-08', lengthDays: 28, isPredicted: false },
        { startedOn: herPeriodStarted, endedOn: null, lengthDays: null },
      ]);
    });
  });

  describe('the arithmetic behind the screen', () => {
    it('is the same answer the cache gives, read from her days rather than from her answers', () => {
      const database = openTestDatabase();
      migrate(database);

      completeFirstRun(
        database,
        { day: herVault(), profile: herProfileVault() },
        {
          periodStartedOn: herPeriodStarted,
          periodBeforeStartedOn: theOneBefore,
          cycleLengthDays: herCycleLengthDays,
        },
        whenSheOpensIt,
      );

      const fromHerAnswers = forecastFromHerAnswers({
        periodStartedOn: herPeriodStarted,
        periodBeforeStartedOn: theOneBefore,
        cycleLengthDays: herCycleLengthDays,
      });
      const fromHerDays = forecastFrom(
        cyclesFrom(listDayLogs(database).map((row) => herVault().open(row.payload))),
        { statedCycleLengthDays: herCycleLengthDays },
      );

      expect(fromHerAnswers).toEqual(fromHerDays);
    });

    it('names neither single day the forecast carries, on either new file', () => {
      expect(
        singleDayUsesUnder(repositoryRoot, theNewInterfaceFiles).map(describeSingleDayUse),
      ).toEqual([]);
    });
  });

  describe('the screen on its own', () => {
    it('presses Continue under her thumb and nothing else', async () => {
      const pressed: string[] = [];

      await render(
        <OnAPhone>
          <FirstForecast
            onContinue={() => pressed.push('continue')}
            start={{ from: '2026-06-03', to: '2026-06-09' }}
          />
        </OnAPhone>,
      );
      await fireEvent.press(screen.getByTestId(firstForecastActionTestID));

      expect(pressed).toEqual(['continue']);
    });

    it('draws no bar, because it asks her nothing', async () => {
      await render(
        <OnAPhone>
          <FirstForecast
            onContinue={() => undefined}
            start={{ from: '2026-06-03', to: '2026-06-09' }}
          />
        </OnAPhone>,
      );

      expect(screen.queryByTestId('onboarding-progress')).toBeNull();
      expect(textIn(screen.toJSON()).join(' ')).not.toMatch(/\d+ of \d+/);
    });
  });
});
