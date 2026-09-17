import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { recordFromBytes } from '@emi/crypto';
import { startsACycle } from '@emi/cycle';
import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { StyleSheet } from 'react-native';

import type { Database } from '../../src/data/database';
import { readDayLog } from '../../src/data/dayLogRepository';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { readSetting } from '../../src/data/settingRepository';
import {
  cycleLengthTestID,
  longerTestID,
  shorterTestID,
} from '../../src/features/onboarding/CycleLength';
import { dayTestID } from '../../src/features/onboarding/LastPeriod';
import { onboardingActionTestID } from '../../src/features/onboarding/OnboardingScreen';
import { firstRunCopy } from '../../src/features/onboarding/copy';
import {
  defaultCycleLengthDays,
  maximumCycleLengthDays,
  minimumCycleLengthDays,
} from '../../src/features/onboarding/firstRun';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Well away from any summer time change, so the calendar below reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const millisecondsInADay = 24 * 60 * 60 * 1000;

/** Her clock's day, written out here so the screen's own arithmetic is not the judge of itself. */
function dayOf(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const today = dayOf(whenSheOpensIt);
const herPeriodStarted = dayOf(new Date(whenSheOpensIt.getTime() - 5 * millisecondsInADay));
const herCycleLengthDays = defaultCycleLengthDays + 2;

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

function theScreen(name: 'welcome' | 'lastPeriod' | 'cycleLength') {
  return within(screen.getByTestId(`onboarding-${name}`));
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheAnswers(name: 'welcome' | 'lastPeriod' | 'cycleLength'): Promise<void> {
  await fireEvent.press(theScreen(name).getByTestId(onboardingActionTestID));
}

async function sheAnswersEveryScreen(): Promise<void> {
  await sheAnswers('welcome');
  await shePresses(dayTestID(herPeriodStarted));
  await sheAnswers('lastPeriod');
  for (let pressed = defaultCycleLengthDays; pressed < herCycleLengthDays; pressed += 1) {
    await shePresses(longerTestID);
  }
  await sheAnswers('cycleLength');
}

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

function nodeTypesIn(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap(nodeTypesIn);
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }
  const element = node as { type?: string; children?: unknown };

  return [element.type ?? '', ...nodeTypesIn(element.children ?? [])];
}

/**
 * Every control on the screen she is looking at, named with its size when it is too small to
 * press. A screen with nothing to press is a measurement of nothing, so it fails rather than
 * reporting an empty list.
 */
function controlsTooSmallToPress(): string[] {
  const controls = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('radio')];
  if (controls.length === 0) {
    throw new Error('a screen holding nothing to press was measured for tap targets');
  }

  return controls
    .map((control) => ({
      name: String(control.props.testID ?? control.props.accessibilityLabel ?? 'unnamed'),
      style: StyleSheet.flatten(control.props.style) ?? {},
    }))
    .filter(
      ({ style }) =>
        !(
          Number(style.minWidth) >= MINIMUM_TAP_TARGET &&
          Number(style.minHeight) >= MINIMUM_TAP_TARGET
        ),
    )
    .map(({ name, style }) => `${name} is ${style.minWidth} by ${style.minHeight}`);
}

describe('the first run ends on the home screen with her period recorded', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the first time she opens Emi', () => {
    it('sends her to the first of the three screens, because nothing is recorded yet', async () => {
      const app = await sheOpensEmi();

      expect(app.pathname()).toBe('/onboarding/welcome');
      expect(theScreen('welcome').getByText('Step 1 of 3')).toBeTruthy();
    });

    it('tells her what Emi is and what it will not do', async () => {
      await sheOpensEmi();

      const welcome = theScreen('welcome');
      expect(welcome.getByText(firstRunCopy.welcome.title)).toBeTruthy();
      for (const line of firstRunCopy.welcome.lines) {
        expect(welcome.getByText(line)).toBeTruthy();
      }
    });

    it('asks her for no account, no email address and no password', async () => {
      await sheOpensEmi();

      expect(nodeTypesIn(screen.toJSON())).not.toContain('TextInput');

      await sheAnswers('welcome');
      expect(nodeTypesIn(screen.toJSON())).not.toContain('TextInput');

      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');
      expect(nodeTypesIn(screen.toJSON())).not.toContain('TextInput');
    });
  });

  describe('she answers all three screens', () => {
    it('leaves her on the home screen', async () => {
      const app = await sheOpensEmi();

      await sheAnswersEveryScreen();

      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId('home-screen')).toBeTruthy();
    });

    it('records the day she said her period started', async () => {
      await sheOpensEmi();

      await sheAnswersEveryScreen();

      const row = readDayLog(herDatabase(), herPeriodStarted);
      expect(row?.day).toBe(herPeriodStarted);
      expect(row && startsACycle(recordFromBytes(row.payload))).toBe(true);
      expect(row && recordFromBytes(row.payload)).toEqual({
        day: herPeriodStarted,
        flow: 'medium',
        recordedAt: whenSheOpensIt.toISOString(),
      });
    });

    it('holds the cycle length she stated', async () => {
      await sheOpensEmi();

      await sheAnswersEveryScreen();

      expect(readSetting(herDatabase(), 'cycleLengthDays')).toBe(String(herCycleLengthDays));
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(whenSheOpensIt.toISOString());
    });

    it('asks her three screens and no fourth', async () => {
      const app = await sheOpensEmi();
      const visited = [app.pathname()];

      await sheAnswers('welcome');
      visited.push(app.pathname());
      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');
      visited.push(app.pathname());
      await sheAnswers('cycleLength');

      expect(visited).toEqual([
        '/onboarding/welcome',
        '/onboarding/last-period',
        '/onboarding/cycle-length',
      ]);
      expect(app.pathname()).toBe('/');
    });

    it('has exactly three screens to route to', () => {
      expect(readdirSync(join(appDirectory, 'onboarding')).sort()).toEqual([
        'cycle-length.tsx',
        'last-period.tsx',
        'welcome.tsx',
      ]);
    });
  });

  describe('before she has answered', () => {
    it('does not move on from the day she has not picked', async () => {
      const app = await sheOpensEmi();

      await sheAnswers('welcome');
      await sheAnswers('lastPeriod');

      expect(app.pathname()).toBe('/onboarding/last-period');
    });

    it('keeps the cycle length she is picking inside 21 and 45 days', async () => {
      await sheOpensEmi();
      await sheAnswers('welcome');
      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');

      for (let press = 0; press < maximumCycleLengthDays + 5; press += 1) {
        await shePresses(shorterTestID);
      }
      expect(screen.getByTestId(cycleLengthTestID)).toHaveTextContent(
        `${minimumCycleLengthDays} days`,
      );

      for (let press = 0; press < maximumCycleLengthDays + 5; press += 1) {
        await shePresses(longerTestID);
      }
      expect(screen.getByTestId(cycleLengthTestID)).toHaveTextContent(
        `${maximumCycleLengthDays} days`,
      );
    });

    it('offers every day back to the one she picked, and none after today', async () => {
      await sheOpensEmi();
      await sheAnswers('welcome');

      expect(screen.getByTestId(dayTestID(today))).toBeTruthy();
      expect(screen.getByTestId(dayTestID(herPeriodStarted))).toBeTruthy();
      expect(
        screen.queryByTestId(
          dayTestID(dayOf(new Date(whenSheOpensIt.getTime() + millisecondsInADay))),
        ),
      ).toBeNull();
    });
  });

  describe('every control she presses', () => {
    it('is at least 44 points on both axes, on all three screens', async () => {
      await sheOpensEmi();
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheAnswers('welcome');
      expect(controlsTooSmallToPress()).toEqual([]);

      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');
      expect(controlsTooSmallToPress()).toEqual([]);
    });
  });

  describe('the next time she opens Emi', () => {
    it('goes straight to the home screen', async () => {
      const first = await sheOpensEmi();
      await sheAnswersEveryScreen();
      await first.close();

      const again = await sheOpensEmi();

      expect(again.pathname()).toBe('/');
      expect(screen.getByTestId('home-screen')).toBeTruthy();
    });
  });
});
