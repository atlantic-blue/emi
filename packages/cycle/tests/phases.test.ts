import { LUTEAL_LENGTH_DAYS } from '../src/forecast';
import {
  OVULATION_PHASE_DAYS_AFTER,
  OVULATION_PHASE_DAYS_BEFORE,
  type CyclePhaseDays,
  cyclePhaseDays,
  ovulationDayWhileLearning,
  phaseOnCycleDay,
} from '../src/phases';

/**
 * The phase rule, contract CYCLE-6. The period is days 1 to the period length. The follicular
 * phase is the day after the period to the day before the ovulation phase. The ovulation phase is
 * the ovulation day with two days either side. The luteal phase is the rest.
 */

function herPhases(cycleLengthDays: number, periodLengthDays: number): CyclePhaseDays {
  return cyclePhaseDays({
    cycleLengthDays,
    periodLengthDays,
    ovulationDay: ovulationDayWhileLearning(cycleLengthDays),
  });
}

describe('the ovulation day while Emi is learning', () => {
  it('should count back the luteal length from the first day of the next cycle', () => {
    expect(ovulationDayWhileLearning(28)).toBe(28 + 1 - LUTEAL_LENGTH_DAYS);
    expect(ovulationDayWhileLearning(28)).toBe(16);
  });
});

describe('the ovulation phase', () => {
  it('should be five days, two before the ovulation day and two after it', () => {
    expect(OVULATION_PHASE_DAYS_BEFORE + 1 + OVULATION_PHASE_DAYS_AFTER).toBe(5);
  });
});

describe.each([
  {
    cycle: 28,
    period: 3,
    days: { period: [1, 3], follicular: [4, 13], ovulation: [14, 18], luteal: [19, 28] },
  },
  {
    cycle: 28,
    period: 7,
    days: { period: [1, 7], follicular: [8, 13], ovulation: [14, 18], luteal: [19, 28] },
  },
  {
    cycle: 21,
    period: 3,
    days: { period: [1, 3], follicular: [4, 6], ovulation: [7, 11], luteal: [12, 21] },
  },
  {
    cycle: 21,
    period: 7,
    days: { period: [1, 7], follicular: [8, 7], ovulation: [8, 11], luteal: [12, 21] },
  },
  {
    cycle: 33,
    period: 3,
    days: { period: [1, 3], follicular: [4, 18], ovulation: [19, 23], luteal: [24, 33] },
  },
  {
    cycle: 33,
    period: 7,
    days: { period: [1, 7], follicular: [8, 18], ovulation: [19, 23], luteal: [24, 33] },
  },
  {
    cycle: 45,
    period: 3,
    days: { period: [1, 3], follicular: [4, 30], ovulation: [31, 35], luteal: [36, 45] },
  },
  {
    cycle: 45,
    period: 7,
    days: { period: [1, 7], follicular: [8, 30], ovulation: [31, 35], luteal: [36, 45] },
  },
])('a cycle of $cycle days with a period of $period days', ({ cycle, period, days }) => {
  const phases = herPhases(cycle, period);

  it('should run the period from day 1 to the period length', () => {
    expect([phases.period.from, phases.period.to]).toEqual(days.period);
  });

  it('should start the follicular phase on the day after the period', () => {
    expect([phases.follicular.from, phases.follicular.to]).toEqual(days.follicular);
  });

  it('should give the ovulation phase the days around the ovulation day', () => {
    expect([phases.ovulation.from, phases.ovulation.to]).toEqual(days.ovulation);
  });

  it('should run the luteal phase from the day after ovulation to the last day', () => {
    expect([phases.luteal.from, phases.luteal.to]).toEqual(days.luteal);
  });

  it('should name the period on day 1 and on the last period day', () => {
    expect(phaseOnCycleDay(phases, 1)).toBe('period');
    expect(phaseOnCycleDay(phases, period)).toBe('period');
  });

  it('should name the ovulation phase on the ovulation day', () => {
    expect(phaseOnCycleDay(phases, ovulationDayWhileLearning(cycle))).toBe('ovulation');
  });

  it('should name the luteal phase on the last day', () => {
    expect(phaseOnCycleDay(phases, cycle)).toBe('luteal');
  });

  it('should name the follicular phase on the day after the period, where one exists', () => {
    const afterThePeriod = period + 1;

    expect(phaseOnCycleDay(phases, afterThePeriod)).toBe(
      afterThePeriod < phases.ovulation.from ? 'follicular' : 'ovulation',
    );
  });
});

describe('the four phases side by side', () => {
  const shapes = [5, 15, 18, 21, 22, 28, 33, 45].flatMap((cycle) =>
    [0, 1, 2, 5, 7, 12].map((period) => ({ cycle, period })),
  );

  it.each(shapes)(
    'should give every day of a $cycle day cycle with a $period day period one phase',
    ({ cycle, period }) => {
      const phases = herPhases(cycle, period);
      const inOrder = [phases.period, phases.follicular, phases.ovulation, phases.luteal];

      expect(inOrder[0]?.from).toBe(1);
      for (const [index, days] of inOrder.entries()) {
        expect(days.to).toBeGreaterThanOrEqual(days.from - 1);
        if (index > 0) {
          expect(days.from).toBe((inOrder[index - 1]?.to ?? 0) + 1);
        }
      }
      expect(inOrder[3]?.to).toBe(cycle);
    },
  );
});

describe('a cycle with no period length', () => {
  it('should name day 1 follicular, because no period is recorded', () => {
    const phases = herPhases(28, 0);

    expect(phases.period.to).toBe(0);
    expect(phases.follicular.from).toBe(1);
    expect(phaseOnCycleDay(phases, 1)).toBe('follicular');
  });
});

describe('a short cycle, where the period runs into the ovulation phase', () => {
  it('should start the ovulation phase on the day after the period at the earliest', () => {
    const phases = herPhases(18, 6);

    expect(ovulationDayWhileLearning(18)).toBe(6);
    expect([phases.ovulation.from, phases.ovulation.to]).toEqual([7, 8]);
    expect(phaseOnCycleDay(phases, 6)).toBe('period');
    expect(phaseOnCycleDay(phases, 7)).toBe('ovulation');
  });

  it('should give the ovulation phase no days where the period covers all of it', () => {
    const phases = herPhases(15, 7);

    expect(ovulationDayWhileLearning(15)).toBe(3);
    expect(phases.ovulation.to).toBe(phases.ovulation.from - 1);
    expect(phases.luteal.from).toBe(8);
    expect(phaseOnCycleDay(phases, 8)).toBe('luteal');
  });

  it('should hold every phase inside a period as long as the cycle', () => {
    const phases = herPhases(5, 5);

    expect(phases.period).toEqual({ from: 1, to: 5 });
    expect(phases.luteal.to).toBe(phases.luteal.from - 1);
    expect(phaseOnCycleDay(phases, 5)).toBe('period');
  });

  it('should clip a period longer than the cycle to the cycle', () => {
    expect(herPhases(10, 12).period).toEqual({ from: 1, to: 10 });
  });
});

describe('a cycle running past the length it was forecast at', () => {
  it('should name every later day luteal', () => {
    const phases = herPhases(28, 5);

    expect(phaseOnCycleDay(phases, 40)).toBe('luteal');
  });
});

describe('days the rule refuses', () => {
  it('should refuse a cycle of no days', () => {
    expect(() =>
      cyclePhaseDays({ cycleLengthDays: 0, periodLengthDays: 0, ovulationDay: 1 }),
    ).toThrow(RangeError);
  });

  it('should refuse a part of a day', () => {
    expect(() =>
      cyclePhaseDays({ cycleLengthDays: 28.5, periodLengthDays: 5, ovulationDay: 16 }),
    ).toThrow(RangeError);
  });

  it('should refuse a cycle day before day 1', () => {
    expect(() => phaseOnCycleDay(herPhases(28, 5), 0)).toThrow(RangeError);
  });
});
