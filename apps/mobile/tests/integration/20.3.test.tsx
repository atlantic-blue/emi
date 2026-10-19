import { join } from 'node:path';

import { CYCLES_BEFORE_A_FORECAST } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { cycleLengthDaysTestID } from '../../src/features/onboarding/CycleLength';
import {
  firstForecastActionTestID,
  firstForecastLearningTestID,
  firstForecastLinesTestID,
  firstForecastNoGuessTestID,
  firstForecastRangeTestID,
  firstForecastRingTestID,
  firstForecastStillLearningTestID,
  firstForecastTestID,
  firstForecastTitleTestID,
  firstForecastWhyTestID,
} from '../../src/features/onboarding/FirstForecast';
import {
  onboardingActionTestID,
  onboardingBackTestID,
  onboardingSkipTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { whatEmiDoesActionTestID } from '../../src/features/onboarding/WhatEmiDoesWithIt';
import { learningCopy, statedLengthSentence } from '../../src/features/forecast/copy';
import { cyclesBeforeAForecastSentence, firstRunCopy } from '../../src/features/onboarding/copy';
import {
  defaultCycleLengthDays,
  forecastFromHerAnswers,
} from '../../src/features/onboarding/firstRun';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herDatabase } from '../fixtures/herPhone';
import { daysNamedIn, textIn } from '../fixtures/renderedText';
import { partsMissing, theIdentifiersDrawn } from '../fixtures/theMockupScreen';
import {
  theIdentifiersOfTheForecastWithNoDate,
  thePartsOfTheForecastWithNoDate,
} from '../fixtures/theFirstForecastWithNoDate';
import { shePassesTheQuestion } from '../fixtures/theFirstRun';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

/** Not the number the screen offers, so a length drawn back is a length she gave. */
const sheSaysHerCycleRuns = defaultCycleLengthDays + 2;

/**
 * The questions between the cycle length and the screen this step draws: her period length, how
 * steady her cycle is, how she feels, her goals, her focus, today and the reminder.
 */
const theQuestionsLeftAfterTheCycleLength = 7;

/**
 * The drawing places five parts. The count is written out so that a comparison which read nothing
 * cannot pass as a comparison every part answered.
 */
const theDrawingHasParts = 5;

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

/**
 * Every question, with the one about her last period passed rather than answered, which leaves her
 * standing on the screen this step draws.
 */
async function sheAnswersEverythingButTheDate(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingWayPastTestID);

  await shePresses(cycleLengthDaysTestID(sheSaysHerCycleRuns));

  await shePresses(onboardingActionTestID);

  for (let question = 0; question < theQuestionsLeftAfterTheCycleLength; question += 1) {
    await shePassesTheQuestion();
  }
}

/** Every word the screen puts in front of her, as one sentence. */
function everythingItSays(): string {
  return textIn(screen.getByTestId(firstForecastTestID)).join(' ');
}

describe('the first run with no date ends on a forecast that says it is still learning', () => {
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

  describe('the drawing the comparison reads', () => {
    it('places the title, the lines, the card, the closing line and the way on', () => {
      expect(thePartsOfTheForecastWithNoDate().map((part) => part.name)).toEqual([
        'FirstForecast',
        'FirstForecast',
        'Card',
        'Text',
        'PrimaryButton',
      ]);
    });

    it('says what each of those parts is built under', () => {
      expect(
        thePartsOfTheForecastWithNoDate().filter((part) => part.builtUnder.length === 0),
      ).toEqual([]);
    });

    it('is read whole, so a comparison of nothing cannot pass as a comparison', () => {
      expect(thePartsOfTheForecastWithNoDate()).toHaveLength(theDrawingHasParts);
    });
  });

  describe('the screen she is left looking at', () => {
    beforeEach(async () => {
      await sheOpensEmi();
      await sheAnswersEverythingButTheDate();
    });

    it('is the first forecast, which she reads rather than being carried past it', () => {
      expect(screen.getByTestId(firstForecastTestID)).toBeTruthy();
    });

    it('draws the five parts in the order the drawing places them', () => {
      expect(partsMissing(thePartsOfTheForecastWithNoDate(), theIdentifiersDrawn())).toEqual([]);
    });

    it('says Emi has no date to count from, under the dotted ring the redesign draws', () => {
      expect(screen.getByTestId(firstForecastRingTestID)).toBeTruthy();
      expect(textIn(screen.getByTestId(firstForecastTitleTestID))).toEqual([
        'Emi has no date to count from',
      ]);
    });

    it('says the first period she logs starts everything, then names the length she gave', () => {
      expect(textIn(screen.getByTestId(firstForecastLinesTestID))).toEqual([
        'The first period you log starts everything.',
        `From that day Emi counts a cycle of ${String(sheSaysHerCycleRuns)} days, the length you gave.`,
      ]);
    });

    it('says it is still learning inside the card, how many complete cycles it needs, and why it does not guess', () => {
      expect(textIn(screen.getByTestId(firstForecastStillLearningTestID))).toEqual([
        'Still learning',
        cyclesBeforeAForecastSentence(CYCLES_BEFORE_A_FORECAST),
        firstRunCopy.firstForecast.noDate.guess,
      ]);
      expect(cyclesBeforeAForecastSentence(CYCLES_BEFORE_A_FORECAST)).toBe(
        'Emi needs 2 complete cycles before it forecasts from your own cycles.',
      );
    });

    it('carries none of the old words, which said Emi was using the length before any day was logged', () => {
      expect(everythingItSays()).not.toContain("We don't have a date to start from yet");
      expect(everythingItSays()).not.toContain(statedLengthSentence(sheSaysHerCycleRuns));
      expect(everythingItSays()).not.toContain(learningCopy.stillLearning);
      expect(everythingItSays()).not.toMatch(/until then/i);
    });

    it('counts the cycles the arithmetic asks for, and not a number of its own', () => {
      const answer = forecastFromHerAnswers({ cycleLengthDays: sheSaysHerCycleRuns });

      expect(answer.kind).toBe('learning');
      expect(answer.kind === 'learning' ? answer.needsCycles : 0).toBe(CYCLES_BEFORE_A_FORECAST);
      expect(textIn(screen.getByTestId(firstForecastStillLearningTestID))).toContain(
        cyclesBeforeAForecastSentence(CYCLES_BEFORE_A_FORECAST),
      );
    });

    it('says it will not guess a date on day one', () => {
      expect(textIn(screen.getByTestId(firstForecastNoGuessTestID))).toEqual([
        'Emi builds no forecast from a date it guessed, because a guess on day one is a false sentence on day one.',
      ]);
    });

    it('draws no range and no date anywhere on it', () => {
      expect(screen.queryByTestId(firstForecastRangeTestID)).toBeNull();
      expect(daysNamedIn(everythingItSays())).toEqual([]);
      expect(everythingItSays()).not.toMatch(/between/i);
    });

    it('drops the card the range state draws, because there is no range to explain', () => {
      expect(screen.queryByTestId(firstForecastWhyTestID)).toBeNull();
      expect(screen.queryByTestId(firstForecastLearningTestID)).toBeNull();
    });

    it('offers the way on, and no way back to the question she could not answer', () => {
      expect(screen.getByTestId(firstForecastActionTestID)).toBeTruthy();
      expect(screen.queryByTestId(onboardingBackTestID)).toBeNull();
      expect(screen.queryByTestId(onboardingWayPastTestID)).toBeNull();
      expect(screen.queryByTestId(onboardingSkipTestID)).toBeNull();
    });

    it('takes her on to what Emi does with it when she presses the way on', async () => {
      await shePresses(firstForecastActionTestID);

      expect(screen.getByTestId(whatEmiDoesActionTestID)).toBeTruthy();
    });
  });

  describe('a part the screen does not draw', () => {
    beforeEach(async () => {
      await sheOpensEmi();
      await sheAnswersEverythingButTheDate();
    });

    it('is named, with what it is built under and where the comparison had reached', () => {
      const nowhere = {
        ...theIdentifiersOfTheForecastWithNoDate(),
        Card: ['a-card-nobody-drew'],
      };

      expect(partsMissing(thePartsOfTheForecastWithNoDate(nowhere), theIdentifiersDrawn())).toEqual(
        [
          `the drawing names Card, built under a-card-nobody-drew, and the screen draws none of them after ${firstForecastLinesTestID}`,
        ],
      );
    });
  });
});
