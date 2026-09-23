import { join } from 'node:path';

import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { dayTestID } from '../../src/features/onboarding/LastPeriod';
import {
  onboardingActionTestID,
  onboardingBackTestID,
  onboardingProgressTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import {
  type FirstRunScreen,
  firstRunCopy,
  firstRunScreens,
  stepLabel,
} from '../../src/features/onboarding/copy';
import { progressFillTestID } from '../../src/components/ProgressBar';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { sizedTextIn } from '../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';

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
 * Past the welcome and past the two questions she is free to skip, standing on the calendar,
 * which is the question every case below is about.
 */
async function sheReachesTheLastPeriod(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/** How much of the bar is filled on the screen she is looking at, as the screen drew it. */
function theBarIsFilled(): unknown {
  const fill = screen.getByTestId(progressFillTestID(onboardingProgressTestID));

  return (StyleSheet.flatten(fill.props.style) as { width?: unknown }).width;
}

/**
 * Every word drawn on the screen she is looking at. It is read off that screen rather than
 * off the whole tree, because the stack keeps the screens behind it mounted and hidden, and
 * their words are words she is not being shown.
 */
function everyWordOnTheScreen(where: FirstRunScreen): string[] {
  return sizedTextIn(screen.getByTestId(`onboarding-${where}`)).map((run) => run.text);
}

describe('the last period is the one question she cannot skip', () => {
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

  describe('the question that has no way past it', () => {
    it('offers her nothing to skip with, because a forecast needs this day', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheLastPeriod();

      expect(app.pathname()).toBe('/onboarding/last-period');
      expect(screen.queryByTestId(onboardingSkipTestID)).toBeNull();
      expect(everyWordOnTheScreen('lastPeriod')).not.toContain(firstRunCopy.skip);
    });

    it('leaves her on the question when she presses on without answering it', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheLastPeriod();
      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/last-period');
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    it('takes her on to the next question once she has picked a day', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheLastPeriod();
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);

      expect(app.pathname()).toBe('/onboarding/cycle-length');
    });
  });

  describe('the way back through the questions', () => {
    it('is not drawn on the first screen, because nothing sits behind it', async () => {
      await sheOpensEmi();

      expect(screen.queryByTestId(onboardingBackTestID)).toBeNull();
    });

    it('carries her back to the day she picked, with the day still picked', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheLastPeriod();
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingBackTestID);

      expect(app.pathname()).toBe('/onboarding/last-period');
      expect(screen.getByTestId(dayTestID(herPeriodStarted))).toBeSelected();
    });
  });

  describe('how far along she is', () => {
    it('fills more of the bar on each question, and writes no counter beside it', async () => {
      await sheOpensEmi();

      const filled: unknown[] = [theBarIsFilled()];
      const counters: string[] = [];

      for (const [at, where] of firstRunScreens.entries()) {
        expect(everyWordOnTheScreen(where)).not.toContain(stepLabel(where));
        counters.push(...everyWordOnTheScreen(where).filter((word) => /\d+\s*of\s*\d+/.test(word)));
        if (where === 'lastPeriod') {
          await shePresses(dayTestID(herPeriodStarted));
        }
        if (at + 1 < firstRunScreens.length) {
          // The way past a question where it has one, and the answer where it does not, which
          // is the last period and the welcome.
          const skip = screen.queryByTestId(onboardingSkipTestID);
          await fireEvent.press(skip ?? screen.getByTestId(onboardingActionTestID));
          filled.push(theBarIsFilled());
        }
      }

      expect(filled).toEqual(['20%', '40%', '60%', '80%', '100%']);
      expect(counters).toEqual([]);
    });
  });
});
