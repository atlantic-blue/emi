import { type CyclePhaseDays, type CyclePhaseName, phaseOnCycleDay } from '@emi/cycle';

import { type RingInputFrom, cycleShapeFor, phaseDaysFor } from '../cycle/ringInput';
import { forecastOf } from '../forecast/fromCache';

/**
 * Where she stands in her cycle today, for the Cycle phase page. It is read from the same shape the
 * ring of Today is drawn from, so the page and the ring cannot name two different phases.
 */

/** What the days of the phases are counted from, which the page says in one sentence. */
export type PhaseEstimate =
  { readonly kind: 'cycles'; readonly count: number } | { readonly kind: 'learning' };

export interface PhaseNow {
  readonly phase: CyclePhaseName;
  readonly day: number;
  readonly cycleLengthDays: number;
  readonly ovulationDay: number;
  readonly phaseDays: CyclePhaseDays;
  readonly estimate: PhaseEstimate;
}

/** Nothing at all where the ring has nothing to draw, because then no phase can be named. */
export function phaseNowFor(from: RingInputFrom): PhaseNow | undefined {
  const read = cycleShapeFor(from);
  const phaseDays = phaseDaysFor(from);
  if (read === undefined || phaseDays === undefined) {
    return undefined;
  }

  const forecast = forecastOf(from.cycles, from.statedCycleLengthDays);

  return {
    phase: phaseOnCycleDay(phaseDays, read.day),
    day: read.day,
    cycleLengthDays: read.shape.cycleLengthDays,
    ovulationDay: read.shape.ovulationDay,
    phaseDays,
    estimate:
      forecast.kind === 'forecast'
        ? { kind: 'cycles', count: forecast.fromCycles }
        : { kind: 'learning' },
  };
}
