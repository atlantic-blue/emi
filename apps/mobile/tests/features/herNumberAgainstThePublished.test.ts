import {
  CYCLE_LENGTH_HIGH_DAYS,
  CYCLE_LENGTH_LOW_DAYS,
  PERIOD_MAY_RUN_FOR_DAYS,
  POPULATION_SPREAD_DAYS,
  PUBLISHED_CYCLE_LENGTH,
  PUBLISHED_CYCLE_LENGTH_VARIATION,
  PUBLISHED_PERIOD_DURATION,
  publishedFigures,
} from '@emi/cycle';

import { howHerNumberSits } from '../../src/features/home/herNumbers';

/**
 * Where one of her figures sits against the figure a paper reports for the same measurement.
 *
 * The rule decides one word on one pill and writes nothing. It never says a figure is right, and it
 * never names her: `within` means inside every bound the paper reports, and `wider` means outside
 * it, at either end.
 */

describe('her own figure, read against the one a paper reports', () => {
  describe('a range, which is how the cycle length is published', () => {
    it('is within where her cycle ran inside both ends of the range', () => {
      expect(howHerNumberSits(27, PUBLISHED_CYCLE_LENGTH.value)).toBe('within');
      expect(howHerNumberSits(CYCLE_LENGTH_LOW_DAYS, PUBLISHED_CYCLE_LENGTH.value)).toBe('within');
      expect(howHerNumberSits(CYCLE_LENGTH_HIGH_DAYS, PUBLISHED_CYCLE_LENGTH.value)).toBe('within');
    });

    it('is wider where her cycle ran past the top of the range', () => {
      expect(howHerNumberSits(CYCLE_LENGTH_HIGH_DAYS + 1, PUBLISHED_CYCLE_LENGTH.value)).toBe(
        'wider',
      );
      expect(howHerNumberSits(40, PUBLISHED_CYCLE_LENGTH.value)).toBe('wider');
    });

    it('is wider where her cycle ran under the foot of the range, because there is no third word', () => {
      expect(howHerNumberSits(CYCLE_LENGTH_LOW_DAYS - 1, PUBLISHED_CYCLE_LENGTH.value)).toBe(
        'wider',
      );
      expect(howHerNumberSits(22, PUBLISHED_CYCLE_LENGTH.value)).toBe('wider');
    });
  });

  describe('an upper bound, which is how the bleeding duration is published', () => {
    it('is within up to and including the day the paper bounds it at', () => {
      expect(howHerNumberSits(5, PUBLISHED_PERIOD_DURATION.value)).toBe('within');
      expect(howHerNumberSits(PERIOD_MAY_RUN_FOR_DAYS, PUBLISHED_PERIOD_DURATION.value)).toBe(
        'within',
      );
    });

    it('is wider for a bleed longer than that bound', () => {
      expect(howHerNumberSits(PERIOD_MAY_RUN_FOR_DAYS + 1, PUBLISHED_PERIOD_DURATION.value)).toBe(
        'wider',
      );
    });
  });

  describe('a mean, which is how the cycle length variation is published', () => {
    it('is within where her variation is at or under the cohort mean', () => {
      expect(howHerNumberSits(1.2, PUBLISHED_CYCLE_LENGTH_VARIATION.value)).toBe('within');
      expect(howHerNumberSits(POPULATION_SPREAD_DAYS, PUBLISHED_CYCLE_LENGTH_VARIATION.value)).toBe(
        'within',
      );
    });

    it('is wider where her own cycles move more than the cohort mean', () => {
      expect(howHerNumberSits(7.1, PUBLISHED_CYCLE_LENGTH_VARIATION.value)).toBe('wider');
      expect(howHerNumberSits(2.7, PUBLISHED_CYCLE_LENGTH_VARIATION.value)).toBe('wider');
    });

    it('reads the mean alone and never the mean plus its deviation', () => {
      const value = PUBLISHED_CYCLE_LENGTH_VARIATION.value;

      if (value.kind !== 'mean') {
        throw new Error('the variation is published as a mean, and this figure is not one');
      }

      expect(howHerNumberSits(value.mean + value.deviation, value)).toBe('wider');
    });
  });

  describe('no published figure at all', () => {
    it('says there is no figure, rather than guessing at one', () => {
      expect(howHerNumberSits(37, undefined)).toBe('noFigure');
      expect(howHerNumberSits(0, undefined)).toBe('noFigure');
    });

    it('is the answer no row reaches today, because every figure in the list is cited', () => {
      expect(publishedFigures).toHaveLength(3);

      for (const figure of publishedFigures) {
        expect(howHerNumberSits(figure.value.kind === 'mean' ? 0 : 1, figure.value)).not.toBe(
          'noFigure',
        );
      }
    });
  });
});
