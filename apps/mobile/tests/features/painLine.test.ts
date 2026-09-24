import type { Feeling } from '@emi/crypto';
import { feelingValues } from '@emi/crypto';

import type { RingInput } from '../../src/features/cycle/ringInput';
import { thePainLineIsOffered } from '../../src/features/home/painLine';

/** A cycle of 28 days with a period of 5, which is where every case below stands her. */
function onCycleDay(day: number): RingInput {
  return {
    cycleLengthDays: 28,
    day,
    phases: [
      { phase: 'period', days: 5 },
      { phase: 'follicular', days: 6 },
      { phase: 'ovulation', days: 6 },
      { phase: 'luteal', days: 11 },
    ],
  };
}

/** A cycle whose period arc covers no days at all, which is what a stated length of nothing draws. */
function withNoPeriodArc(day: number): RingInput {
  return {
    cycleLengthDays: 28,
    day,
    phases: [
      { phase: 'period', days: 0 },
      { phase: 'follicular', days: 11 },
      { phase: 'ovulation', days: 6 },
      { phase: 'luteal', days: 11 },
    ],
  };
}

describe('the line that offers the pain log', () => {
  describe('the answer she gave', () => {
    it('offers the line where she said her period is hard', () => {
      expect(thePainLineIsOffered('hard', onCycleDay(1))).toBe(true);
    });

    for (const answered of feelingValues.filter((answer) => answer !== 'hard')) {
      it(`offers nothing where she said ${answered}`, () => {
        expect(thePainLineIsOffered(answered, onCycleDay(1))).toBe(false);
      });
    }

    it('offers nothing where she passed the question by', () => {
      expect(thePainLineIsOffered(undefined, onCycleDay(1))).toBe(false);
    });

    it('offers nothing for an answer from outside the three the screen gives her', () => {
      expect(thePainLineIsOffered('sad' as Feeling, onCycleDay(1))).toBe(false);
    });
  });

  describe('the day she is on', () => {
    it('offers the line on the first day of the period arc', () => {
      expect(thePainLineIsOffered('hard', onCycleDay(1))).toBe(true);
    });

    it('offers the line on the last day of the period arc', () => {
      expect(thePainLineIsOffered('hard', onCycleDay(5))).toBe(true);
    });

    it('offers nothing on the day after the period arc ends', () => {
      expect(thePainLineIsOffered('hard', onCycleDay(6))).toBe(false);
    });

    it('offers nothing late in the cycle', () => {
      expect(thePainLineIsOffered('hard', onCycleDay(20))).toBe(false);
    });

    it('offers nothing where the ring draws no period arc at all', () => {
      expect(thePainLineIsOffered('hard', withNoPeriodArc(1))).toBe(false);
    });

    it('offers nothing where she has recorded no period, so there is no ring', () => {
      expect(thePainLineIsOffered('hard', undefined)).toBe(false);
    });
  });
});
