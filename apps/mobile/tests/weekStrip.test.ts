import type { DayRecord } from '@emi/cycle';
import { addDays } from '@emi/cycle';

import { listCycles } from '../src/data/cycleRepository';
import { recordedDays } from '../src/features/cycle/rebuild';
import { forecastOf } from '../src/features/forecast/fromCache';
import { WEEK_STRIP_DAYS, weekEndingOn } from '../src/features/home/weekStrip';
import { daysLogged, readDay } from './fixtures/cycleCache';

/**
 * The arithmetic under the strip, over days written through the day log and read back out of the
 * cache the rebuild wrote. Nothing here is typed out by hand.
 */

const recordedAt = new Date('2026-09-17T08:00:00.000Z');

const herCycleLengthDays = 28;
const herPeriodDays = 4;

/** Six periods, four bleeding days each, twenty eight days apart. The last one is still open. */
function herSixPeriods(lastStarted: string): DayRecord[] {
  const records: DayRecord[] = [];

  for (let back = 5; back >= 0; back -= 1) {
    const started = addDays(lastStarted, -back * herCycleLengthDays);

    for (let day = 0; day < herPeriodDays; day += 1) {
      records.push({ day: addDays(started, day), flow: 'medium' });
    }
  }

  return records;
}

function theWeek(records: readonly DayRecord[], today: string) {
  const database = daysLogged(records, recordedAt);
  const cycles = listCycles(database);

  return weekEndingOn({
    cycles,
    records: recordedDays(database, readDay),
    forecast: forecastOf(cycles),
    today,
  });
}

describe('the week she is handed', () => {
  const lastStarted = '2026-09-14';

  it('holds seven days, oldest first, ending on today', () => {
    const today = addDays(lastStarted, 3);
    const week = theWeek(herSixPeriods(lastStarted), today);

    expect(week).toHaveLength(WEEK_STRIP_DAYS);
    expect(week.map((column) => column.day)).toEqual([
      addDays(today, -6),
      addDays(today, -5),
      addDays(today, -4),
      addDays(today, -3),
      addDays(today, -2),
      addDays(today, -1),
      today,
    ]);
    expect(week.filter((column) => column.isToday).map((column) => column.day)).toEqual([today]);
  });

  it('counts the cycle day from the day that cycle started', () => {
    const week = theWeek(herSixPeriods(lastStarted), addDays(lastStarted, 3));
    const onTheDayItStarted = week.find((column) => column.day === lastStarted);

    expect(onTheDayItStarted?.cycleDay).toBe(1);
    expect(week[week.length - 1]?.cycleDay).toBe(4);
    // The days before it belong to the cycle before it, which ran 28 days.
    expect(week[0]?.cycleDay).toBe(26);
  });

  it('numbers a recorded period day by its place in that period', () => {
    const week = theWeek(herSixPeriods(lastStarted), addDays(lastStarted, 3));

    expect(
      week
        .filter((column) => column.periodDay !== undefined)
        .map((column) => [column.day, column.periodDay]),
    ).toEqual([
      [lastStarted, 1],
      [addDays(lastStarted, 1), 2],
      [addDays(lastStarted, 2), 3],
      [addDays(lastStarted, 3), 4],
    ]);
  });

  it('leaves a day she recorded no bleeding on with no period day at all', () => {
    const records: DayRecord[] = [
      ...herSixPeriods(lastStarted),
      { day: addDays(lastStarted, 4), flow: 'none' },
    ];
    const week = theWeek(records, addDays(lastStarted, 4));

    expect(week[week.length - 1]?.periodDay).toBeUndefined();
  });

  it('marks the days her next period may start on, while she is late and has not bled', () => {
    const today = addDays(lastStarted, 31);
    const week = theWeek(herSixPeriods(lastStarted), today);

    expect(week.filter((column) => column.forecastPeriod).map((column) => column.day)).toEqual([
      addDays(lastStarted, 27),
      addDays(lastStarted, 28),
      addDays(lastStarted, 29),
    ]);
  });

  it('says nothing about a forecast before two of her cycles are complete', () => {
    const oneCycle: DayRecord[] = [
      { day: lastStarted, flow: 'medium' },
      { day: addDays(lastStarted, 1), flow: 'medium' },
    ];

    expect(theWeek(oneCycle, addDays(lastStarted, 3)).some((column) => column.forecastPeriod)).toBe(
      false,
    );
  });

  it('gives no cycle day to a day before her first recorded period', () => {
    const week = theWeek([{ day: lastStarted, flow: 'medium' }], lastStarted);

    expect(week.map((column) => column.cycleDay)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      1,
    ]);
  });

  it('holds every day of the week as one she has lived, because the week ends on today', () => {
    const week = theWeek(herSixPeriods(lastStarted), addDays(lastStarted, 3));

    expect(week.every((column) => column.lived)).toBe(true);
  });
});
