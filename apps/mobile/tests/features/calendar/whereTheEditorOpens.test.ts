import type { DayRecord } from '@emi/crypto';
import { addDays, daysBetween } from '@emi/cycle';

import type { CycleRow } from '../../../src/data/cycleRepository';
import {
  theDaysOf,
  thePeriodEmiHoldsAround,
  whereTheEditorOpens,
} from '../../../src/features/calendar/savePeriod';

/**
 * Where the period editor opens for the day she pressed. A day inside a period opens that period,
 * and a day outside every period opens on that day, so starting a period yesterday is one press.
 */

const today = '2026-10-19';
const yesterday = '2026-10-18';
/** Her last period, four weeks before yesterday, five days long. */
const lastStart = addDays(yesterday, -28);

function aPeriod(startedOn: string, days: number): DayRecord[] {
  return Array.from({ length: days }, (_unused, index) => ({
    day: addDays(startedOn, index),
    flow: 'medium' as const,
    recordedAt: `${today}T08:00:00.000Z`,
  }));
}

function aCycle(startedOn: string): CycleRow {
  return {
    endedOn: null,
    id: `cycle-${startedOn}`,
    isPredicted: false,
    lengthDays: null,
    periodLengthDays: 5,
    startedOn,
  };
}

const herRecords = aPeriod(lastStart, 5);
const herCycles = [aCycle(lastStart)];

describe('where the period editor opens', () => {
  it('opens on the period when the day she pressed is inside it, ticked, with the two days after', () => {
    const opened = whereTheEditorOpens(herRecords, herCycles, {
      day: addDays(lastStart, 2),
      today,
    });

    expect(opened.held).toEqual(herRecords.map((record) => record.day));
    expect(opened.listed).toEqual({ from: lastStart, to: addDays(lastStart, 6) });
  });

  it('opens on the day she pressed when it is outside every period, with nothing ticked', () => {
    const pressed = addDays(lastStart, 12);
    const opened = whereTheEditorOpens(herRecords, herCycles, { day: pressed, today });

    expect(opened.held).toEqual([]);
    expect(opened.listed).toEqual({ from: pressed, to: addDays(pressed, 2) });
  });

  it('opens on yesterday when she starts a period yesterday, so she needs no press to reach it', () => {
    const opened = whereTheEditorOpens(herRecords, herCycles, { day: yesterday, today });

    expect(opened.held).toEqual([]);
    expect(theDaysOf(opened.listed)).toEqual([yesterday, today]);
  });

  it('ticks the period she logged today when she presses yesterday, so a save leaves it alone', () => {
    const records = [...herRecords, ...aPeriod(today, 1)];
    const cycles = [...herCycles, aCycle(today)];
    const opened = whereTheEditorOpens(records, cycles, { day: yesterday, today });

    expect(opened.held).toEqual([today]);
    expect(theDaysOf(opened.listed)).toEqual([yesterday, today]);
  });

  it('lists the two days after a period that starts the day after the day she pressed', () => {
    const pressed = addDays(lastStart, -1);
    const opened = whereTheEditorOpens(herRecords, herCycles, { day: pressed, today });

    expect(opened.held).toEqual(herRecords.map((record) => record.day));
    expect(opened.listed).toEqual({ from: pressed, to: addDays(lastStart, 6) });
  });

  it('no longer opens on the period four weeks earlier, which was 28 presses from yesterday', () => {
    const theOldAnchor = thePeriodEmiHoldsAround(herRecords, herCycles, { day: yesterday, today });
    const opened = whereTheEditorOpens(herRecords, herCycles, { day: yesterday, today });

    expect(theOldAnchor[0]).toBe(lastStart);
    expect(daysBetween(lastStart, yesterday)).toBe(28);
    expect(opened.listed.from).toBe(yesterday);
    expect(theDaysOf(opened.listed)).not.toContain(lastStart);
  });

  it('opens on the day after her period ends as a day of its own, because it is outside the period', () => {
    const theDayAfter = addDays(lastStart, 5);
    const opened = whereTheEditorOpens(herRecords, herCycles, { day: theDayAfter, today });

    expect(opened.held).toEqual([]);
    expect(opened.listed.from).toBe(theDayAfter);
  });

  it('asks about today for a day ahead of her, and opens on the period she is having', () => {
    const records = [...herRecords, ...aPeriod(today, 1)];
    const cycles = [...herCycles, aCycle(today)];
    const opened = whereTheEditorOpens(records, cycles, { day: addDays(today, 3), today });

    expect(opened.held).toEqual([today]);
    expect(opened.listed).toEqual({ from: today, to: today });
  });

  it('asks about today for a day ahead of her, and opens on today when no period holds it', () => {
    const opened = whereTheEditorOpens(herRecords, herCycles, { day: addDays(today, 3), today });

    expect(opened.held).toEqual([]);
    expect(opened.listed).toEqual({ from: today, to: today });
  });

  it('opens on the day she pressed when Emi holds no period at all', () => {
    const opened = whereTheEditorOpens([], [], { day: yesterday, today });

    expect(opened).toEqual({ held: [], listed: { from: yesterday, to: today } });
  });
});
