import { join } from 'node:path';

import { type DayRecord, recordBytes, recordFromBytes } from '@emi/crypto';
import type { Forecast } from '@emi/cycle';
import { addDays, daysBetween } from '@emi/cycle';
import {
  DAYS_AHEAD_STRENGTH,
  FULL_TURN_DEGREES,
  type PhaseName,
  coveredDegrees,
  phaseLabel,
  ringGeometry,
} from '@emi/tokens';
import { render, screen, within } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID, ringArcTestID, ringBeadTestID } from '../../src/components/CycleRing';
import type { CycleRow } from '../../src/data/cycleRepository';
import { listCycles } from '../../src/data/cycleRepository';
import type { Database } from '../../src/data/database';
import { databaseFileName, expoDatabase } from '../../src/data/expoDatabase';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { logDay, recordedDays } from '../../src/features/cycle/rebuild';
import { type RingInput, ringInputFor } from '../../src/features/cycle/ringInput';
import { learningCyclesWantedTestID, learningTestID } from '../../src/features/forecast/Learning';
import { nextPeriodRangeTestID } from '../../src/features/forecast/NextPeriod';
import { rangeSentence } from '../../src/features/forecast/copy';
import { forecastOf } from '../../src/features/forecast/fromCache';
import {
  HomeScreen,
  homeCopy,
  homeForecastTestID,
  homeNoRingTestID,
  logTodayTestID,
} from '../../src/features/home/HomeScreen';
import { flowOptionTestID } from '../../src/features/log/FlowPicker';
import { logFlowDoneTestID } from '../../src/features/log/LogFlow';
import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import {
  daysOf,
  genuinelyIrregular,
  oneCycleComplete,
  oneLongCycle,
  twoCyclesExactly,
  veryRegular,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { openDatabaseSync, resetExpoSqlite } from '../data/expoSqlite';
import { daysLogged, migratedDatabase, readDay } from '../fixtures/cycleCache';
import { asSheLoggedIt, recordedAt } from '../fixtures/forecast';
import { sizedTextIn } from '../fixtures/renderedText';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Not 28, and not the median of any set below, so a screen showing it read her own answer. */
const sheSaidHerCycleRuns = 31;

/** The day of the cycle she is in when she opens Emi. Every set below is mid follicular on it. */
const theDaySheOpensIt = 8;

/** A cycle running five days past the day the forecast named, which every set below can reach. */
const theDaySheIsLateOn = 33;

/**
 * The four words contract SCREEN-2 keeps small, and the size in points it keeps them under. She
 * reads her own screen from a hand's distance. The person beside her on the bus does not.
 */
const theWordsAStrangerWouldRead: readonly string[] = [
  'period',
  'bleeding',
  'fertile',
  'ovulation',
];
const theLargestTheyMayBeDrawn = 14;

/**
 * The two days of her cycle on which the ring writes one of the four words inside itself. A day in
 * the follicular phase proves nothing here, because the word it writes is not one a stranger reads.
 */
const theDaysTheRingNamesOneOfThem: readonly { onDay: number; writes: string }[] = [
  { onDay: 2, writes: phaseLabel.period },
  { onDay: 13, writes: phaseLabel.ovulation },
];

interface WhatSheHasRecorded {
  readonly recorded: string;
  readonly set: RecordedSet;
}

const theFourSets: readonly WhatSheHasRecorded[] = [
  { recorded: 'six cycles of 28 days', set: veryRegular },
  { recorded: 'six cycles with one of 40 days among them', set: oneLongCycle },
  { recorded: 'six cycles from 24 to 41 days', set: genuinelyIrregular },
  { recorded: 'the two cycles she has, of 28 and 30 days', set: twoCyclesExactly },
];

interface HerPhone {
  readonly today: string;
  readonly open: CycleRow;
  readonly ring: RingInput;
  readonly forecast: Forecast;
}

/**
 * Her days, written and read back the way the application does it: through the day log, the cache
 * the rebuild wrote, and the arithmetic over those rows. Nothing here is typed out by hand.
 */
function herPhone(set: RecordedSet, dayOfCycle: number = theDaySheOpensIt): HerPhone {
  const database = daysLogged(daysOf(set), recordedAt);
  const cycles = listCycles(database);
  const open = cycles[cycles.length - 1];

  if (open === undefined) {
    throw new Error('her own days were written and no cycle was read back');
  }

  const today = addDays(open.startedOn, dayOfCycle - 1);
  const ring = ringInputFor({
    cycles,
    records: recordedDays(database, readDay),
    today,
    statedCycleLengthDays: sheSaidHerCycleRuns,
  });
  const forecast = forecastOf(cycles);

  if (ring === undefined || forecast.kind !== 'forecast') {
    throw new Error(`${set.lengths.length} recorded cycles drew no ring and left no forecast`);
  }

  return { today, open, ring, forecast };
}

/** The cycle day a date falls on, counting the first day of the cycle she is in as one. */
function cycleDayOf(her: HerPhone, day: string): number {
  return daysBetween(her.open.startedOn, day) + 1;
}

/** The middle of the range the screen names, as a cycle day. The next cycle starts on it. */
function theMiddleOfTheRange(her: HerPhone): number {
  return (cycleDayOf(her, her.forecast.start.from) + cycleDayOf(her, her.forecast.start.to)) / 2;
}

interface DrawnDays {
  readonly firstDay: number;
  readonly lastDay: number;
}

function theDaysOf(phase: PhaseName, ring: RingInput): DrawnDays {
  const arc = ringGeometry(ring).arcs.find((each) => each.phase === phase);

  if (arc === undefined) {
    throw new Error(`the ring drew no ${phase} arc`);
  }

  return { firstDay: arc.firstDay, lastDay: arc.firstDay + arc.days - 1 };
}

async function sheOpensHerHomeScreen(her: HerPhone): Promise<void> {
  await render(
    <HomeScreen
      cycleLengthDays={sheSaidHerCycleRuns}
      forecast={her.forecast}
      onHistory={() => undefined}
      onLogToday={() => undefined}
      ring={her.ring}
    />,
  );
}

/** Every run of text on the glass that names one of the four words, with the size it is drawn at. */
function theWordsAStrangerCouldRead(): { text: string; points: number | undefined }[] {
  return sizedTextIn(screen.toJSON()).filter(({ text }) =>
    theWordsAStrangerWouldRead.some((word) => text.toLowerCase().includes(word)),
  );
}

function drawnTooLarge(): { text: string; points: number | undefined }[] {
  return theWordsAStrangerCouldRead().filter(
    (run) => run.points === undefined || run.points > theLargestTheyMayBeDrawn,
  );
}

describe('the ring shows the forecast the arithmetic produced', () => {
  beforeEach(() => {
    // The ring's one movement is proved in step 2.4. Here it arrives already open, so what a test
    // reads off it is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('the days ahead take their phase from her own forecast', () => {
    for (const has of theFourSets) {
      it(`covers the days the forecast window names, from ${has.recorded}`, () => {
        const her = herPhone(has.set);

        expect(theDaysOf('ovulation', her.ring)).toEqual({
          firstDay: cycleDayOf(her, her.forecast.fertileWindow.from),
          lastDay: cycleDayOf(her, her.forecast.fertileWindow.to),
        });
      });

      it(`stops where the next cycle is forecast to start, from ${has.recorded}`, () => {
        const her = herPhone(has.set);

        expect(her.ring.cycleLengthDays).toBe(theMiddleOfTheRange(her) - 1);
        expect(theDaysOf('luteal', her.ring).lastDay).toBe(her.ring.cycleLengthDays);
      });
    }

    it('draws the window later in a cycle her own lengths made longer', () => {
      const regular = herPhone(veryRegular);
      const irregular = herPhone(genuinelyIrregular);

      expect(irregular.ring.cycleLengthDays).toBeGreaterThan(regular.ring.cycleLengthDays);
      expect(theDaysOf('ovulation', irregular.ring).firstDay).toBeGreaterThan(
        theDaysOf('ovulation', regular.ring).firstDay,
      );
    });

    it('leaves the window where the forecast put it when she is running late', () => {
      const onTime = herPhone(veryRegular);
      const late = herPhone(veryRegular, theDaySheIsLateOn);

      expect(late.ring.cycleLengthDays).toBe(theDaySheIsLateOn);
      expect(theDaysOf('ovulation', late.ring)).toEqual({
        firstDay: cycleDayOf(late, late.forecast.fertileWindow.from),
        lastDay: cycleDayOf(late, late.forecast.fertileWindow.to),
      });
      expect(theDaysOf('ovulation', late.ring)).toEqual(theDaysOf('ovulation', onTime.ring));
    });

    it('gives the days she is late to the phase that runs last, so the bead stays on the track', () => {
      const onTime = herPhone(veryRegular);
      const late = herPhone(veryRegular, theDaySheIsLateOn);

      expect(theDaysOf('luteal', late.ring).lastDay).toBe(theDaySheIsLateOn);
      expect(theDaysOf('luteal', late.ring).firstDay).toBe(
        theDaysOf('luteal', onTime.ring).firstDay,
      );
      expect(ringGeometry(late.ring).phase).toBe('luteal');
    });

    it('leaves the whole turn covered, by the arcs it draws and the ground between them', () => {
      for (const has of theFourSets) {
        expect(coveredDegrees(ringGeometry(herPhone(has.set).ring))).toBeCloseTo(
          FULL_TURN_DEGREES,
          6,
        );
      }
    });
  });

  describe('the strength the days ahead are drawn at', () => {
    it('draws the days she reached at full strength and the days ahead at a fifth', async () => {
      await sheOpensHerHomeScreen(herPhone(veryRegular));

      expect(
        screen.getByTestId(ringArcTestID('follicular', 'elapsed')).props.opacity,
      ).toBeUndefined();
      expect(screen.getByTestId(ringArcTestID('follicular', 'ahead')).props.opacity).toBe(
        DAYS_AHEAD_STRENGTH,
      );
    });

    it('draws a phase she has not reached as days ahead and nothing else', async () => {
      await sheOpensHerHomeScreen(herPhone(veryRegular));

      expect(screen.getByTestId(ringArcTestID('ovulation', 'ahead'))).toBeTruthy();
      expect(screen.queryByTestId(ringArcTestID('ovulation', 'elapsed'))).toBeNull();
      expect(screen.getByTestId(ringArcTestID('luteal', 'ahead'))).toBeTruthy();
      expect(screen.queryByTestId(ringArcTestID('luteal', 'elapsed'))).toBeNull();
    });
  });

  describe('what the home screen carries', () => {
    it('draws the ring, the cycle day, the phase name and the range underneath', async () => {
      const her = herPhone(veryRegular);
      await sheOpensHerHomeScreen(her);

      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
      expect(screen.getByTestId(ringBeadTestID)).toBeTruthy();
      expect(screen.getByText(String(theDaySheOpensIt))).toBeTruthy();
      expect(screen.getByText(phaseLabel.follicular)).toBeTruthy();
      expect(
        within(screen.getByTestId(homeForecastTestID)).getByTestId(nextPeriodRangeTestID),
      ).toHaveTextContent(rangeSentence(her.forecast.start));
    });

    for (const has of theFourSets) {
      it(`names one cycle on the ring and underneath it, from ${has.recorded}`, async () => {
        const her = herPhone(has.set);
        await sheOpensHerHomeScreen(her);

        expect(screen.getByTestId(cycleRingTestID).props.accessibilityLabel).toBe(
          `Day ${theDaySheOpensIt} of ${her.ring.cycleLengthDays}, follicular`,
        );
        expect(screen.getByTestId(nextPeriodRangeTestID)).toHaveTextContent(
          rangeSentence(her.forecast.start),
        );
      });
    }

    it('says it is still learning, under a ring it draws anyway, before the second cycle', async () => {
      const database = asSheLoggedIt(oneCycleComplete, sheSaidHerCycleRuns);
      const cycles = listCycles(database);
      const open = cycles[cycles.length - 1];

      if (open === undefined) {
        throw new Error('her first run wrote no cycle for the ring to draw');
      }

      await render(
        <HomeScreen
          cycleLengthDays={sheSaidHerCycleRuns}
          forecast={forecastOf(cycles)}
          onHistory={() => undefined}
          onLogToday={() => undefined}
          ring={ringInputFor({
            cycles,
            records: recordedDays(database, readDay),
            today: addDays(open.startedOn, theDaySheOpensIt - 1),
            statedCycleLengthDays: sheSaidHerCycleRuns,
          })}
        />,
      );

      expect(screen.getByTestId(cycleRingTestID)).toBeTruthy();
      expect(screen.getByTestId(learningTestID)).toBeTruthy();
      expect(screen.getByTestId(learningCyclesWantedTestID)).toHaveTextContent(
        'Emi needs 1 more complete cycle before it forecasts.',
      );
      expect(screen.queryByTestId(nextPeriodRangeTestID)).toBeNull();
    });

    it('draws no ring at all, and says what to do, before she has recorded a day', async () => {
      await render(
        <HomeScreen
          cycleLengthDays={sheSaidHerCycleRuns}
          forecast={forecastOf(listCycles(migratedDatabase()))}
          onHistory={() => undefined}
          onLogToday={() => undefined}
          ring={undefined}
        />,
      );

      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
      expect(screen.getByTestId(homeNoRingTestID)).toBeTruthy();
      expect(screen.getByText(homeCopy.noRing.line)).toBeTruthy();
    });
  });

  describe('what the person sitting beside her can read', () => {
    for (const has of theFourSets) {
      it(`keeps every one of the four words small, from ${has.recorded}`, async () => {
        await sheOpensHerHomeScreen(herPhone(has.set));

        expect(theWordsAStrangerCouldRead().length).toBeGreaterThan(0);
        expect(drawnTooLarge()).toEqual([]);
      });
    }

    for (const day of theDaysTheRingNamesOneOfThem) {
      it(`keeps the word small on the day the ring writes ${day.writes}`, async () => {
        await sheOpensHerHomeScreen(herPhone(veryRegular, day.onDay));

        expect(screen.getByText(day.writes)).toBeTruthy();
        expect(theWordsAStrangerCouldRead().map((run) => run.text)).toContain(day.writes);
        expect(drawnTooLarge()).toEqual([]);
      });
    }

    it('keeps them small on the screen that has nothing to draw', async () => {
      await render(
        <HomeScreen
          cycleLengthDays={sheSaidHerCycleRuns}
          forecast={forecastOf(listCycles(migratedDatabase()))}
          onHistory={() => undefined}
          onLogToday={() => undefined}
          ring={undefined}
        />,
      );

      expect(theWordsAStrangerCouldRead().map((run) => run.text)).toContain(homeCopy.noRing.line);
      expect(drawnTooLarge()).toEqual([]);
    });

    it('draws no run of text at a size nothing on the screen named', async () => {
      await sheOpensHerHomeScreen(herPhone(veryRegular));

      expect(sizedTextIn(screen.toJSON()).filter((run) => run.points === undefined)).toEqual([]);
    });
  });

  describe('she logs a day and comes back to the screen she left', () => {
    const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
    const today = '2026-05-14';
    const herCycleLengthDays = 28;
    const herPeriodDays = 4;

    /** Six cycles of her own, then the cycle she is in, whose first day she bled on yesterday. */
    function herSixCycles(): DayRecord[] {
      const thisCycleStarted = addDays(today, -1);
      const records: DayRecord[] = [];

      for (let cycle = 6; cycle >= 1; cycle -= 1) {
        const started = addDays(thisCycleStarted, -cycle * herCycleLengthDays);
        for (let day = 0; day < herPeriodDays; day += 1) {
          records.push(aBleedingDay(addDays(started, day)));
        }
      }
      records.push(aBleedingDay(thisCycleStarted));

      return records;
    }

    function aBleedingDay(day: string): DayRecord {
      return { day, flow: 'medium', recordedAt: `${day}T08:00:00.000Z` };
    }

    function herPhoneHolds(records: readonly DayRecord[]): void {
      const database: Database = expoDatabase(openDatabaseSync(databaseFileName));
      migrate(database);

      for (const record of records) {
        logDay(
          database,
          { day: record.day, payload: recordBytes(record), now: new Date(record.recordedAt) },
          recordFromBytes,
        );
      }

      writeSetting(database, 'cycleLengthDays', String(sheSaidHerCycleRuns));
      writeSetting(database, 'firstRunCompletedAt', whenSheOpensIt.toISOString());
    }

    function theRingSays(): string {
      return String(screen.getByTestId(cycleRingTestID).props.accessibilityLabel);
    }

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(whenSheOpensIt);
      resetExpoSqlite();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('draws the cycle she wrote to, and not the one she opened the screen on', async () => {
      herPhoneHolds(herSixCycles());
      const app = renderRouter(appDirectory, { initialUrl: '/' });
      await app;

      expect(theRingSays()).toBe(`Day 2 of ${herCycleLengthDays}, follicular`);

      await fireEvent.press(screen.getByTestId(logTodayTestID));
      await fireEvent.press(screen.getByTestId(flowOptionTestID('heavy')));
      await fireEvent.press(screen.getByTestId(logFlowDoneTestID));

      expect(app.getPathname()).toBe('/');
      expect(theRingSays()).toBe(`Day 2 of ${herCycleLengthDays}, period`);
      expect(screen.getByText(phaseLabel.period)).toBeTruthy();
    });
  });
});
