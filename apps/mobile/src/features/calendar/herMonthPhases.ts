import { FERTILE_DAYS_AFTER_OVULATION, addDays } from '@emi/cycle';
import { type PhaseName, ringGeometry } from '@emi/tokens';

import { forecastOf } from '../forecast/fromCache';
import { type RingInputFrom, ringInputFor } from '../cycle/ringInput';

/**
 * What the cycle layer already says about one date of her month.
 *
 * Nothing here decides a phase or a window. The phase is the one the ring would have drawn on that
 * date, and the day of ovulation is the day the forecast already names, so the month, the ring and
 * the sheet at its foot cannot say three different things about the same date.
 *
 * A date is asked about as the ring read it on that date, which means the cycles that had already
 * started by then. A month she has not lived yet holds no cycle of hers, so it carries no phase.
 */

/** The phase a date fell in, and whether it is the one day of ovulation inside that phase. */
export interface DayPhase {
  readonly phase: PhaseName;
  /** True on the single day the forecast names, which the window around it does not carry. */
  readonly ovulating: boolean;
}

/** Her days as they stood on that date, which is what the ring was drawn from on it. */
function asSheReadItOn(from: RingInputFrom, day: string): RingInputFrom {
  return { ...from, cycles: from.cycles.filter((cycle) => cycle.startedOn <= day), today: day };
}

/** The phase the ring would have named on that date. */
export function thePhaseOn(from: RingInputFrom, day: string): PhaseName | undefined {
  const input = ringInputFor(asSheReadItOn(from, day));

  return input === undefined ? undefined : ringGeometry(input).phase;
}

/**
 * The middle of the fertile window of the cycle holding that date. Nothing at all while Emi is
 * still learning her cycles, because until then it publishes no window.
 *
 * It is counted back from the end of the window rather than read off the forecast, because the
 * interface names neither of the two single days a forecast carries, which is contract CYCLE-2.
 * The window closes one day after the middle, so the two are the same date by construction.
 */
export function theOvulationDayOn(from: RingInputFrom, day: string): string | undefined {
  const read = asSheReadItOn(from, day);
  const forecast = forecastOf(read.cycles, read.statedCycleLengthDays);

  return forecast.kind === 'forecast'
    ? addDays(forecast.fertileWindow.to, -FERTILE_DAYS_AFTER_OVULATION)
    : undefined;
}

/** What the month colours one date by, or nothing where no cycle of hers holds it. */
export function theDayPhaseOn(from: RingInputFrom, day: string): DayPhase | undefined {
  const phase = thePhaseOn(from, day);

  return phase === undefined
    ? undefined
    : { ovulating: theOvulationDayOn(from, day) === day, phase };
}
