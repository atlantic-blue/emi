import { addDays } from '@emi/cycle';
import { type PhaseName, ringGeometry } from '@emi/tokens';

import {
  type RingInputFrom,
  asSheReadItOn,
  cycleShapeFor,
  fertileDaysOf,
  ringOn,
} from '../cycle/ringInput';
import {
  hasItsRangeOpened,
  theCycleAheadHolding,
  theCyclesAhead,
  thePhaseAhead,
} from './forecastAhead';

/**
 * What the cycle layer already says about one date of her month.
 *
 * Nothing here decides a phase or a window. The phase is the one the ring would have drawn on that
 * date, and the day of ovulation is the day the forecast already names, so the month, the ring and
 * the sheet at its foot cannot say three different things about the same date.
 *
 * A date is asked about as the ring read it on that date, which means the cycles that had already
 * started by then. A date in a forecast cycle ahead of her is read off that forecast cycle.
 */

/** The phase a date fell in, whether it is fertile, and whether it is the one day of ovulation. */
export interface DayPhase {
  readonly phase: PhaseName;
  /**
   * True inside the fertile window. The window is not the ovulation phase: it runs five days before
   * the ovulation day to one day after it, and the phase runs two days either side.
   */
  readonly fertile: boolean;
  /** True on the single day the forecast names, which the window around it does not carry. */
  readonly ovulating: boolean;
}

/** The phase the ring would have named on that date. */
export function thePhaseOn(from: RingInputFrom, day: string): PhaseName | undefined {
  const input = ringOn(from, day);

  return input === undefined ? undefined : ringGeometry(input).phase;
}

/**
 * The ovulation day of the cycle holding that date, as the cycle read it then. It is the day the
 * phase rule counts the ovulation phase around, so the darker square and the phase card name the
 * same day. Once two cycles are complete it is the day before the fertile window closes, which is
 * where the forecast puts the ovulation; while Emi is learning it is counted from her stated length.
 */
export function theOvulationDayOn(from: RingInputFrom, day: string): string | undefined {
  const asThen = asSheReadItOn(from, day);
  const read = cycleShapeFor(asThen);
  const holding = asThen.cycles[asThen.cycles.length - 1];
  if (
    read === undefined ||
    holding === undefined ||
    read.shape.ovulationDay <= read.shape.periodDays
  ) {
    return undefined;
  }

  return addDays(holding.startedOn, read.shape.ovulationDay - 1);
}

/** The first and the last date of a fertile window. */
export interface FertileDates {
  readonly from: string;
  readonly to: string;
}

/**
 * The fertile window of the cycle holding that date, as the cycle read it then, in dates. The
 * calendar marks a date fertile when it falls inside this window, and the Sex page names the same
 * two ends, so the note and the marks cannot name different days.
 */
export function theFertileWindowOn(from: RingInputFrom, day: string): FertileDates | undefined {
  const asThen = asSheReadItOn(from, day);
  const read = cycleShapeFor(asThen);
  const holding = asThen.cycles[asThen.cycles.length - 1];
  if (read === undefined || holding === undefined) {
    return undefined;
  }

  const fertile = fertileDaysOf(read.shape);
  if (fertile.to < fertile.from) {
    return undefined;
  }

  return {
    from: addDays(holding.startedOn, fertile.from - 1),
    to: addDays(holding.startedOn, fertile.to - 1),
  };
}

/** Whether a date falls in the fertile window of the cycle holding it, as the cycle read it then. */
export function isFertileOn(from: RingInputFrom, day: string): boolean {
  const window = theFertileWindowOn(from, day);

  return window !== undefined && day >= window.from && day <= window.to;
}

/**
 * What the month colours one date by, or nothing where no cycle of hers holds it. A date ahead of
 * her inside a forecast cycle is coloured by that forecast cycle, so the fertile window and the
 * ovulation day reach the months ahead too.
 */
export function theDayPhaseOn(from: RingInputFrom, day: string): DayPhase | undefined {
  const ahead = day > from.today ? theCycleAheadHolding(theCyclesAhead(from), day) : undefined;
  if (ahead !== undefined && !hasItsRangeOpened(ahead, from.today)) {
    return thePhaseAhead(ahead, day);
  }

  const phase = thePhaseOn(from, day);

  return phase === undefined
    ? undefined
    : { fertile: isFertileOn(from, day), ovulating: theOvulationDayOn(from, day) === day, phase };
}
