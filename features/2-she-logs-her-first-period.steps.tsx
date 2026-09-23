import { join } from 'node:path';

import { type DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import {
  FULL_TURN_DEGREES,
  GAP_DEGREES,
  MINIMUM_TAP_TARGET,
  RING_OPEN_MILLISECONDS,
  RING_TRACK_WIDTH,
  phaseLabel,
} from '@emi/tokens';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { waitFor, within } from '@testing-library/react-native';

import {
  cycleRingTestID,
  ringArcTestID,
  ringBeadTestID,
  ringTrackTestID,
} from '../apps/mobile/src/components/CycleRing';
import type { Database } from '../apps/mobile/src/data/database';
import {
  DayLogError,
  insertDayLog,
  listDayLogs,
  readDayLog,
  updateDayLog,
} from '../apps/mobile/src/data/dayLogRepository';
import { migrate } from '../apps/mobile/src/data/schema';
import { profileRow, readProfile } from '../apps/mobile/src/data/profileRepository';
import { readSetting, settingKeys } from '../apps/mobile/src/data/settingRepository';
import { dayRefusedBackTestID, dayRefusedCopy } from '../apps/mobile/src/features/log/DayRefused';
import { flowOptionTestID } from '../apps/mobile/src/features/log/FlowPicker';
import { homeScreenTestID } from '../apps/mobile/src/features/home/HomeScreen';
import { longerTestID } from '../apps/mobile/src/features/onboarding/CycleLength';
import { periodLengthTestID } from '../apps/mobile/src/features/onboarding/PeriodLength';
import {
  dayTestID,
  weekCellTestIDs,
  weekTestID,
} from '../apps/mobile/src/features/onboarding/Calendar';
import { HOLD_MILLISECONDS } from '../apps/mobile/src/features/onboarding/HoldToBegin';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../apps/mobile/src/features/onboarding/OnboardingScreen';
import { tourSkipTestID } from '../apps/mobile/src/features/onboarding/TourScreen';
import { firstRunCopy } from '../apps/mobile/src/features/onboarding/copy';
import { defaultCycleLengthDays } from '../apps/mobile/src/features/onboarding/firstRun';
import { resetExpoSqlite } from '../apps/mobile/tests/data/expoSqlite';
import { openTestDatabase } from '../apps/mobile/tests/data/nodeDatabase';
import { aDayRecord } from '../apps/mobile/tests/fixtures/dayRecord';
import { resetExpoSecureStore } from '../apps/mobile/tests/fixtures/expoSecureStore';
import { sheAnswersEveryQuestion } from '../apps/mobile/tests/fixtures/theFirstRun';
import { sheHoldsTheRing } from '../apps/mobile/tests/fixtures/theHold';
import {
  aBleedingDay,
  dayOf,
  herDatabase,
  herPhoneHolds,
} from '../apps/mobile/tests/fixtures/herPhone';
import {
  herVault,
  theProfileVaultOnHerPhone,
  theVaultOnHerPhone,
} from '../apps/mobile/tests/fixtures/herVault';
import { sizedTextIn } from '../apps/mobile/tests/fixtures/renderedText';
import { controlsTooSmallToPress } from '../apps/mobile/tests/fixtures/tapTargets';
import {
  type Box,
  aSmallIPhone,
  anIPhone16,
  theRow,
} from '../apps/mobile/tests/fixtures/theWidthOfARow';

jest.mock('expo-sqlite', () => jest.requireActual('../apps/mobile/tests/data/expoSqlite'));
jest.mock('expo-secure-store', () =>
  jest.requireActual('../apps/mobile/tests/fixtures/expoSecureStore'),
);
jest.mock('expo-crypto', () => jest.requireActual('../apps/mobile/tests/fixtures/expoCrypto'));

const feature = loadFeature(join(__dirname, '2-she-logs-her-first-period.feature'));

const appDirectory = join(__dirname, '..', 'apps', 'mobile', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** The day she names at her first run, which is five days behind the day she opens Emi. */
const herPeriodStarted = addDays(today, -5);
const sheSaysHerCycleRuns = defaultCycleLengthDays + 2;

/** When the hold ends, which is the instant everything she answered is written at. */
const whenSheFinishesTheHold = new Date(whenSheOpensIt.getTime() + HOLD_MILLISECONDS);

/** Thursday. The day she did not log is the Monday three days behind her. */
const sheForgot = addDays(today, -3);
const aDayAhead = addDays(today, 2);
const notADayAtAll = '2026-02-30';

/** The four words a stranger at arm's length must not be able to read, and the size floor. */
const theWordsAStrangerWouldRead = ['period', 'bleeding', 'fertile', 'ovulation'];
const theLargestTheyMayBeDrawn = 14;

const septemberTheFourteenth = '2026-09-14';
const wroteAt = new Date('2026-09-14T08:15:00.000Z');
const changedAt = new Date('2026-09-14T19:40:30.250Z');

interface HerCycles {
  readonly cycleLengthDays: number;
  readonly periodDays: number;
  /** The day of the open cycle she is standing on when she opens Emi. */
  readonly dayOfCycle: number;
}

/**
 * Her days, counted backwards from the day she opens Emi, so the cycle she is in is the one the
 * scenario names. Six complete cycles sit behind it, which is what the forecast reads from.
 */
function herRecordedDays(her: HerCycles): DayRecord[] {
  const thisCycleStarted = addDays(today, -(her.dayOfCycle - 1));
  const records: DayRecord[] = [];

  for (let back = 6; back >= 1; back -= 1) {
    const started = addDays(thisCycleStarted, -back * her.cycleLengthDays);

    for (let day = 0; day < her.periodDays; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }

  for (let day = 0; day < Math.min(her.periodDays, her.dayOfCycle); day += 1) {
    records.push(aBleedingDay(addDays(thisCycleStarted, day)));
  }

  return records;
}

/** Six periods, four days each, and a Monday she opened at the time and said nothing happened on. */
function herSixPeriodsAndAWrongMonday(): DayRecord[] {
  const cycleLengthDays = 28;
  const herLastPeriodStarted = addDays(sheForgot, -cycleLengthDays);
  const records: DayRecord[] = [];

  for (let back = 5; back >= 0; back -= 1) {
    const started = addDays(herLastPeriodStarted, -back * cycleLengthDays);

    for (let day = 0; day < 4; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }

  records.push({ day: sheForgot, flow: 'none', recordedAt: `${sheForgot}T21:00:00.000Z` });

  return records;
}

interface OpenApp {
  readonly pathname: () => string;
  /** She puts the phone down and the application goes away. Her phone keeps what was written. */
  readonly close: () => Promise<void>;
}

/**
 * renderRouter hangs its own readers on the promise it returns, so the promise is kept and the
 * resolved view is kept beside it.
 */
async function sheOpens(at: string): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: at });
  const view = await app;

  return { pathname: () => app.getPathname(), close: () => view.unmount() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheAnswersEveryQuestionOfTheFirstRun(): Promise<void> {
  await sheAnswersEveryQuestion({
    periodStartedOn: herPeriodStarted,
    cycleLengthDays: sheSaysHerCycleRuns,
  });
}

/** What the ring says about the day she is on, read off the ring and not off the arithmetic. */
function theRingSays(): string {
  return String(screen.getByTestId(cycleRingTestID).props.accessibilityLabel);
}

/** One arc of the track, as it was drawn, measured in degrees clockwise from twelve o'clock. */
interface DrawnArc {
  readonly phase: string;
  readonly startDegrees: number;
  readonly sweepDegrees: number;
}

/** The ring is square, so the canvas it was drawn on gives its centre and its radius. */
function theRingCanvas(): { centre: number; radius: number } {
  const style = StyleSheet.flatten(screen.getByTestId(cycleRingTestID).props.style) ?? {};
  const diameter = Number((style as { height?: unknown }).height);

  return { centre: diameter / 2, radius: (diameter - RING_TRACK_WIDTH) / 2 };
}

/** Where a point on the drawing sits on the ring, clockwise from twelve o'clock. */
function degreesAt(x: number, y: number): number {
  const { centre } = theRingCanvas();
  const turned = (Math.atan2(y - centre, x - centre) * 180) / Math.PI + 90;

  return (turned + FULL_TURN_DEGREES) % FULL_TURN_DEGREES;
}

/** The two ends of one drawn path, read off the `d` the renderer put on the glass. */
function endsOf(path: string): { from: number; to: number } {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g) ?? [];

  if (numbers.length < 9) {
    throw new Error(`${JSON.stringify(path)} is not an arc this ring drew`);
  }

  return {
    from: degreesAt(Number(numbers[0]), Number(numbers[1])),
    to: degreesAt(Number(numbers[7]), Number(numbers[8])),
  };
}

/**
 * The arcs the ring actually drew, measured off the paths rather than recomputed. A phase draws
 * the days she has lived, the days ahead of her, or both, and the two together are its one arc.
 */
function theArcsOnTheRing(): DrawnArc[] {
  const drawn: DrawnArc[] = [];

  for (const phase of ['period', 'follicular', 'ovulation', 'luteal'] as const) {
    const elapsed = screen.queryByTestId(ringArcTestID(phase, 'elapsed'));
    const ahead = screen.queryByTestId(ringArcTestID(phase, 'ahead'));

    if (elapsed === null && ahead === null) {
      continue;
    }

    const first = endsOf(String((elapsed ?? ahead)?.props.d));
    const last = endsOf(String((ahead ?? elapsed)?.props.d));
    const sweep = (last.to - first.from + FULL_TURN_DEGREES) % FULL_TURN_DEGREES;

    drawn.push({ phase, startDegrees: first.from, sweepDegrees: sweep });
  }

  return drawn.sort((one, other) => one.startDegrees - other.startDegrees);
}

/** The ground between one arc and the next, and between the last arc and the first. */
function theGroundBetweenTheArcs(): number[] {
  const arcs = theArcsOnTheRing();

  return arcs.map((arc, at) => {
    const next = arcs[(at + 1) % arcs.length] as DrawnArc;
    const ends = arc.startDegrees + arc.sweepDegrees;

    return (next.startDegrees - ends + FULL_TURN_DEGREES) % FULL_TURN_DEGREES;
  });
}

/** Where the bead sits on the ring, read off the circle the renderer drew. */
function theBeadDegrees(): number {
  const bead = screen.getByTestId(ringBeadTestID);

  return degreesAt(Number(bead.props.cx), Number(bead.props.cy));
}

/** The way out of the tour, which is on every card and leaves her on the first question. */
async function sheSkipsTheTour(): Promise<void> {
  await shePresses(tourSkipTestID);
}

function everyControlOnTheScreen() {
  return [...screen.queryAllByRole('radio'), ...screen.queryAllByRole('button')];
}

/**
 * A week of the month she is looking at, with the seven boxes that stand in it. The grid keeps a
 * box for a day the month has no room for, so a week holds seven of them whatever month it is.
 */
function aWeekOfTheMonth(): { row: Box; cells: Box[] } {
  const rows = screen.getAllByTestId(weekTestID);
  const last = rows.at(-1);

  if (last === undefined) {
    throw new Error('the calendar drew no weeks, so there was no row to measure');
  }

  return {
    row: last as unknown as Box,
    cells: within(last).getAllByTestId(weekCellTestIDs) as unknown as Box[],
  };
}

function whatWasRecordedOn(day: string): DayRecord | undefined {
  const row = readDayLog(herDatabase(), day);

  return row ? herVault().open(row.payload) : undefined;
}

function theRevisionOf(day: string): number | undefined {
  return readDayLog(herDatabase(), day)?.revision;
}

/** A table on its own, opened and migrated, with no screen and no phone around it. */
function aMigratedTable(): Database {
  const database = openTestDatabase();
  migrate(database);

  return database;
}

function anEnvelopeFor(day: string, flow: DayRecord['flow']): Uint8Array {
  return herVault().seal(aDayRecord({ day, flow, recordedAt: `${day}T08:15:00.000Z` }));
}

function refusalOf(act: () => unknown): string {
  try {
    act();
  } catch (error) {
    if (error instanceof DayLogError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the write was accepted, and a refusal was expected');
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  resetExpoSqlite();
  resetExpoSecureStore();
  // The ring's one movement is its own pair of scenarios below. Everywhere else it arrives
  // already open, so what a step reads off it is the shape and never a frame of an animation.
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

defineFeature(feature, (test) => {
  test('SCREEN-1, her first run ends on the home screen with her period recorded', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and('she answers every question of the first run', async () => {
      await sheAnswersEveryQuestionOfTheFirstRun();
    });

    and('she presses and holds the ring', async () => {
      await sheHoldsTheRing();
    });

    then('she is looking at the home screen', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('her phone holds the day she said her period started', async () => {
      const row = readDayLog(herDatabase(), herPeriodStarted);
      // The key is the one her first run drew, read back out of the keychain, because no
      // scenario knows it in advance.
      const vault = await theVaultOnHerPhone();

      expect(row && vault.open(row.payload)).toEqual({
        day: herPeriodStarted,
        flow: 'medium',
        recordedAt: whenSheFinishesTheHold.toISOString(),
      });
    });

    and('her phone holds the cycle length she gave', async () => {
      expect(readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.cycleLengthDays).toBe(
        sheSaysHerCycleRuns,
      );
    });
  });

  test('SCREEN-1, she answers everything, leaves before the hold, and nothing is written', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and('she answers every question of the first run', async () => {
      await sheAnswersEveryQuestionOfTheFirstRun();
      expect(app.pathname()).toBe('/onboarding/hold');
    });

    and('she closes Emi at the hold, without holding the ring', async () => {
      await app.close();
    });

    then('her phone holds no day, no answers and no marker', () => {
      expect(listDayLogs(herDatabase())).toEqual([]);
      expect(profileRow(herDatabase())).toBeUndefined();
      expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBeUndefined();
    });

    and('opening Emi again asks her the same questions', async () => {
      const again = await sheOpens('/');

      expect(again.pathname()).toBe('/onboarding/welcome');
    });
  });

  test('SCREEN-1, she presses Done twice and her first run is written once', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and(
      'she answers every question, and presses Done a second time before the screen goes',
      async () => {
        await shePresses(onboardingActionTestID);
        await shePresses(onboardingSkipTestID);
        await shePresses(onboardingSkipTestID);
        await shePresses(dayTestID(herPeriodStarted));
        await shePresses(onboardingActionTestID);
        await shePresses(onboardingSkipTestID);

        for (let pressed = defaultCycleLengthDays; pressed < sheSaysHerCycleRuns; pressed += 1) {
          await shePresses(longerTestID);
        }

        await shePresses(onboardingActionTestID);

        // Both presses land before the screen redraws. That is what her second press meets
        // while the question after it is still on its way.
        const done = screen.getByTestId(onboardingActionTestID);
        await act(async () => {
          fireEvent.press(done);
          fireEvent.press(done);
        });
        await shePresses(onboardingSkipTestID);
      },
    );

    and('she presses and holds the ring', async () => {
      await sheHoldsTheRing();
    });

    then('she is looking at the home screen', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('her phone holds one day, the day she said her period started', () => {
      expect(listDayLogs(herDatabase()).map((row) => row.day)).toEqual([herPeriodStarted]);
    });

    and(
      'her phone holds the time of the hold, and one instant on all three of her answers',
      async () => {
        const row = readDayLog(herDatabase(), herPeriodStarted);
        const vault = await theVaultOnHerPhone();

        expect(readSetting(herDatabase(), 'firstRunCompletedAt')).toBe(
          whenSheFinishesTheHold.toISOString(),
        );
        expect(row && vault.open(row.payload).recordedAt).toBe(
          whenSheFinishesTheHold.toISOString(),
        );
        expect(
          (await theProfileVaultOnHerPhone()) &&
            readProfile(herDatabase(), await theProfileVaultOnHerPhone())?.recordedAt,
        ).toBe(whenSheFinishesTheHold.toISOString());
      },
    );
  });

  test('SCREEN-1, the first run asks its questions and the hold after them', ({
    given,
    when,
    and,
    then,
  }) => {
    let app: OpenApp;
    const visited: string[] = [];
    const whatEachScreenSaid: string[] = [];

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
      visited.push(app.pathname());
      whatEachScreenSaid.push(screen.getByText(firstRunCopy.welcome.title).props.children);
    });

    and('she answers every question of the first run', async () => {
      await shePresses(onboardingActionTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingActionTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
      await shePresses(onboardingSkipTestID);
      visited.push(app.pathname());
    });

    and('she presses and holds the ring', async () => {
      await sheHoldsTheRing();
    });

    then(
      'she was asked what Emi is, her name, the year she was born, when her last period started, when the period before that started, how long her cycle runs, how long her period lasts, and how steady her cycle is',
      () => {
        expect(visited).toEqual([
          '/onboarding/welcome',
          '/onboarding/name',
          '/onboarding/year-of-birth',
          '/onboarding/last-period',
          '/onboarding/period-before',
          '/onboarding/cycle-length',
          '/onboarding/period-length',
          '/onboarding/regularity',
          '/onboarding/hold',
        ]);
        expect(whatEachScreenSaid).toEqual([firstRunCopy.welcome.title]);
      },
    );

    and('there was no further question to answer', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });
  });

  test('SCREEN-1, the first run asks for no account, no email address and no password', ({
    given,
    when,
    and,
    then,
  }) => {
    const everyFieldShePassed: string[] = [];

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
      everyFieldShePassed.push(...fieldsDrawn());
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
    });

    and('she answers every question of the first run', async () => {
      await shePresses(onboardingActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());

      for (let pressed = defaultCycleLengthDays; pressed < sheSaysHerCycleRuns; pressed += 1) {
        await shePresses(longerTestID);
      }

      await shePresses(onboardingActionTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
      await shePresses(onboardingSkipTestID);
      everyFieldShePassed.push(...fieldsDrawn());
    });

    and('she presses and holds the ring', async () => {
      await sheHoldsTheRing();
    });

    then('the only thing she could type into was her name', () => {
      expect([...new Set(everyFieldShePassed)]).toEqual([firstRunCopy.name.label]);
      // She reached the home screen, so the run is finished, and the only two answers her
      // phone holds are the two the questions asked her for.
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(settingKeys.filter((key) => /account|email|password|sign.?in/i.test(key))).toEqual([]);
    });
  });

  test('SCREEN-2, the home screen shows the ring, the day of her cycle and the phase she is in', ({
    given,
    when,
    then,
    and,
  }) => {
    let app: OpenApp;

    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    when('she opens Emi', async () => {
      app = await sheOpens('/');
    });

    then('she is looking at the home screen', () => {
      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });

    and('the ring says she is on day 2 of 28, in the period phase', () => {
      expect(theRingSays()).toBe('Day 2 of 28, period');
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText(phaseLabel.period)).toBeTruthy();
    });

    and('the ring is drawn on the screen she is looking at', () => {
      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
      expect(theArcsOnTheRing().length).toBeGreaterThan(0);
    });
  });

  test('SCREEN-2, no word a stranger could read is drawn above 14 points', ({
    given,
    when,
    then,
    and,
  }) => {
    let drawn: { text: string; points: number | undefined }[] = [];

    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
      drawn = sizedTextIn(screen.toJSON()).filter(({ text }) =>
        theWordsAStrangerWouldRead.some((word) => text.toLowerCase().includes(word)),
      );
    });

    then(
      'the words period, bleeding, fertile and ovulation are all drawn at 14 points or less',
      () => {
        expect(
          drawn.filter((run) => run.points === undefined || run.points > theLargestTheyMayBeDrawn),
        ).toEqual([]);
      },
    );

    and('at least one of those words is on the screen, so the measurement is of something', () => {
      expect(drawn.length).toBeGreaterThan(0);
    });
  });

  test('SCREEN-4, she opens the day she got wrong and the ring is redrawn', ({
    given,
    when,
    and,
    then,
  }) => {
    given('her phone holds six periods and a Monday she said nothing happened on', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());
    });

    when('she opens that Monday', async () => {
      await sheOpens(`/day/${sheForgot}`);
    });

    and('she says her period came back that day', async () => {
      await shePresses(flowOptionTestID('heavy'));
    });

    then('that Monday holds the flow she picked', () => {
      expect(whatWasRecordedOn(sheForgot)).toEqual({
        day: sheForgot,
        flow: 'heavy',
        recordedAt: whenSheOpensIt.toISOString(),
      });
    });

    and('the ring says she is on day 4 of 28, in the follicular phase', () => {
      expect(theRingSays()).toBe('Day 4 of 28, follicular');
      expect(screen.getByText(phaseLabel.follicular)).toBeTruthy();
    });
  });

  test('SCREEN-4, an edit raises the revision of the day she changed', ({
    given,
    when,
    and,
    then,
  }) => {
    given('her phone holds six periods and a Monday she said nothing happened on', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());
    });

    when('she opens that Monday', async () => {
      await sheOpens(`/day/${sheForgot}`);
      expect(theRevisionOf(sheForgot)).toBe(1);
    });

    and('she says her period came back that day', async () => {
      await shePresses(flowOptionTestID('heavy'));
    });

    then('that Monday is at revision 2', () => {
      expect(theRevisionOf(sheForgot)).toBe(2);
    });

    and('today holds nothing, because she edited a Monday and not today', () => {
      expect(whatWasRecordedOn(today)).toBeUndefined();
    });
  });

  test('SCREEN-4, a day that has not happened yet is refused', ({ given, when, then, and }) => {
    let app: OpenApp;

    given('her phone holds six periods and a Monday she said nothing happened on', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());
    });

    when('she opens a day two days ahead of today', async () => {
      app = await sheOpens(`/day/${aDayAhead}`);
    });

    then('she is told the day has not happened yet', () => {
      expect(screen.getByText(dayRefusedCopy['day-is-in-the-future'].line)).toBeTruthy();
    });

    and('there is nothing on that screen to pick a flow with', () => {
      expect(screen.queryByTestId(flowOptionTestID('heavy'))).toBeNull();
      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
    });

    and('pressing back leaves her on the home screen with nothing written', async () => {
      await shePresses(dayRefusedBackTestID);

      expect(app.pathname()).toBe('/');
      expect(whatWasRecordedOn(aDayAhead)).toBeUndefined();
    });
  });

  test('SCREEN-4, an address that is not a day in the calendar is refused', ({
    given,
    when,
    then,
    and,
  }) => {
    given('her phone holds six periods and a Monday she said nothing happened on', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriodsAndAWrongMonday());
    });

    when('she opens the thirtieth of February', async () => {
      await sheOpens(`/day/${notADayAtAll}`);
    });

    then('she is told that is not a day', () => {
      expect(screen.getByText(dayRefusedCopy['day-is-not-a-date'].line)).toBeTruthy();
    });

    and('there is nothing on that screen to pick a flow with', () => {
      expect(screen.queryByTestId(flowOptionTestID('heavy'))).toBeNull();
    });
  });

  test('BRAND-3, her own cycle sizes the four arcs', ({ given, when, then }) => {
    given('her phone holds six cycles of forty five days', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 30 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('the ring draws four arcs, each one sized by the days of that phase', () => {
      const arcs = theArcsOnTheRing();
      const forArcs = FULL_TURN_DEGREES - 4 * GAP_DEGREES;

      expect(arcs.map((arc) => arc.phase)).toEqual(['period', 'follicular', 'ovulation', 'luteal']);
      expect(arcs.map((arc) => Math.round(arc.sweepDegrees * 100) / 100)).toEqual(
        [6, 21, 7, 11].map((days) => Math.round(((forArcs * days) / 45) * 100) / 100),
      );
      expect(new Set(arcs.map((arc) => arc.sweepDegrees)).size).toBe(4);
    });
  });

  test('BRAND-3, the arcs and the ground between them cover the whole ring', ({
    given,
    when,
    then,
  }) => {
    given('her phone holds six cycles of forty five days', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 30 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('the arcs and the gaps between them come to a whole turn', () => {
      const arcs = theArcsOnTheRing();
      const ground = theGroundBetweenTheArcs();
      const drawn = arcs.reduce((total, arc) => total + arc.sweepDegrees, 0);

      expect(drawn + ground.reduce((total, gap) => total + gap, 0)).toBeCloseTo(
        FULL_TURN_DEGREES,
        6,
      );
    });
  });

  test('BRAND-3, a phase her cycle had no room for is not drawn', ({ given, when, then, and }) => {
    given('her phone holds six cycles of twenty one days', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 21, periodDays: 4, dayOfCycle: 3 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('a phase of no days is not drawn at all', () => {
      expect(screen.queryByTestId(ringArcTestID('follicular', 'elapsed'))).toBeNull();
      expect(screen.queryByTestId(ringArcTestID('follicular', 'ahead'))).toBeNull();
      expect(theArcsOnTheRing().map((arc) => arc.phase)).not.toContain('follicular');
    });

    and('the arcs and the gaps between them come to a whole turn', () => {
      expect(theArcsOnTheRing()).toHaveLength(3);
      const arcs = theArcsOnTheRing();
      const ground = theGroundBetweenTheArcs();
      const drawn = arcs.reduce((total, arc) => total + arc.sweepDegrees, 0);

      expect(drawn + ground.reduce((total, gap) => total + gap, 0)).toBeCloseTo(
        FULL_TURN_DEGREES,
        6,
      );
    });
  });

  test('BRAND-3, the bead sits on the day she is on and never outside her cycle', ({
    given,
    when,
    then,
    and,
  }) => {
    let early = 0;

    given('her phone holds six cycles of forty five days', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 3 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
      early = theBeadDegrees();
    });

    then('the bead sits on the day the ring says she is on', () => {
      expect(theRingSays()).toBe('Day 3 of 45, period');

      const period = theArcsOnTheRing().find((arc) => arc.phase === 'period') as DrawnArc;

      expect(early).toBeGreaterThanOrEqual(period.startDegrees);
      expect(early).toBeLessThanOrEqual(period.startDegrees + period.sweepDegrees);
    });

    and('the bead moves further round the ring on a later day', async () => {
      resetExpoSqlite();
      resetExpoSecureStore();
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 30 }),
      );
      await sheOpens('/');

      const later = theBeadDegrees();
      const ovulation = theArcsOnTheRing().find((arc) => arc.phase === 'ovulation') as DrawnArc;

      expect(theRingSays()).toBe('Day 30 of 45, ovulation');
      expect(later).toBeGreaterThan(early);
      expect(later).toBeLessThanOrEqual(ovulation.startDegrees + ovulation.sweepDegrees);
    });
  });

  test('SEE-1, every boundary between two phases is a gap in the ring', ({ given, when, then }) => {
    given('her phone holds six cycles of forty five days', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 45, periodDays: 6, dayOfCycle: 30 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('every boundary between two phases is a gap of ground and not a change of colour', () => {
      const ground = theGroundBetweenTheArcs();

      expect(ground.length).toBeGreaterThan(1);

      for (const gap of ground) {
        // Ground first, and the measured width second. A boundary of no degrees is a change of
        // colour and nothing else, and it agrees with the token that says how wide a gap is.
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeCloseTo(GAP_DEGREES, 2);
      }
    });
  });

  test('SEE-1, the ring names in words the phase she is in', ({ given, when, then, and }) => {
    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('the phase she is in is written inside the ring in words', () => {
      expect(screen.getByText(phaseLabel.period)).toBeTruthy();
      expect(screen.queryByText(phaseLabel.luteal)).toBeNull();
    });

    and('a screen reader is told the day and the phase in the same sentence', () => {
      expect(theRingSays()).toBe('Day 2 of 28, period');
    });
  });

  test('SEE-3, every control of the first run is at least 44 points on both axes', ({
    given,
    when,
    and,
    then,
  }) => {
    const measured: string[][] = [];

    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    and('she skips the tour Emi opens with', async () => {
      await sheSkipsTheTour();
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingActionTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingSkipTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingSkipTestID);
      await shePresses(dayTestID(herPeriodStarted));
      await shePresses(onboardingActionTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingSkipTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));

      await shePresses(onboardingActionTestID);
      measured.push(controlsTooSmallToPress(everyControlOnTheScreen()));
    });

    then('every control on each screen of the first run is at least 44 points on both axes', () => {
      expect(measured).toEqual([[], [], [], [], [], []]);
      expect(screen.getByTestId(periodLengthTestID)).toBeTruthy();
    });
  });

  test('SEE-3, a square of the calendar keeps its height and takes its width from the month', ({
    given,
    when,
    and,
    then,
  }) => {
    given('she has never opened Emi before', () => undefined);

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    and('she reaches the question about her last period', async () => {
      await sheSkipsTheTour();
      await shePresses(onboardingActionTestID);
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
    });

    then('every square of the month is as high as a thumb needs', () => {
      for (const square of screen.getAllByTestId(/^day-\d/)) {
        expect(StyleSheet.flatten(square.props.style)).toMatchObject({
          minHeight: MINIMUM_TAP_TARGET,
        });
      }
    });

    and(
      'the seven squares of a week fill the width the calendar gives them on an iPhone 16',
      () => {
        const { row, cells } = aWeekOfTheMonth();

        expect(cells).toHaveLength(7);
        expect(theRow(row, cells, anIPhone16.width).rightEdge).toBe(
          theRow(row, cells, anIPhone16.width).width,
        );
      },
    );

    and('no square ends past the right edge of the calendar', () => {
      const { row, cells } = aWeekOfTheMonth();

      for (const phone of [anIPhone16, aSmallIPhone]) {
        const measured = theRow(row, cells, phone.width);

        expect(measured.rightEdge).toBeLessThanOrEqual(measured.width);
      }
    });
  });

  test('SEE-3, a control below the floor is named with the size it was drawn at', ({
    given,
    when,
    then,
    and,
  }) => {
    let tooSmall: string[] = [];

    given('a control drawn at 40 points by 44', () => undefined);

    when('the controls on the screen are measured', () => {
      tooSmall = controlsTooSmallToPress([
        {
          props: {
            testID: 'a-control-nobody-measured',
            style: { minHeight: MINIMUM_TAP_TARGET, minWidth: MINIMUM_TAP_TARGET - 4 },
          },
        },
      ]);
    });

    then('the failure names that control and the size it was drawn at', () => {
      expect(tooSmall).toEqual(['a-control-nobody-measured is 40 by 44']);
    });

    and('a screen with nothing to press is refused rather than passed', () => {
      expect(() => controlsTooSmallToPress([])).toThrow('nothing to press');
    });
  });

  /**
   * Every movement the runner saw, less the ones that take no time.
   *
   * The tab navigator asks the same animation to carry a screen in, and the dock is set to move
   * nothing, so those arrive as transitions of zero milliseconds. They are not a movement she can
   * see, and reading them would make this a test of the navigator rather than of the ring.
   */
  function durationsOf(spy: jest.SpyInstance): number[] {
    return spy.mock.calls
      .map((call) => (call[1] as { duration?: number }).duration ?? 0)
      .filter((duration) => duration > 0);
  }

  test('SEE-4, the ring moves once when she opens it', ({ given, and, when, then }) => {
    let timing: jest.SpyInstance;

    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    and('her phone is not asking for less motion', () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
      timing = jest.spyOn(Animated, 'timing');
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('the ring moves once, over six hundred milliseconds', async () => {
      await waitFor(() => expect(timing).toHaveBeenCalled());

      const moved = durationsOf(timing);

      expect(moved.length).toBeGreaterThan(0);
      for (const duration of moved) {
        expect(duration).toBe(RING_OPEN_MILLISECONDS);
      }
    });
  });

  test('SEE-4, the ring stays still when her phone asks for less motion', ({
    given,
    and,
    when,
    then,
  }) => {
    let timing: jest.SpyInstance;

    given('her phone holds six cycles of her own', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        herRecordedDays({ cycleLengthDays: 28, periodDays: 4, dayOfCycle: 2 }),
      );
    });

    and('her phone is asking for less motion', () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      timing = jest.spyOn(Animated, 'timing');
    });

    when('she opens Emi', async () => {
      await sheOpens('/');
    });

    then('the ring does not move at all, and arrives open', async () => {
      await waitFor(() =>
        expect(styleOf(ringTrackTestID)).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] }),
      );
      expect(durationsOf(timing)).toEqual([]);
    });
  });

  test('TABLE-1, her phone keeps the day she logged and raises its revision when she changes it', ({
    given,
    when,
    then,
    and,
  }) => {
    let table: Database;
    let first: { id: string; createdAt: string };

    given('a day log table with nothing in it', () => {
      table = aMigratedTable();
    });

    when('the fourteenth of September is written and then written again', () => {
      const written = insertDayLog(table, {
        day: septemberTheFourteenth,
        payload: anEnvelopeFor(septemberTheFourteenth, 'medium'),
        now: wroteAt,
      });

      first = { id: written.id, createdAt: written.createdAt };

      updateDayLog(table, {
        day: septemberTheFourteenth,
        payload: anEnvelopeFor(septemberTheFourteenth, 'light'),
        now: changedAt,
      });
    });

    then('the day is held once, at revision 2', () => {
      expect(table.all('SELECT day FROM day_log')).toEqual([{ day: septemberTheFourteenth }]);
      expect(readDayLog(table, septemberTheFourteenth)?.revision).toBe(2);
    });

    and('the row keeps the identifier and the creation time it started with', () => {
      const row = readDayLog(table, septemberTheFourteenth);

      expect(row?.id).toBe(first.id);
      expect(row?.createdAt).toBe(first.createdAt);
      expect(row?.updatedAt).toBe(changedAt.toISOString());
    });
  });

  test('TABLE-1, the same day is never held twice', ({ given, when, then }) => {
    let table: Database;
    let refusal: string;

    given('a day log table holding the fourteenth of September', () => {
      table = aMigratedTable();
      insertDayLog(table, {
        day: septemberTheFourteenth,
        payload: anEnvelopeFor(septemberTheFourteenth, 'medium'),
        now: wroteAt,
      });
    });

    when('the fourteenth of September is written a second time', () => {
      refusal = refusalOf(() =>
        insertDayLog(table, {
          day: septemberTheFourteenth,
          payload: anEnvelopeFor(septemberTheFourteenth, 'light'),
          now: changedAt,
        }),
      );
    });

    then('the write is refused, and the table still holds one row', () => {
      expect(refusal).toBe('day-already-written');
      expect(table.all('SELECT day FROM day_log')).toEqual([{ day: septemberTheFourteenth }]);
      expect(readDayLog(table, septemberTheFourteenth)?.revision).toBe(1);
    });
  });

  test('TABLE-1, a day that is not written as a year, a month and a day is refused', ({
    given,
    when,
    then,
    and,
  }) => {
    let table: Database;
    let refusal: string;

    given('a day log table with nothing in it', () => {
      table = aMigratedTable();
    });

    when('a day written as 14-09-2026 is offered to it', () => {
      refusal = refusalOf(() =>
        insertDayLog(table, {
          day: '14-09-2026',
          payload: anEnvelopeFor(septemberTheFourteenth, 'medium'),
          now: wroteAt,
        }),
      );
    });

    then('the write is refused, and the table holds nothing', () => {
      expect(refusal).toBe('day-is-not-a-date');
      expect(table.all('SELECT day FROM day_log')).toEqual([]);
    });

    and('the table itself refuses that day, whatever wrote it', () => {
      expect(() =>
        table.run(
          `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?)`,
          [
            'written-around-the-repository',
            '14-09-2026',
            anEnvelopeFor(septemberTheFourteenth, 'medium'),
            wroteAt.toISOString(),
            wroteAt.toISOString(),
          ],
        ),
      ).toThrow(/CHECK/i);
    });
  });

  test('TABLE-1, a write that does not raise the revision is refused', ({ given, when, then }) => {
    let table: Database;
    let refused: () => unknown;

    given('a day log table holding the fourteenth of September', () => {
      table = aMigratedTable();
      insertDayLog(table, {
        day: septemberTheFourteenth,
        payload: anEnvelopeFor(septemberTheFourteenth, 'medium'),
        now: wroteAt,
      });
    });

    when('that day is changed without raising its revision', () => {
      refused = () =>
        table.run('UPDATE day_log SET payload = ?, revision = revision WHERE day = ?', [
          anEnvelopeFor(septemberTheFourteenth, 'light'),
          septemberTheFourteenth,
        ]);
    });

    then('the table refuses the write and says the revision must rise', () => {
      expect(refused).toThrow(/revision must rise/);
      expect(readDayLog(table, septemberTheFourteenth)?.revision).toBe(1);
    });
  });

  test('TABLE-1, bytes that are not an envelope are refused', ({ given, when, then }) => {
    let table: Database;
    let refusal: string;

    given('a day log table with nothing in it', () => {
      table = aMigratedTable();
    });

    when('a day carrying bytes that are not an envelope is offered to it', () => {
      refusal = refusalOf(() =>
        insertDayLog(table, {
          day: septemberTheFourteenth,
          payload: new Uint8Array([1, 2, 3, 4]),
          now: wroteAt,
        }),
      );
    });

    then('the write is refused, and the table holds nothing', () => {
      expect(refusal).toBe('payload-is-not-an-envelope');
      expect(table.all('SELECT day FROM day_log')).toEqual([]);
    });
  });

  test('TABLE-1, a write that leaves the update time behind the creation time is refused', ({
    given,
    when,
    then,
  }) => {
    let table: Database;
    let refused: () => unknown;

    given('a day log table with nothing in it', () => {
      table = aMigratedTable();
    });

    when('a row whose update time is behind its creation time is offered to it', () => {
      refused = () =>
        table.run(
          `INSERT INTO day_log (id, day, payload, revision, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?)`,
          [
            'written-around-the-repository',
            septemberTheFourteenth,
            anEnvelopeFor(septemberTheFourteenth, 'medium'),
            '2026-09-14T08:15:00.000Z',
            '2026-09-13T08:15:00.000Z',
          ],
        );
    });

    then('the table refuses the write and says so', () => {
      expect(refused).toThrow(/CHECK/i);
      expect(table.all('SELECT day FROM day_log')).toEqual([]);
    });
  });
});

interface Drawn {
  readonly type?: string;
  readonly props?: Record<string, unknown>;
  readonly children?: unknown;
}

/** Every field a rendered screen drew, so a field cannot hide inside anything else. */
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

/** The value an animated style holds right now, which is what she is looking at. */
function styleOf(testID: string): Record<string, unknown> {
  const node = screen.getByTestId(testID);

  return JSON.parse(JSON.stringify(node.props.style ?? {})) as Record<string, unknown>;
}
