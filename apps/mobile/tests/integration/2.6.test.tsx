import { join } from 'node:path';

import { type DayRecord } from '@emi/crypto';
import { type Flow, addDays } from '@emi/cycle';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID, ringArcTestID, ringBeadTestID } from '../../src/components/CycleRing';
import { readDayLog } from '../../src/data/dayLogRepository';
import {
  dayRefusedBackTestID,
  dayRefusedCopy,
  dayRefusedTestID,
} from '../../src/features/log/DayRefused';
import { flowOptionTestID } from '../../src/features/log/FlowPicker';
import { logFlowDoneTestID, logFlowSavedTestID } from '../../src/features/log/LogFlow';
import { logTodayTestID } from '../../src/features/home/HomeScreen';
import { DayEditError, editFlow, flowOn } from '../../src/features/log/editDay';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { herVault } from '../fixtures/herVault';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const today = dayOf(whenSheOpensIt);

/** Thursday. The day she did not log is the Monday three days behind her. */
const sheForgot = addDays(today, -3);
const sheForgotReads = 'Monday 11 May';

const aDayAhead = addDays(today, 2);
const notADayAtAll = '2026-02-30';

const herCycleLengthDays = 28;
const herPeriodDays = 4;

/** The period before the one she did not log, four weeks before it. */
const herLastPeriodStarted = addDays(sheForgot, -herCycleLengthDays);

/**
 * What the ring says while that Monday holds no bleeding: her last period was four weeks and three
 * days ago, so the cycle she is in has run past the length she expects and the bead is at the end
 * of it. Both readings are the ring's own words, and nothing here computes them.
 */
const theRingBefore = 'Day 32 of 32, luteal';
const theRingAfter = `Day 4 of ${herCycleLengthDays}, follicular`;

/**
 * Six periods she recorded, four days of bleeding each, twenty eight days apart. The last of them
 * is the cycle she is still in, so five are complete and the median has something to work from.
 */
function herSixPeriods(): DayRecord[] {
  const records: DayRecord[] = [];

  for (let back = 5; back >= 0; back -= 1) {
    const started = addDays(herLastPeriodStarted, -back * herCycleLengthDays);

    for (let day = 0; day < herPeriodDays; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }

  return records;
}

/** She opened that Monday at the time and said there was no bleeding. Her period had started. */
function sheSaidNothingHappened(overrides: Partial<DayRecord> = {}): DayRecord {
  return { day: sheForgot, flow: 'none', recordedAt: `${sheForgot}T21:00:00.000Z`, ...overrides };
}

interface OpenApp {
  readonly pathname: () => string;
}

async function sheOpens(day: string): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: `/day/${day}` });
  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function shePicks(flow: Flow): Promise<void> {
  await shePresses(flowOptionTestID(flow));
}

/** What the ring says about the day she is on, read off the ring rather than off the arithmetic. */
function theRingSays(): string {
  return String(screen.getByTestId(cycleRingTestID).props.accessibilityLabel);
}

function theRingShape(): { arc: string; bead: { x: number; y: number } } {
  const bead = screen.getByTestId(ringBeadTestID);

  return {
    arc: String(screen.getByTestId(ringArcTestID('period', 'elapsed')).props.d),
    bead: { x: Number(bead.props.cx), y: Number(bead.props.cy) },
  };
}

function whatWasRecordedOn(day: string): DayRecord | undefined {
  const row = readDayLog(herDatabase(), day);

  return row ? herVault().open(row.payload) : undefined;
}

function theRevisionOf(day: string): number | undefined {
  return readDayLog(herDatabase(), day)?.revision;
}

function everyControlOnTheScreen() {
  return [...screen.queryAllByRole('radio'), ...screen.queryAllByRole('button')];
}

describe('a past day is edited and a future day is refused', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement is proven in step 2.4. Here it arrives already open, so what the
    // test reads off it is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('she opens the Monday she got wrong', () => {
    it('names the day she is looking at, and not today', async () => {
      await herPhoneHolds(whenSheOpensIt, [...herSixPeriods(), sheSaidNothingHappened()]);

      await sheOpens(sheForgot);

      expect(screen.getByText(sheForgotReads)).toBeTruthy();
    });

    it('opens on the answer that day already holds', async () => {
      await herPhoneHolds(whenSheOpensIt, [...herSixPeriods(), sheSaidNothingHappened()]);

      await sheOpens(sheForgot);

      expect(screen.getByTestId(flowOptionTestID('none'))).toBeChecked();
      expect(screen.getByTestId(flowOptionTestID('heavy'))).not.toBeChecked();
    });

    it('draws the cycle she is in today, because that is what a wrong Monday moved', async () => {
      await herPhoneHolds(whenSheOpensIt, [...herSixPeriods(), sheSaidNothingHappened()]);

      await sheOpens(sheForgot);

      expect(theRingSays()).toBe(theRingBefore);
    });
  });

  describe('she says that Monday was the day her period came back', () => {
    it('writes that Monday, and leaves today alone', async () => {
      await herPhoneHolds(whenSheOpensIt, [...herSixPeriods(), sheSaidNothingHappened()]);
      await sheOpens(sheForgot);

      await shePicks('heavy');

      expect(whatWasRecordedOn(sheForgot)).toEqual({
        day: sheForgot,
        flow: 'heavy',
        recordedAt: whenSheOpensIt.toISOString(),
      });
      expect(whatWasRecordedOn(today)).toBeUndefined();
    });

    it('raises the revision of the day she changed', async () => {
      await herPhoneHolds(whenSheOpensIt, [...herSixPeriods(), sheSaidNothingHappened()]);
      await sheOpens(sheForgot);
      expect(theRevisionOf(sheForgot)).toBe(1);

      await shePicks('heavy');

      expect(theRevisionOf(sheForgot)).toBe(2);
    });

    it('keeps the symptoms that day already held', async () => {
      await herPhoneHolds(whenSheOpensIt, [
        ...herSixPeriods(),
        sheSaidNothingHappened({ symptoms: ['cramps', 'low-mood'] }),
      ]);
      await sheOpens(sheForgot);

      await shePicks('heavy');

      expect(whatWasRecordedOn(sheForgot)).toEqual({
        day: sheForgot,
        flow: 'heavy',
        symptoms: ['cramps', 'low-mood'],
        recordedAt: whenSheOpensIt.toISOString(),
      });
    });

    it('redraws the ring, because the cycle she is in now starts on that Monday', async () => {
      await herPhoneHolds(whenSheOpensIt, [...herSixPeriods(), sheSaidNothingHappened()]);
      await sheOpens(sheForgot);
      const before = theRingShape();

      await shePicks('heavy');

      expect(theRingSays()).toBe(theRingAfter);
      expect(theRingShape().arc).not.toBe(before.arc);
      expect(theRingShape().bead).not.toEqual(before.bead);
    });

    it('marks what she picked, and says the day is saved on this phone', async () => {
      await herPhoneHolds(whenSheOpensIt, [...herSixPeriods(), sheSaidNothingHappened()]);
      await sheOpens(sheForgot);

      await shePicks('heavy');

      expect(screen.getByTestId(flowOptionTestID('heavy'))).toBeChecked();
      expect(screen.getByTestId(flowOptionTestID('none'))).not.toBeChecked();
      expect(screen.getByTestId(logFlowSavedTestID)).toBeTruthy();
    });

    it('takes her back to the home screen when she is done with it', async () => {
      await herPhoneHolds(whenSheOpensIt, [...herSixPeriods(), sheSaidNothingHappened()]);
      const app = await sheOpens(sheForgot);
      await shePicks('heavy');

      await shePresses(logFlowDoneTestID);

      expect(app.pathname()).toBe('/');
      expect(screen.getByTestId(logTodayTestID)).toBeTruthy();
      expect(whatWasRecordedOn(sheForgot)?.flow).toBe('heavy');
    });
  });

  describe('a day she logged nothing on at all', () => {
    it('opens empty rather than failing', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriods());

      await sheOpens(sheForgot);

      expect(screen.getByText(sheForgotReads)).toBeTruthy();
      for (const flow of ['none', 'spotting', 'light', 'medium', 'heavy'] as const) {
        expect(screen.getByTestId(flowOptionTestID(flow))).not.toBeChecked();
      }
      expect(screen.queryByTestId(logFlowSavedTestID)).toBeNull();
    });

    it('is written the first time she picks a flow, at the first revision', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens(sheForgot);
      expect(theRevisionOf(sheForgot)).toBeUndefined();

      await shePicks('heavy');

      expect(whatWasRecordedOn(sheForgot)?.flow).toBe('heavy');
      expect(theRevisionOf(sheForgot)).toBe(1);
      expect(theRingSays()).toBe(theRingAfter);
    });
  });

  describe('a day that has not happened yet', () => {
    it('refuses the editor and says why', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriods());

      await sheOpens(aDayAhead);

      expect(screen.getByText(dayRefusedCopy['day-is-in-the-future'].line)).toBeTruthy();
      expect(screen.queryByTestId(flowOptionTestID('heavy'))).toBeNull();
      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
    });

    it('leaves her on the home screen when she presses back, and writes nothing', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriods());
      const app = await sheOpens(aDayAhead);

      await shePresses(dayRefusedBackTestID);

      expect(app.pathname()).toBe('/');
      expect(whatWasRecordedOn(aDayAhead)).toBeUndefined();
    });

    it('refuses the write itself, whatever asked for it', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriods());
      const database = herDatabase();

      const refused = (): unknown =>
        editFlow(database, herVault(), {
          day: aDayAhead,
          flow: 'heavy',
          now: whenSheOpensIt,
          today,
        });

      expect(refused).toThrow(DayEditError);
      expect(refused).toThrow(aDayAhead);
      expect(whatWasRecordedOn(aDayAhead)).toBeUndefined();
    });

    it('refuses to read one too, so nothing opens a day ahead by reading it first', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriods());
      const database = herDatabase();

      expect(() => flowOn(database, herVault(), { day: aDayAhead, today })).toThrow(DayEditError);
      expect(flowOn(database, herVault(), { day: sheForgot, today })).toBeUndefined();
    });
  });

  describe('an address that is not a day in the calendar', () => {
    it('is refused with its own answer rather than an empty editor', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriods());

      await sheOpens(notADayAtAll);

      expect(screen.getByTestId(dayRefusedTestID)).toBeTruthy();
      expect(screen.getByText(dayRefusedCopy['day-is-not-a-date'].line)).toBeTruthy();
      expect(screen.queryByTestId(flowOptionTestID('heavy'))).toBeNull();
    });
  });

  describe('every control she can press on these two screens', () => {
    it('is at least 44 points on both axes, and the failure names any that is not', async () => {
      await herPhoneHolds(whenSheOpensIt, [...herSixPeriods(), sheSaidNothingHappened()]);
      await sheOpens(sheForgot);

      expect(controlsTooSmallToPress(everyControlOnTheScreen())).toEqual([]);
    });

    it('is at least 44 points on the day she cannot open as well', async () => {
      await herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens(aDayAhead);

      expect(controlsTooSmallToPress(everyControlOnTheScreen())).toEqual([]);
    });

    it('is measured against a screen that actually holds controls', async () => {
      await herPhoneHolds(whenSheOpensIt, [...herSixPeriods(), sheSaidNothingHappened()]);
      await sheOpens(sheForgot);

      expect(everyControlOnTheScreen().length).toBeGreaterThan(5);
      expect(() => controlsTooSmallToPress([])).toThrow('nothing to press');
    });
  });
});
