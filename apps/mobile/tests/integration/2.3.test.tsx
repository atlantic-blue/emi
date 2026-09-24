import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { startsACycle } from '@emi/cycle';

import type { Database } from '../../src/data/database';
import { listDayLogs, readDayLog } from '../../src/data/dayLogRepository';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { readProfile } from '../../src/data/profileRepository';
import { readSetting, writeSetting } from '../../src/data/settingRepository';
import {
  cycleLengthTestID,
  longerTestID,
  shorterTestID,
} from '../../src/features/onboarding/CycleLength';
import {
  dayTestID,
  earlierMonthTestID,
  laterMonthTestID,
  monthTestID,
} from '../../src/features/onboarding/Calendar';
import { firstForecastActionTestID } from '../../src/features/onboarding/FirstForecast';
import { promiseActionTestID } from '../../src/features/onboarding/ThePromise';
import { whatEmiDoesActionTestID } from '../../src/features/onboarding/WhatEmiDoesWithIt';
import { HOLD_MILLISECONDS, holdCoreTestID } from '../../src/features/onboarding/HoldToBegin';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { nameFieldTestID } from '../../src/features/onboarding/HerName';
import {
  type FirstRunScreen,
  firstRunCopy,
  firstRunScreens,
  stepLabel,
} from '../../src/features/onboarding/copy';
import {
  defaultCycleLengthDays,
  longestLookBackDays,
  maximumCycleLengthDays,
  minimumCycleLengthDays,
  oldestPeriodStart,
} from '../../src/features/onboarding/firstRun';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import {
  type Control,
  controlsSizedByTheirRow as sizedByTheirRow,
  controlsTooSmallToPress as tooSmallToPress,
} from '../fixtures/tapTargets';
import { theProfileVaultOnHerPhone, theVaultOnHerPhone } from '../fixtures/herVault';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

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
const tomorrow = dayOf(new Date(whenSheOpensIt.getTime() + millisecondsInADay));
const herPeriodStarted = dayOf(new Date(whenSheOpensIt.getTime() - 5 * millisecondsInADay));
const theOldestDaySheMayPick = oldestPeriodStart(today);
const oneDayTooFarBack = dayOf(
  new Date(whenSheOpensIt.getTime() - (longestLookBackDays + 1) * millisecondsInADay),
);
const herCycleLengthDays = defaultCycleLengthDays + 2;

/** The instant the hold ends, which is the instant everything she answered is written at. */
const whenSheFinishesTheHold = new Date(whenSheOpensIt.getTime() + HOLD_MILLISECONDS);

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

function theScreen(name: FirstRunScreen) {
  return within(screen.getByTestId(`onboarding-${name}`));
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheAnswers(name: FirstRunScreen): Promise<void> {
  await fireEvent.press(theScreen(name).getByTestId(onboardingActionTestID));
}

/**
 * Past the welcome and past the two questions she is free to skip, standing on the calendar.
 * The cases below are about the day she picks there, so the two before it are skipped rather
 * than answered.
 */
async function sheReachesTheLastPeriod(): Promise<void> {
  await sheAnswers('welcome');
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/** The way past the period before, which is the question she may leave unanswered. */
async function sheSkipsThePeriodBefore(): Promise<void> {
  await fireEvent.press(theScreen('periodBefore').getByTestId(onboardingSkipTestID));
}

/** The way past the period length, which says she is not sure. */
async function sheSkipsThePeriodLength(): Promise<void> {
  await fireEvent.press(theScreen('periodLength').getByTestId(onboardingSkipTestID));
}

/** The way past the regularity, which leaves her profile carrying no answer for it. */
async function sheSkipsTheRegularity(): Promise<void> {
  await fireEvent.press(theScreen('regularity').getByTestId(onboardingSkipTestID));
}

/** The way past the feeling, which leaves her profile carrying no answer for it. */
async function sheSkipsTheFeeling(): Promise<void> {
  await fireEvent.press(theScreen('feeling').getByTestId(onboardingSkipTestID));
}

/** The way past the goals, which leaves her home screen as it is. */
async function sheSkipsTheGoals(): Promise<void> {
  await fireEvent.press(theScreen('goals').getByTestId(onboardingSkipTestID));
}

/** The way past the focus, which leaves her log sheet in the order it has for everybody. */
async function sheSkipsTheFocus(): Promise<void> {
  await fireEvent.press(theScreen('focus').getByTestId(onboardingSkipTestID));
}

/** The way past today, which is the last question and leaves today with no row of its own. */
async function sheSkipsToday(): Promise<void> {
  await fireEvent.press(theScreen('today').getByTestId(onboardingSkipTestID));
}

/** The way on from her first forecast, which is a screen she reads rather than answers. */
async function sheReadsHerFirstForecast(): Promise<void> {
  await fireEvent.press(screen.getByTestId(firstForecastActionTestID));
}

/** The promise and what Emi does with it, the last two screens she reads before the hold. */
async function sheReadsThePromise(): Promise<void> {
  await fireEvent.press(screen.getByTestId(promiseActionTestID));
  await fireEvent.press(screen.getByTestId(whatEmiDoesActionTestID));
}

/** The whole first run: every question answered, and the hold that writes the answers. */
async function sheAnswersEveryScreen(): Promise<void> {
  await sheAnswersEveryQuestion({
    periodStartedOn: herPeriodStarted,
    cycleLengthDays: herCycleLengthDays,
  });
  await sheHoldsTheRing();
}

/**
 * Back a month at a time until the heading says the month named. It presses rather than counting,
 * so a calendar that stops paging is a test that fails rather than one that loops.
 */
async function shePagesBackTo(month: string): Promise<void> {
  for (let pressed = 0; pressed < 12; pressed += 1) {
    if (theScreen('lastPeriod').queryByText(month) !== null) {
      return;
    }
    await shePresses(earlierMonthTestID);
  }
  throw new Error(`the calendar never reached ${month}`);
}

/** The thirty one handles the month she opens on holds, in the order the grid draws them. */
function everyDayOfMay(): string[] {
  return Array.from({ length: 31 }, (_unused, index) =>
    dayTestID(`2026-05-${(index + 1).toString().padStart(2, '0')}`),
  );
}

/** Every day square drawn right now, which is one month of them rather than the whole reach. */
function everyDayOnTheScreen(): string[] {
  return screen.queryAllByTestId(/^day-\d{4}-\d{2}-\d{2}$/).map((day) => String(day.props.testID));
}

function herDatabase(): Database {
  return expoDatabase(openDatabaseSync(databaseFileName));
}

/**
 * The four cards of the tour, already read. Every case below is about the three screens that come
 * after them, so the marker is written before she opens Emi and the first thing she sees is the
 * first question. The tour itself is proven in 9.5.
 */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

interface Drawn {
  readonly type?: string;
  readonly props?: Record<string, unknown>;
  readonly children?: unknown;
}

/** Every field she could type into on the screen she is looking at, in the order drawn. */
function fieldsIn(node: unknown): Drawn[] {
  if (Array.isArray(node)) {
    return node.flatMap(fieldsIn);
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }
  const element = node as Drawn;
  const below = fieldsIn(element.children ?? []);

  return element.type === 'TextInput' ? [element, ...below] : below;
}

/** The question above each field, which is the sentence a screen reader reads out for it. */
function fieldsDrawn(): string[] {
  return fieldsIn(screen.toJSON()).map((field) => String(field.props?.accessibilityLabel));
}

/**
 * Every control on the screen she is looking at, named with its size when it is too small to
 * press. The measurement itself is the shared one, which reads a fixed size as well as a minimum,
 * because a control given its size outright is no smaller than one given a floor.
 */
function everyControlOnTheScreen(): Control[] {
  return [...screen.queryAllByRole('button'), ...screen.queryAllByRole('radio')];
}

function controlsTooSmallToPress(): string[] {
  return tooSmallToPress(everyControlOnTheScreen());
}

/**
 * The controls whose width the row they stand in decides. Only the squares of the calendar do, and
 * the width they are left with is measured in `11.13`, so this names them to keep a second one
 * from arriving unnoticed.
 */
function controlsSizedByTheRowTheyStandIn(): string[] {
  return sizedByTheirRow(everyControlOnTheScreen());
}

/** The thirty one squares the grid draws for the month she opens her last period question on. */
function theSquaresOfMay(): string[] {
  return Array.from({ length: 31 }, (_unused, at) =>
    dayTestID(`2026-05-${String(at + 1).padStart(2, '0')}`),
  );
}

/**
 * React Native runs on Hermes, which has no `globalThis.crypto`. Node has one, which is why the
 * cases above pass while her first run threw on the phone. This takes the global away for the
 * length of one walk and puts it back, so what she presses is measured against the runtime she
 * actually holds.
 */
async function onARuntimeWithNoGlobalCrypto(walk: () => Promise<void>): Promise<void> {
  const held = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Reflect.deleteProperty(globalThis, 'crypto');
  try {
    await walk();
  } finally {
    if (held !== undefined) {
      Object.defineProperty(globalThis, 'crypto', held);
    }
  }
}

describe('the first run ends on the home screen with her period recorded', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
    // The hold draws a ring, and a ring asks the phone about motion before it draws anything.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('the first time she opens Emi', () => {
    it('sends her to the first of the three screens, because nothing is recorded yet', async () => {
      const app = await sheOpensEmi();

      expect(app.pathname()).toBe('/onboarding/welcome');
      expect(theScreen('welcome').getByLabelText(stepLabel('welcome'))).toBeTruthy();
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
      const everyFieldShePassed = [...fieldsDrawn()];

      await sheAnswers('welcome');
      everyFieldShePassed.push(...fieldsDrawn());
      // Nothing is hidden as she types, because a name is a greeting and not a passcode.
      expect(screen.getByTestId(nameFieldTestID).props.secureTextEntry).toBeUndefined();

      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');
      everyFieldShePassed.push(...fieldsDrawn());
      await sheSkipsThePeriodBefore();
      everyFieldShePassed.push(...fieldsDrawn());
      await sheAnswers('cycleLength');
      everyFieldShePassed.push(...fieldsDrawn());

      // One field in the whole first run, and it asks her what Emi should call her.
      expect([...new Set(everyFieldShePassed)]).toEqual([firstRunCopy.name.label]);
    });
  });

  describe('she answers every screen and holds the ring', () => {
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
      // The key is the one the first run drew, read back out of the keychain, because no test
      // knows it in advance.
      const vault = await theVaultOnHerPhone();
      expect(row?.day).toBe(herPeriodStarted);
      expect(row && startsACycle(vault.open(row.payload))).toBe(true);
      expect(row && vault.open(row.payload)).toEqual({
        day: herPeriodStarted,
        flow: 'medium',
        recordedAt: whenSheFinishesTheHold.toISOString(),
      });
    });

    it('holds the cycle length she stated', async () => {
      await sheOpensEmi();

      await sheAnswersEveryScreen();

      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.cycleLengthDays).toBe(
        herCycleLengthDays,
      );
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(
        whenSheFinishesTheHold.toISOString(),
      );
    });

    it('asks her twelve questions, holds once, and asks nothing else', async () => {
      const app = await sheOpensEmi();
      const visited = [app.pathname()];

      await sheAnswers('welcome');
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');
      visited.push(app.pathname());
      await sheSkipsThePeriodBefore();
      visited.push(app.pathname());
      await sheAnswers('cycleLength');
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await sheReadsHerFirstForecast();
      visited.push(app.pathname());
      await fireEvent.press(screen.getByTestId(promiseActionTestID));
      visited.push(app.pathname());
      await fireEvent.press(screen.getByTestId(whatEmiDoesActionTestID));
      visited.push(app.pathname());
      await sheHoldsTheRing();

      expect(visited).toEqual([
        '/onboarding/welcome',
        '/onboarding/name',
        '/onboarding/year-of-birth',
        '/onboarding/last-period',
        '/onboarding/period-before',
        '/onboarding/cycle-length',
        '/onboarding/period-length',
        '/onboarding/regularity',
        '/onboarding/feeling',
        '/onboarding/goals',
        '/onboarding/focus',
        '/onboarding/today',
        '/onboarding/first-forecast',
        '/onboarding/the-promise',
        '/onboarding/what-emi-does-with-it',
        '/onboarding/hold',
      ]);
      expect(app.pathname()).toBe('/');
    });

    it('has one screen for each question, the hold and the tour beside them, and one layout', () => {
      const held = readdirSync(join(appDirectory, 'onboarding')).sort();

      // A name opening with an underscore is a layout rather than a route, so she is never sent
      // to it. Every half is named, so a deleted layout fails here as loudly as an unasked
      // question. The five screens that ask her nothing are named on their own and taken out
      // before the questions are counted.
      const asksHerNothing = [
        'tour.tsx',
        'hold.tsx',
        'first-forecast.tsx',
        'the-promise.tsx',
        'what-emi-does-with-it.tsx',
      ];

      for (const name of asksHerNothing) {
        expect(held).toContain(name);
      }

      expect(
        held.filter((name) => !name.startsWith('_') && !asksHerNothing.includes(name)),
      ).toEqual([
        'cycle-length.tsx',
        'feeling.tsx',
        'focus.tsx',
        'goals.tsx',
        'last-period.tsx',
        'name.tsx',
        'period-before.tsx',
        'period-length.tsx',
        'regularity.tsx',
        'today.tsx',
        'welcome.tsx',
        'year-of-birth.tsx',
      ]);
      expect(held).toHaveLength(firstRunScreens.length + asksHerNothing.length + 1);
      expect(held.filter((name) => name.startsWith('_'))).toEqual(['_layout.tsx']);
    });
  });

  describe('she steps forward through the screens', () => {
    it('leaves each screen behind and puts the next one in front of her', async () => {
      await sheOpensEmi();
      expect(screen.getByTestId('onboarding-welcome')).toBeTruthy();

      await sheAnswers('welcome');

      expect(screen.getByTestId('onboarding-name')).toBeTruthy();
      expect(screen.queryByTestId('onboarding-welcome')).toBeNull();

      await shePresses(onboardingSkipTestID);

      expect(screen.getByTestId('onboarding-birthYear')).toBeTruthy();
      expect(screen.queryByTestId('onboarding-name')).toBeNull();

      await shePresses(onboardingSkipTestID);
      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');
      await sheSkipsThePeriodBefore();

      expect(screen.getByTestId('onboarding-cycleLength')).toBeTruthy();
      expect(screen.queryByTestId('onboarding-lastPeriod')).toBeNull();
    });
  });

  describe('she answers all three screens on a runtime with no generator of its own', () => {
    it('records her day, because the vault draws from the phone and not from the runtime', async () => {
      const app = await sheOpensEmi();

      await onARuntimeWithNoGlobalCrypto(sheAnswersEveryScreen);

      expect(app.pathname()).toBe('/');
      const row = readDayLog(herDatabase(), herPeriodStarted);
      const vault = await theVaultOnHerPhone();
      expect(row && vault.open(row.payload)).toEqual({
        day: herPeriodStarted,
        flow: 'medium',
        recordedAt: whenSheFinishesTheHold.toISOString(),
      });
    });
  });

  describe('before she has answered', () => {
    it('does not move on from the day she has not picked', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheLastPeriod();
      await sheAnswers('lastPeriod');

      expect(app.pathname()).toBe('/onboarding/last-period');
    });

    it('keeps the cycle length she is picking inside 21 and 45 days', async () => {
      await sheOpensEmi();
      await sheReachesTheLastPeriod();
      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');
      await sheSkipsThePeriodBefore();

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

    it('offers every day of the month she is in, and no day of any other month', async () => {
      await sheOpensEmi();
      await sheReachesTheLastPeriod();

      expect(theScreen('lastPeriod').getByTestId(monthTestID)).toHaveTextContent('May 2026');
      expect(everyDayOnTheScreen()).toEqual(everyDayOfMay());
      expect(screen.getByTestId(dayTestID(today))).toBeTruthy();
      expect(screen.getByTestId(dayTestID(herPeriodStarted))).toBeTruthy();
    });
  });

  describe('the calendar she picks the day from', () => {
    it('does not take a day after today, so the first run is never asked to refuse one', async () => {
      const app = await sheOpensEmi();
      await sheReachesTheLastPeriod();

      await shePresses(dayTestID(tomorrow));
      await sheAnswers('lastPeriod');

      expect(app.pathname()).toBe('/onboarding/last-period');
    });

    it('does not take a day further back than the first run reaches', async () => {
      const app = await sheOpensEmi();
      await sheReachesTheLastPeriod();
      await shePagesBackTo('February 2026');

      await shePresses(dayTestID(oneDayTooFarBack));
      await sheAnswers('lastPeriod');

      expect(app.pathname()).toBe('/onboarding/last-period');
    });

    it('takes the oldest day it does reach, and records that day', async () => {
      const app = await sheOpensEmi();
      await sheReachesTheLastPeriod();
      await shePagesBackTo('February 2026');

      await shePresses(dayTestID(theOldestDaySheMayPick));
      await sheAnswers('lastPeriod');
      await sheSkipsThePeriodBefore();
      for (let pressed = defaultCycleLengthDays; pressed < herCycleLengthDays; pressed += 1) {
        await shePresses(longerTestID);
      }
      await sheAnswers('cycleLength');
      await sheSkipsThePeriodLength();
      await sheSkipsTheRegularity();
      await sheSkipsTheFeeling();
      await sheSkipsTheGoals();
      await sheSkipsTheFocus();
      await sheSkipsToday();
      await sheReadsHerFirstForecast();
      await sheReadsThePromise();
      await sheHoldsTheRing();

      expect(app.pathname()).toBe('/');
      expect(readDayLog(herDatabase(), theOldestDaySheMayPick)?.day).toBe(theOldestDaySheMayPick);
    });

    it('goes back no further than the month holding that day', async () => {
      await sheOpensEmi();
      await sheReachesTheLastPeriod();
      await shePagesBackTo('February 2026');

      await shePresses(earlierMonthTestID);

      expect(theScreen('lastPeriod').getByTestId(monthTestID)).toHaveTextContent('February 2026');
    });

    it('keeps the day she chose when she pages away from its month and back', async () => {
      const app = await sheOpensEmi();
      await sheReachesTheLastPeriod();
      await shePresses(dayTestID(herPeriodStarted));

      await shePresses(earlierMonthTestID);
      expect(screen.queryByTestId(dayTestID(herPeriodStarted))).toBeNull();
      await shePresses(laterMonthTestID);

      expect(
        screen.getByTestId(dayTestID(herPeriodStarted)).props.accessibilityState,
      ).toMatchObject({ selected: true });

      await sheAnswers('lastPeriod');
      await sheSkipsThePeriodBefore();
      expect(app.pathname()).toBe('/onboarding/cycle-length');
    });
  });

  describe('every control she presses', () => {
    it('is at least 44 points on both axes, on every screen of the first run', async () => {
      await sheOpensEmi();
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheAnswers('welcome');
      expect(controlsTooSmallToPress()).toEqual([]);

      await shePresses(onboardingSkipTestID);
      expect(controlsTooSmallToPress()).toEqual([]);

      await shePresses(onboardingSkipTestID);
      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheSkipsThePeriodBefore();
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheAnswers('cycleLength');
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheSkipsThePeriodLength();
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheSkipsTheRegularity();
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheSkipsTheFeeling();
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheSkipsTheGoals();
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheSkipsTheFocus();
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheSkipsToday();
      expect(controlsTooSmallToPress()).toEqual([]);

      await sheReadsHerFirstForecast();
      expect(controlsTooSmallToPress()).toEqual([]);

      await fireEvent.press(screen.getByTestId(promiseActionTestID));
      expect(controlsTooSmallToPress()).toEqual([]);

      await fireEvent.press(screen.getByTestId(whatEmiDoesActionTestID));
      expect(screen.getByTestId(holdCoreTestID)).toBeTruthy();
      expect(controlsTooSmallToPress()).toEqual([]);
    });

    it('takes its width from its row on the squares of the month and nowhere else', async () => {
      await sheOpensEmi();
      expect(controlsSizedByTheRowTheyStandIn()).toEqual([]);

      await sheReachesTheLastPeriod();

      expect(controlsSizedByTheRowTheyStandIn()).toEqual(theSquaresOfMay());
    });
  });

  describe('the index route, which is where both ends of the first run begin', () => {
    it('shows a woman who has not answered the welcome screen, and nothing of her home', async () => {
      await sheOpensEmi();

      expect(screen.getByTestId('onboarding-welcome')).toBeTruthy();
      expect(screen.queryByTestId('home-screen')).toBeNull();
    });

    it('shows a woman who has answered her home screen, and nothing of the first run', async () => {
      const first = await sheOpensEmi();
      await sheAnswersEveryScreen();
      await first.close();

      await sheOpensEmi();

      expect(screen.getByTestId('home-screen')).toBeTruthy();
      expect(screen.queryByTestId('onboarding-welcome')).toBeNull();
    });
  });

  describe('she presses Done twice, because the first press looked like nothing', () => {
    it('writes her first run once, whatever her second press did', async () => {
      const app = await sheOpensEmi();
      await sheReachesTheLastPeriod();
      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');
      await sheSkipsThePeriodBefore();
      for (let pressed = defaultCycleLengthDays; pressed < herCycleLengthDays; pressed += 1) {
        await shePresses(longerTestID);
      }
      await sheAnswers('cycleLength');
      const done = theScreen('periodLength').getByTestId(onboardingActionTestID);

      // Both presses land before the screen redraws. That is what her second press meets while
      // the hold is still on its way.
      await act(async () => {
        fireEvent.press(done);
        fireEvent.press(done);
      });
      await sheSkipsTheRegularity();
      await sheSkipsTheFeeling();
      await sheSkipsTheGoals();
      await sheSkipsTheFocus();
      await sheSkipsToday();
      await sheReadsHerFirstForecast();
      await sheReadsThePromise();
      await sheHoldsTheRing();

      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId('home-screen')).toBeTruthy();
      expect(listDayLogs(herDatabase()).map((row) => [row.day, row.revision])).toEqual([
        [herPeriodStarted, 1],
      ]);
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(
        whenSheFinishesTheHold.toISOString(),
      );
      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.cycleLengthDays).toBe(
        herCycleLengthDays,
      );
      const vault = await theVaultOnHerPhone();
      const row = readDayLog(herDatabase(), herPeriodStarted);
      expect(row && vault.open(row.payload)).toEqual({
        day: herPeriodStarted,
        flow: 'medium',
        recordedAt: whenSheFinishesTheHold.toISOString(),
      });
    });

    it('leaves Done where she can reach it, because nothing is written on that screen', async () => {
      await sheOpensEmi();
      await sheReachesTheLastPeriod();
      await shePresses(dayTestID(herPeriodStarted));
      await sheAnswers('lastPeriod');
      await sheSkipsThePeriodBefore();
      const done = theScreen('cycleLength').getByTestId(onboardingActionTestID);
      expect(done.props.accessibilityState).toMatchObject({ disabled: false });

      await fireEvent.press(done);

      // Read off the button she pressed. The hold sits on top of this screen rather than
      // replacing it, so a woman who comes back to the question finds Done as she left it. A
      // Done spent by a press that writes nothing is a first run she cannot finish.
      expect(done.props.accessibilityState).toMatchObject({ disabled: false });
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
