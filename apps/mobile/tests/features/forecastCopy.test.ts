import { CycleError, confidenceBands } from '@emi/cycle';

import {
  ForecastCopyError,
  confidenceSentence,
  confidenceWords,
  monthNames,
  ordinal,
  rangeSentence,
} from '../../src/features/forecast/copy';
import {
  genuinelyIrregular,
  oneLongCycle,
  veryRegular,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { forecastFromRecorded } from '../fixtures/forecast';

describe('the words the forecast is written in', () => {
  describe('a day of the month', () => {
    it('takes the ending the day is read with', () => {
      expect([1, 2, 3, 4, 21, 22, 23, 30, 31].map(ordinal)).toEqual([
        '1st',
        '2nd',
        '3rd',
        '4th',
        '21st',
        '22nd',
        '23rd',
        '30th',
        '31st',
      ]);
    });

    it('takes th through the eleventh, the twelfth and the thirteenth', () => {
      expect([11, 12, 13].map(ordinal)).toEqual(['11th', '12th', '13th']);
    });
  });

  describe('a range inside one month', () => {
    it('names the month once, after both days', () => {
      expect(rangeSentence({ from: '2026-07-19', to: '2026-07-21' })).toBe(
        'Between the 19th and the 21st of July',
      );
    });
  });

  describe('a range that crosses a month', () => {
    it('names the month of each end', () => {
      expect(rangeSentence({ from: '2026-07-27', to: '2026-08-06' })).toBe(
        'Between the 27th of July and the 6th of August',
      );
    });
  });

  describe('a range that crosses a year', () => {
    it('names the year of each end, so the two are a year apart to nobody', () => {
      expect(rangeSentence({ from: '2026-12-30', to: '2027-01-02' })).toBe(
        'Between the 30th of December 2026 and the 2nd of January 2027',
      );
    });

    it('has a name for every month of that year', () => {
      expect(monthNames).toHaveLength(12);
      expect(monthNames.filter((name) => name.length > 0)).toHaveLength(12);
    });
  });

  describe('a range of one day', () => {
    it('is refused, because a range of no width is a date', () => {
      expect(() => rangeSentence({ from: '2026-07-20', to: '2026-07-20' })).toThrow(
        ForecastCopyError,
      );
      expect(() => rangeSentence({ from: '2026-07-20', to: '2026-07-20' })).toThrow(
        'the forecast is never a single day',
      );
    });

    it('says which refusal it is, so a caller can tell the two apart', () => {
      try {
        rangeSentence({ from: '2026-07-20', to: '2026-07-20' });
        throw new Error('a range of one day was written out');
      } catch (error) {
        expect(error).toBeInstanceOf(ForecastCopyError);
        expect((error as ForecastCopyError).refusal).toBe('range-is-one-day');
      }
    });
  });

  describe('a range that ends before it starts', () => {
    it('is refused', () => {
      try {
        rangeSentence({ from: '2026-07-21', to: '2026-07-19' });
        throw new Error('a range that runs backwards was written out');
      } catch (error) {
        expect(error).toBeInstanceOf(ForecastCopyError);
        expect((error as ForecastCopyError).refusal).toBe('range-ends-before-it-starts');
      }
    });
  });

  describe('a day that is not in the calendar', () => {
    it('is refused by the arithmetic before any word is written', () => {
      expect(() => rangeSentence({ from: '2026-02-30', to: '2026-03-02' })).toThrow(CycleError);
      expect(() => rangeSentence({ from: 'next Tuesday', to: '2026-03-02' })).toThrow(CycleError);
    });
  });

  describe('how sure Emi is', () => {
    it('has one word for each band the arithmetic measures, and no fourth', () => {
      expect(Object.keys(confidenceWords).sort()).toEqual(
        confidenceBands.map((band) => band.level).sort(),
      );
    });

    it('reads as the word and the number of cycles behind it', () => {
      expect(confidenceSentence(forecastFromRecorded(veryRegular))).toBe(
        'High confidence, from your last 6 cycles',
      );
      expect(confidenceSentence(forecastFromRecorded(oneLongCycle))).toBe(
        'Medium confidence, from your last 6 cycles',
      );
      expect(confidenceSentence(forecastFromRecorded(genuinelyIrregular))).toBe(
        'Low confidence, from your last 6 cycles',
      );
    });

    it('carries no percentage in any of its words', () => {
      expect(Object.values(confidenceWords).join(' ')).not.toMatch(/%|percent/i);
    });
  });
});
