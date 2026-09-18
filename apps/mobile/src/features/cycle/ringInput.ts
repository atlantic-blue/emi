import type { DayRecord } from '@emi/cycle';
import {
  FERTILE_DAYS_AFTER_OVULATION,
  FERTILE_DAYS_BEFORE_OVULATION,
  LUTEAL_LENGTH_DAYS,
  daysBetween,
  isBleeding,
} from '@emi/cycle';
import type { PhaseSpan } from '@emi/tokens';

import type { CycleRow } from '../../data/cycleRepository';
import { forecastOf } from '../forecast/fromCache';

/**
 * What the ring is handed, worked out from the cycle she is in. The ring draws whatever it is
 * given and derives none of this itself, which is why the boundaries are built here.
 *
 * The phase boundaries are the numbers design section 8 publishes: a luteal length counted back
 * from the next period, and a fertile window of five days before ovulation through one day after
 * it. Feature 3 step 6 replaces them with the boundaries her own forecast produces.
 */

export interface RingInput {
  readonly cycleLengthDays: number;
  /** The day she is on, counting from one. */
  readonly day: number;
  readonly phases: readonly PhaseSpan[];
}

export interface RingInputFrom {
  readonly cycles: readonly CycleRow[];
  readonly records: readonly DayRecord[];
  readonly today: string;
  /** Her answer from the first run, used until two cycles of her own exist. */
  readonly statedCycleLengthDays: number;
}

export function phasesOf(lengthDays: number, periodDays: number): PhaseSpan[] {
  const ovulationDay = lengthDays - LUTEAL_LENGTH_DAYS;
  const fertileFrom = ovulationDay - FERTILE_DAYS_BEFORE_OVULATION;
  const fertileTo = Math.min(lengthDays, ovulationDay + FERTILE_DAYS_AFTER_OVULATION);

  // A short cycle runs its fertile window into its period, and a phase never takes a day from the
  // phase before it, so the days that are left over are what each phase gets.
  const period = Math.max(0, Math.min(periodDays, lengthDays));
  const follicularEnds = Math.max(period, fertileFrom - 1);
  const ovulationEnds = Math.max(follicularEnds, fertileTo);

  return [
    { phase: 'period', days: period },
    { phase: 'follicular', days: follicularEnds - period },
    { phase: 'ovulation', days: ovulationEnds - follicularEnds },
    { phase: 'luteal', days: lengthDays - ovulationEnds },
  ];
}

/**
 * Nothing to draw until a period is recorded, because a ring with no cycle behind it would be a
 * picture of somebody else's month.
 */
export function ringInputFor(from: RingInputFrom): RingInput | undefined {
  const open = from.cycles[from.cycles.length - 1];
  if (!open) {
    return undefined;
  }

  const day = daysBetween(open.startedOn, from.today) + 1;
  if (day < 1) {
    return undefined;
  }

  // A cycle running late is drawn at the length it has reached, so the bead stays on the track
  // rather than falling off the end of a forecast she has already passed.
  const cycleLengthDays = Math.max(day, expectedLengthDays(from));
  const periodDays = Math.min(cycleLengthDays, open.periodLengthDays ?? daysBled(from, open));

  return { cycleLengthDays, day, phases: phasesOf(cycleLengthDays, periodDays) };
}

/** The median of her own cycles, and her stated length until two of them are complete. */
function expectedLengthDays(from: RingInputFrom): number {
  const forecast = forecastOf(from.cycles);

  return forecast.kind === 'forecast'
    ? Math.round(forecast.medianLengthDays)
    : from.statedCycleLengthDays;
}

/**
 * The days she bled since this cycle began. A period the cache has not closed yet has no length of
 * its own, and every bleeding day recorded since the start is inside it, because a recorded day
 * without bleeding is what closes one.
 */
function daysBled(from: RingInputFrom, open: CycleRow): number {
  return from.records.filter((record) => record.day >= open.startedOn && isBleeding(record)).length;
}
