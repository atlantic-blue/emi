import { PERIOD_MAY_RUN_FOR_DAYS, cyclesFrom } from '@emi/cycle';

import {
  PAST_PERIODS_ASKED,
  type PastPeriod,
  everyDayTheyBled,
  forecastFromPastPeriods,
  lengthsFromHerDates,
  longestPastPeriodDays,
  pastPeriodLengthsOffered,
  pastPeriodsRefusal,
  periodsAfterGiving,
  periodsAfterRemoving,
  startIsInRangeAt,
  theDaysItBled,
} from '../../../src/features/pastPeriods/pastPeriods';

/**
 * The rules of the list of her last three periods, which the first run and the screen the forecast
 * popup opens both read.
 */

const today = '2026-05-14';
const oldest = '2026-02-13';
const newest: PastPeriod = { startedOn: '2026-05-09', lengthDays: 5 };
const before: PastPeriod = { startedOn: '2026-04-11', lengthDays: 6 };
const beforeThat: PastPeriod = { startedOn: '2026-03-14', lengthDays: 4 };

describe('the list of her last three periods', () => {
  describe('the lengths it offers', () => {
    it('runs from one day to the longest the cycle arithmetic reads as one period', () => {
      expect(pastPeriodLengthsOffered[0]).toBe(1);
      expect(pastPeriodLengthsOffered.at(-1)).toBe(longestPastPeriodDays);
      expect(longestPastPeriodDays).toBe(PERIOD_MAY_RUN_FOR_DAYS);
    });

    it('is a length the arithmetic reads back as one period, however long she says it ran', () => {
      const longest: PastPeriod = { startedOn: '2026-04-01', lengthDays: longestPastPeriodDays };
      const days = theDaysItBled(longest, today).map((day) => ({
        day,
        flow: 'medium' as const,
      }));

      expect(cyclesFrom(days)).toHaveLength(1);
    });
  });

  describe('where a start may fall', () => {
    it('holds the newest row to the days she has lived, back to the oldest offered', () => {
      expect(startIsInRangeAt(0, today, [], { today, oldest })).toBe(true);
      expect(startIsInRangeAt(0, oldest, [], { today, oldest })).toBe(true);
      expect(startIsInRangeAt(0, '2026-05-15', [], { today, oldest })).toBe(false);
      expect(startIsInRangeAt(0, '2026-02-12', [], { today, oldest })).toBe(false);
    });

    it('holds every other row to one cycle before the row above it', () => {
      expect(startIsInRangeAt(1, before.startedOn, [newest], { today, oldest })).toBe(true);
      expect(startIsInRangeAt(1, '2026-04-19', [newest], { today, oldest })).toBe(false);
      expect(startIsInRangeAt(1, '2026-03-24', [newest], { today, oldest })).toBe(false);
    });

    it('takes no start for a row whose row above is empty', () => {
      expect(startIsInRangeAt(2, beforeThat.startedOn, [newest], { today, oldest })).toBe(false);
    });
  });

  describe('the days a period writes', () => {
    it('is every day of its length, not only its first day', () => {
      expect(theDaysItBled(before, today)).toEqual([
        '2026-04-11',
        '2026-04-12',
        '2026-04-13',
        '2026-04-14',
        '2026-04-15',
        '2026-04-16',
      ]);
    });

    it('stops at today, because a day she has not lived takes no record', () => {
      expect(theDaysItBled({ startedOn: '2026-05-12', lengthDays: 7 }, today)).toEqual([
        '2026-05-12',
        '2026-05-13',
        '2026-05-14',
      ]);
    });

    it('is every day of every period, oldest first', () => {
      expect(everyDayTheyBled([newest, before, beforeThat], today)).toHaveLength(15);
      expect(everyDayTheyBled([newest, before, beforeThat], today)[0]).toBe('2026-03-14');
    });
  });

  describe('a row she changes', () => {
    it('keeps the rows below it while they are still a cycle before the row above', () => {
      expect(
        periodsAfterGiving([newest, before, beforeThat], 0, { ...newest, lengthDays: 3 }),
      ).toEqual([{ ...newest, lengthDays: 3 }, before, beforeThat]);
    });

    it('drops the rows below it once they are not', () => {
      expect(
        periodsAfterGiving([newest, before, beforeThat], 0, {
          startedOn: '2026-05-01',
          lengthDays: 5,
        }),
      ).toEqual([{ startedOn: '2026-05-01', lengthDays: 5 }]);
    });

    it('takes every row below it off with it', () => {
      expect(periodsAfterRemoving([newest, before, beforeThat], 1)).toEqual([newest]);
    });
  });

  describe('a list that cannot be written', () => {
    it('is refused with the rule it breaks', () => {
      const offered = { today, oldest };

      expect(pastPeriodsRefusal([newest, before, beforeThat], offered)).toBeUndefined();
      expect(pastPeriodsRefusal([], offered)).toBeUndefined();
      expect(pastPeriodsRefusal([{ startedOn: '2026-05-15', lengthDays: 1 }], offered)).toBe(
        'period-start-is-in-the-future',
      );
      expect(pastPeriodsRefusal([{ startedOn: '2026-02-12', lengthDays: 1 }], offered)).toBe(
        'period-start-is-too-long-ago',
      );
      expect(
        pastPeriodsRefusal([newest, { startedOn: '2026-04-19', lengthDays: 1 }], offered),
      ).toBe('period-before-is-out-of-range');
      expect(pastPeriodsRefusal([{ ...newest, lengthDays: 9 }], offered)).toBe(
        'past-period-length-is-out-of-range',
      );
      expect(
        pastPeriodsRefusal(
          [newest, before, beforeThat, { startedOn: '2026-02-14', lengthDays: 1 }],
          offered,
        ),
      ).toBe('more-periods-than-asked');
      expect(PAST_PERIODS_ASKED).toBe(3);
    });
  });

  describe('the forecast it makes', () => {
    it('is ready with three periods, because three starts are two complete cycles', () => {
      const forecast = forecastFromPastPeriods([newest, before, beforeThat], 28);

      expect(forecast.kind).toBe('forecast');
      expect(forecast.kind === 'forecast' && forecast.fromCycles).toBe(2);
    });

    it('is still learning with two, and counts the one cycle she lived', () => {
      const forecast = forecastFromPastPeriods([newest, before], 28);

      expect(forecast).toMatchObject({ kind: 'learning', completeCycles: 1, needsCycles: 2 });
    });

    it('is still learning with none, and carries no range', () => {
      const forecast = forecastFromPastPeriods([], 28);

      expect(forecast).toEqual({ kind: 'learning', completeCycles: 0, needsCycles: 2 });
    });
  });

  describe('the lengths Emi works out from her dates', () => {
    it('offers nothing from one period, because one period makes no cycle', () => {
      expect(lengthsFromHerDates([newest])).toBeUndefined();
    });

    it('offers nothing where she gave no period', () => {
      expect(lengthsFromHerDates([])).toBeUndefined();
    });

    it('offers the one cycle that two periods make, and the rounded median of the two lengths', () => {
      expect(lengthsFromHerDates([newest, before])).toEqual({
        cycleLengthDays: 28,
        periodLengthDays: 6,
      });
    });

    it('offers the rounded median of the two cycles and of the three lengths from three periods', () => {
      const unevenBefore: PastPeriod = { startedOn: '2026-04-12', lengthDays: 6 };
      const unevenBeforeThat: PastPeriod = { startedOn: '2026-03-13', lengthDays: 4 };

      expect(lengthsFromHerDates([newest, unevenBefore, unevenBeforeThat])).toEqual({
        cycleLengthDays: 29,
        periodLengthDays: 5,
      });
    });

    it('offers the cycle length the forecast counts with, from the same three periods', () => {
      const unevenBefore: PastPeriod = { startedOn: '2026-04-12', lengthDays: 6 };
      const unevenBeforeThat: PastPeriod = { startedOn: '2026-03-13', lengthDays: 4 };
      const periods = [newest, unevenBefore, unevenBeforeThat];
      const forecast = forecastFromPastPeriods(periods);

      if (forecast.kind !== 'forecast') {
        throw new Error('three periods make two cycles, which is a forecast');
      }
      expect(lengthsFromHerDates(periods)?.cycleLengthDays).toBe(
        Math.round(forecast.medianLengthDays),
      );
    });

    it('is not read by the forecast once she gave three periods, which counts her own cycles', () => {
      const periods = [newest, before, beforeThat];

      expect(forecastFromPastPeriods(periods, 35)).toEqual(forecastFromPastPeriods(periods));
    });
  });
});
