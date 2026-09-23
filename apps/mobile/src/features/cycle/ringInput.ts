import type { DayRecord, Forecast } from '@emi/cycle';
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
 * Once two of her cycles are complete the boundaries are the forecast's own days, so the arc the
 * ring draws ahead of her covers the days the screen names underneath it. Until then they are
 * counted from the length she gave at the first run, by the one rule below.
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
  /**
   * How long she said her period runs at the first run. Nothing at all where she said she is not
   * sure, and then the arc is the days she logged and nothing else.
   */
  readonly statedPeriodLengthDays?: number;
}

/** The days of one cycle the ring divides into arcs, each counted from the day it began. */
export interface CycleShape {
  readonly cycleLengthDays: number;
  readonly periodDays: number;
  /** The first cycle day of the fertile window, counting from one. */
  readonly fertileFromDay: number;
  /** The last cycle day of the fertile window. */
  readonly fertileToDay: number;
}

/**
 * The four arcs, from the days they cover. A short cycle runs its fertile window into its period,
 * and a phase never takes a day from the phase before it, so the days that are left over are what
 * each phase gets.
 */
export function phasesOf(shape: CycleShape): PhaseSpan[] {
  const length = shape.cycleLengthDays;
  const period = Math.max(0, Math.min(shape.periodDays, length));
  const follicularEnds = Math.max(period, shape.fertileFromDay - 1);
  const ovulationEnds = Math.max(follicularEnds, Math.min(length, shape.fertileToDay));

  return [
    { phase: 'period', days: period },
    { phase: 'follicular', days: follicularEnds - period },
    { phase: 'ovulation', days: ovulationEnds - follicularEnds },
    { phase: 'luteal', days: length - ovulationEnds },
  ];
}

/**
 * The shape of a cycle nobody has forecast yet, from the length she gave at the first run. The
 * luteal length is counted back from the first day of the next cycle, which is the day design
 * section 8 counts from, so the learning state and the forecast divide a cycle the same way.
 */
export function shapeFromLength(cycleLengthDays: number, periodDays: number): CycleShape {
  const ovulationDay = cycleLengthDays + 1 - LUTEAL_LENGTH_DAYS;

  return {
    cycleLengthDays,
    periodDays,
    fertileFromDay: ovulationDay - FERTILE_DAYS_BEFORE_OVULATION,
    fertileToDay: ovulationDay + FERTILE_DAYS_AFTER_OVULATION,
  };
}

/**
 * The shape her own forecast produced, as cycle days. The window arrives as two dates, and the day
 * the cycle started turns them into the two numbers the ring draws between, so the arc and the
 * sentence under it can never name different days.
 */
export function shapeFromForecast(
  startedOn: string,
  forecast: Forecast,
  cycleLengthDays: number,
  periodDays: number,
): CycleShape {
  return {
    cycleLengthDays,
    periodDays,
    fertileFromDay: daysBetween(startedOn, forecast.fertileWindow.from) + 1,
    fertileToDay: daysBetween(startedOn, forecast.fertileWindow.to) + 1,
  };
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

  const forecast = forecastOf(from.cycles);
  const expectedLengthDays =
    forecast.kind === 'forecast'
      ? Math.round(forecast.medianLengthDays)
      : from.statedCycleLengthDays;

  // A cycle running late is drawn at the length it has reached, so the bead stays on the track
  // rather than falling off the end of a forecast she has already passed.
  const cycleLengthDays = Math.max(day, expectedLengthDays);
  const periodDays = Math.min(cycleLengthDays, periodDaysOf(from, open));

  const shape =
    forecast.kind === 'forecast'
      ? shapeFromForecast(open.startedOn, forecast, cycleLengthDays, periodDays)
      : shapeFromLength(cycleLengthDays, periodDays);

  return { cycleLengthDays, day, phases: phasesOf(shape) };
}

/**
 * How long the period arc runs. A period she has closed is the days she lived, so it wins over
 * everything: that number is a record and the rest is an estimate.
 *
 * Until she closes one the arc is drawn at the length she gave at the first run, because a period
 * that began yesterday is not a period of one day. Where she said nothing, or where she has
 * already bled past what she said, the days she logged carry it instead, so the arc is never
 * shorter than the bleeding she recorded.
 */
function periodDaysOf(from: RingInputFrom, open: CycleRow): number {
  if (open.periodLengthDays !== null) {
    return open.periodLengthDays;
  }

  return Math.max(from.statedPeriodLengthDays ?? 0, daysBled(from, open));
}

/**
 * The days she bled since this cycle began. A period the cache has not closed yet has no length of
 * its own, and every bleeding day recorded since the start is inside it, because a recorded day
 * without bleeding is what closes one.
 */
function daysBled(from: RingInputFrom, open: CycleRow): number {
  return from.records.filter((record) => record.day >= open.startedOn && isBleeding(record)).length;
}
