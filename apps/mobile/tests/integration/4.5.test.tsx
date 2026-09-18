import { join } from 'node:path';

import { type DayRecord, recordFromBytes } from '@emi/crypto';
import { type Flow, addDays } from '@emi/cycle';
import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { cycleRingTestID, ringArcTestID } from '../../src/components/CycleRing';
import { listCycles } from '../../src/data/cycleRepository';
import { readDayLog } from '../../src/data/dayLogRepository';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { flowOptionTestID } from '../../src/features/log/FlowPicker';
import {
  unexpectedBleedingLineTestID,
  unexpectedBleedingMarkTestID,
  unexpectedBleedingTestID,
} from '../../src/features/log/UnexpectedBleeding';
import { unexpectedBleedingCopy } from '../../src/features/log/copy';
import { resetExpoSqlite } from '../data/expoSqlite';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const today = dayOf(whenSheOpensIt);

const herCycleLengthDays = 28;
const herPeriodDays = 4;

/** Thirteen days behind her, which puts today on day 14: the middle of the cycle, not near a period. */
const herLastPeriodStarted = addDays(today, -13);

/** The ring while the cycle she is in runs to the length her own six cycles give. */
const theRingOnDay14 = `Day 14 of ${herCycleLengthDays}, ovulation`;

/** A day behind her, in the same cycle, so the day view writes into the cycle she is living. */
const lastFriday = addDays(today, -6);

/**
 * Six periods, four days of bleeding each, twenty eight days apart. Five of them are complete, so
 * the forecast has a median to work from and a spread of nothing at all.
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

/** The day each of her six periods began, which is where Emi says a cycle started. */
function theSixStarts(): string[] {
  return [5, 4, 3, 2, 1, 0].map((back) =>
    addDays(herLastPeriodStarted, -back * herCycleLengthDays),
  );
}

async function sheOpens(path: string): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: path });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function shePicks(flow: Flow): Promise<void> {
  await shePresses(flowOptionTestID(flow));
}

async function sheMarksIt(): Promise<void> {
  await shePresses(unexpectedBleedingMarkTestID);
}

function whatWasRecordedOn(day: string): DayRecord | undefined {
  const row = readDayLog(herDatabase(), day);

  return row ? recordFromBytes(row.payload) : undefined;
}

/** Where Emi says each of her cycles began, read out of the cache every screen reads. */
function theCyclesEmiCounts(): string[] {
  return listCycles(herDatabase()).map((cycle) => cycle.startedOn);
}

interface ForecastReading {
  readonly from: string;
  readonly to: string;
  readonly confidence: string;
  readonly fromCycles: number;
}

/** The forecast as a screen gets it: from the cache, through the same function every screen calls. */
function whatEmiForecasts(): ForecastReading | 'still learning' {
  const result = forecastOf(listCycles(herDatabase()));

  if (result.kind === 'learning') {
    return 'still learning';
  }

  return {
    from: result.start.from,
    to: result.start.to,
    confidence: result.confidence.level,
    fromCycles: result.fromCycles,
  };
}

function theRingSays(): string {
  return String(screen.getByTestId(cycleRingTestID).props.accessibilityLabel);
}

/** The period arc she can see, so a day counted into her period would change the picture. */
function thePeriodArc(): string {
  return String(screen.getByTestId(ringArcTestID('period', 'elapsed')).props.d);
}

function sizeOf(testID: string): { width: number; height: number } {
  const flattened = StyleSheet.flatten(screen.getByTestId(testID).props.style) as {
    minWidth?: number;
    minHeight?: number;
  };

  return { width: flattened.minWidth ?? 0, height: flattened.minHeight ?? 0 };
}

/**
 * Words that tell her what to do about the bleeding. Emi cannot examine her, so Emi says none of
 * them: the record is what she takes to somebody who can.
 */
const advice: readonly string[] = [
  'doctor',
  'nurse',
  'clinic',
  'consult',
  'seek',
  'advice',
  'should',
  'recommend',
  'recommended',
  'treatment',
  'diagnosis',
];

/**
 * Words that make a spot sound like an emergency. A woman who is told to worry stops logging, and
 * the pattern she came for is built out of the days she keeps logging.
 */
const alarm: readonly string[] = [
  'abnormal',
  'unusual',
  'warning',
  'worry',
  'worrying',
  'concern',
  'concerning',
  'serious',
  'danger',
  'dangerous',
  'urgent',
  'risk',
  'alert',
];

function theWordsSheReads(): string[] {
  return Object.values(unexpectedBleedingCopy);
}

describe('unexpected bleeding never starts a cycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement belongs to step 2.4. Here it arrives already open, so what the test
    // reads off it is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('she spots on day 14 and says it is not her period', () => {
    it('writes her mark on that day, beside the flow she picked', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens('/log');
      await shePicks('spotting');

      await sheMarksIt();

      expect(whatWasRecordedOn(today)).toEqual({
        day: today,
        flow: 'spotting',
        bleedingIsUnexpected: true,
        recordedAt: whenSheOpensIt.toISOString(),
      });
    });

    it('counts no cycle from it, so her last period is still the one she had', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens('/log');
      await shePicks('spotting');

      await sheMarksIt();

      expect(theCyclesEmiCounts()).toEqual(theSixStarts());
      expect(theCyclesEmiCounts()).not.toContain(today);
    });

    it('leaves the forecast where it stood before she logged anything', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      const before = whatEmiForecasts();
      await sheOpens('/log');
      await shePicks('spotting');

      await sheMarksIt();

      expect(before).toEqual({
        from: addDays(herLastPeriodStarted, herCycleLengthDays - 1),
        to: addDays(herLastPeriodStarted, herCycleLengthDays + 1),
        confidence: 'high',
        fromCycles: 5,
      });
      expect(whatEmiForecasts()).toEqual(before);
    });

    it('leaves the ring on the day she is on, with the period she actually had', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens('/log');
      const beforeArc = thePeriodArc();
      await shePicks('spotting');

      await sheMarksIt();

      expect(theRingSays()).toBe(theRingOnDay14);
      expect(thePeriodArc()).toBe(beforeArc);
    });

    it('says what her mark did, and leaves the mark pressed', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens('/log');
      await shePicks('spotting');

      await sheMarksIt();

      expect(screen.getByTestId(unexpectedBleedingMarkTestID)).toBeChecked();
      expect(screen.getByTestId(unexpectedBleedingLineTestID)).toHaveTextContent(
        unexpectedBleedingCopy.marked,
      );
    });
  });

  describe('the same spot, left unmarked', () => {
    it('starts a cycle and moves every forecast after it', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      const before = whatEmiForecasts();
      await sheOpens('/log');

      await shePicks('spotting');

      expect(theCyclesEmiCounts()).toContain(today);
      expect(theRingSays()).toBe(`Day 1 of ${herCycleLengthDays}, period`);
      expect(whatEmiForecasts()).not.toEqual(before);
    });
  });

  describe('she changes her mind about the day', () => {
    it('takes the mark off again, and the day starts a cycle once more', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens('/log');
      await shePicks('spotting');
      await sheMarksIt();

      await sheMarksIt();

      expect(whatWasRecordedOn(today)?.bleedingIsUnexpected).toBeUndefined();
      expect(theCyclesEmiCounts()).toContain(today);
      expect(screen.getByTestId(unexpectedBleedingMarkTestID)).not.toBeChecked();
    });

    it('keeps the mark when she corrects the flow underneath it', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens('/log');
      await shePicks('spotting');
      await sheMarksIt();

      await shePicks('heavy');

      expect(whatWasRecordedOn(today)).toEqual({
        day: today,
        flow: 'heavy',
        bleedingIsUnexpected: true,
        recordedAt: whenSheOpensIt.toISOString(),
      });
      expect(theCyclesEmiCounts()).toEqual(theSixStarts());
    });

    it('drops the mark when she says there was no bleeding after all', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens('/log');
      await shePicks('spotting');
      await sheMarksIt();

      await shePicks('none');

      expect(whatWasRecordedOn(today)).toEqual({
        day: today,
        flow: 'none',
        recordedAt: whenSheOpensIt.toISOString(),
      });
      expect(screen.queryByTestId(unexpectedBleedingTestID)).toBeNull();
    });
  });

  describe('a day she did not bleed on', () => {
    it('offers her nothing to mark, because the mark is about bleeding', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());

      await sheOpens('/log');

      expect(screen.queryByTestId(unexpectedBleedingTestID)).toBeNull();

      await shePicks('none');

      expect(screen.queryByTestId(unexpectedBleedingTestID)).toBeNull();
    });
  });

  describe('a day behind her', () => {
    it('takes the mark too, and starts no cycle in the middle of her month', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens(`/day/${lastFriday}`);
      await shePicks('light');

      await sheMarksIt();

      expect(whatWasRecordedOn(lastFriday)).toEqual({
        day: lastFriday,
        flow: 'light',
        bleedingIsUnexpected: true,
        recordedAt: whenSheOpensIt.toISOString(),
      });
      expect(theCyclesEmiCounts()).toEqual(theSixStarts());
    });

    it('opens on the mark she left there, when she comes back to it', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens(`/day/${lastFriday}`);
      await shePicks('light');
      await sheMarksIt();

      await sheOpens(`/day/${lastFriday}`);

      expect(screen.getByTestId(unexpectedBleedingMarkTestID)).toBeChecked();
      expect(screen.getByTestId(unexpectedBleedingLineTestID)).toHaveTextContent(
        unexpectedBleedingCopy.marked,
      );
    });
  });

  describe('the words she reads while she does it', () => {
    it('carries the line the brand brief sets, word for word', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens('/log');

      await shePicks('spotting');

      expect(unexpectedBleedingCopy.invitation).toBe(
        'Not your period? Log it. Emi will track the pattern.',
      );
      expect(screen.getByTestId(unexpectedBleedingLineTestID)).toHaveTextContent(
        unexpectedBleedingCopy.invitation,
      );
    });

    it('gives her no advice', () => {
      for (const line of theWordsSheReads()) {
        for (const word of advice) {
          expect({ line, holds: new RegExp(`\\b${word}\\b`, 'i').test(line) }).toEqual({
            line,
            holds: false,
          });
        }
      }
    });

    it('raises no alarm', () => {
      for (const line of theWordsSheReads()) {
        for (const word of alarm) {
          expect({ line, holds: new RegExp(`\\b${word}\\b`, 'i').test(line) }).toEqual({
            line,
            holds: false,
          });
        }
      }
    });

    it('never uses an exclamation mark, which is the rule the design sets', () => {
      for (const line of theWordsSheReads()) {
        expect(line).not.toContain('!');
      }
    });

    it('is a control she can hit without looking at it', async () => {
      herPhoneHolds(whenSheOpensIt, herSixPeriods());
      await sheOpens('/log');

      await shePicks('spotting');

      expect(sizeOf(unexpectedBleedingMarkTestID)).toEqual({
        width: MINIMUM_TAP_TARGET,
        height: MINIMUM_TAP_TARGET,
      });
    });
  });
});
