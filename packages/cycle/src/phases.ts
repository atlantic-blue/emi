import { LUTEAL_LENGTH_DAYS } from './forecast';

/**
 * The four phases of one cycle, as cycle days counted from one. This is the one place the rule
 * lives, contract CYCLE-6, and every screen that names a phase reads it from here.
 *
 * The follicular phase starts on day 1, so it holds the period. While she bleeds the phase she is
 * in is the period, and the follicular phase is the days after it up to the ovulation phase. The
 * fertile window is a different thing and stays in forecast.ts.
 */

/** The four names, the same four `PhaseName` carries in `@emi/tokens`. */
export type CyclePhaseName = 'period' | 'follicular' | 'ovulation' | 'luteal';

/** The ovulation phase is the ovulation day with this many days before it. */
export const OVULATION_PHASE_DAYS_BEFORE = 2;
/** And this many days after it, so the phase is five days. */
export const OVULATION_PHASE_DAYS_AFTER = 2;

/**
 * Cycle days from one day to another, both inside. A phase with no days has `to` one day before
 * `from`, so the day after it is still where the next phase starts.
 */
export interface CycleDays {
  readonly from: number;
  readonly to: number;
}

/** What the rule is worked out from, three whole numbers of days. */
export interface CyclePhaseDaysFrom {
  readonly cycleLengthDays: number;
  /** The days she bleeds, or nothing at all where no period length is known. */
  readonly periodLengthDays: number;
  /** The cycle day of the forecast ovulation. */
  readonly ovulationDay: number;
}

/** The days of each of the four phases of one cycle. */
export interface CyclePhaseDays {
  readonly cycleLengthDays: number;
  /** Day 1 to the period length. */
  readonly period: CycleDays;
  /** Day 1 to the day before the ovulation phase. It holds the period. */
  readonly follicular: CycleDays;
  /** The ovulation day, two days before it and two after it, never on a period day. */
  readonly ovulation: CycleDays;
  /** The day after the ovulation phase to the last day of the cycle. */
  readonly luteal: CycleDays;
}

/**
 * The ovulation day of a cycle Emi has not forecast yet: the luteal length counted back from the
 * first day of the next cycle, which is how the forecast counts it.
 */
export function ovulationDayWhileLearning(cycleLengthDays: number): number {
  return cycleLengthDays + 1 - LUTEAL_LENGTH_DAYS;
}

function refuseAPartOfADay(name: string, value: number): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be a whole number of days, and it is ${value}`);
  }
}

/**
 * The days of each phase. A short cycle can run the ovulation phase into the period. The period is
 * what she recorded, so it wins: the ovulation phase starts on the day after the period at the
 * earliest, and it can then hold fewer than five days, or none.
 */
export function cyclePhaseDays(from: CyclePhaseDaysFrom): CyclePhaseDays {
  const { cycleLengthDays: length, periodLengthDays, ovulationDay } = from;
  refuseAPartOfADay('the cycle length', length);
  refuseAPartOfADay('the period length', periodLengthDays);
  refuseAPartOfADay('the ovulation day', ovulationDay);
  if (length < 1) {
    throw new RangeError(`a cycle has at least one day, and this one has ${length}`);
  }

  const periodTo = Math.max(0, Math.min(periodLengthDays, length));
  const ovulationFrom = Math.min(
    length + 1,
    Math.max(periodTo + 1, ovulationDay - OVULATION_PHASE_DAYS_BEFORE),
  );
  const ovulationTo = Math.max(
    ovulationFrom - 1,
    Math.min(length, ovulationDay + OVULATION_PHASE_DAYS_AFTER),
  );

  return {
    cycleLengthDays: length,
    period: { from: 1, to: periodTo },
    follicular: { from: 1, to: ovulationFrom - 1 },
    ovulation: { from: ovulationFrom, to: ovulationTo },
    luteal: { from: ovulationTo + 1, to: length },
  };
}

/**
 * The phase she is in on one cycle day. The period wins while she bleeds. A day past the end of the
 * cycle is a cycle running late, and it stays luteal until the next period starts.
 */
export function phaseOnCycleDay(phases: CyclePhaseDays, cycleDay: number): CyclePhaseName {
  refuseAPartOfADay('the cycle day', cycleDay);
  if (cycleDay < 1) {
    throw new RangeError(`a cycle starts on day 1, and this is day ${cycleDay}`);
  }

  if (cycleDay <= phases.period.to) {
    return 'period';
  }
  if (cycleDay < phases.ovulation.from) {
    return 'follicular';
  }
  if (cycleDay <= phases.ovulation.to) {
    return 'ovulation';
  }

  return 'luteal';
}
