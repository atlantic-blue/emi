import {
  type DayRecord,
  type Forecast,
  FERTILE_DAYS_AFTER_OVULATION,
  FERTILE_DAYS_BEFORE_OVULATION,
  type CycleDays,
  type CyclePhaseDays,
  cyclePhaseDays,
  daysBetween,
  isBleeding,
  ovulationDayWhileLearning,
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
  /** The cycle day of the forecast ovulation, which the ovulation phase is counted around. */
  readonly ovulationDay: number;
  /** The first cycle day of the fertile window, counting from one. */
  readonly fertileFromDay: number;
  /** The last cycle day of the fertile window. */
  readonly fertileToDay: number;
}

/**
 * The four arcs, from the phase rule in `@emi/cycle`. The arcs never overlap, so the period arc is
 * days 1 to the period length and the follicular arc is the days after it up to the ovulation
 * phase. The follicular phase itself starts on day 1 and holds the period: the ring draws the
 * period over it because the period is the phase she is in while she bleeds.
 */
export function phasesOf(shape: CycleShape): PhaseSpan[] {
  const phases = cyclePhaseDays({
    cycleLengthDays: shape.cycleLengthDays,
    periodLengthDays: shape.periodDays,
    ovulationDay: shape.ovulationDay,
  });
  const periodDays = phases.period.to;

  return [
    { phase: 'period', days: periodDays },
    { phase: 'follicular', days: phases.follicular.to - periodDays },
    { phase: 'ovulation', days: phases.ovulation.to - phases.ovulation.from + 1 },
    { phase: 'luteal', days: phases.luteal.to - phases.luteal.from + 1 },
  ];
}

/**
 * The days the calendar marks fertile. This is the fertile window, a separate thing from the
 * ovulation phase, and a period day is never marked fertile because what she recorded wins.
 */
export function fertileDaysOf(shape: CycleShape): CycleDays {
  const period = Math.max(0, Math.min(shape.periodDays, shape.cycleLengthDays));
  const from = Math.max(period + 1, shape.fertileFromDay);

  return { from, to: Math.max(from - 1, Math.min(shape.cycleLengthDays, shape.fertileToDay)) };
}

/**
 * The shape of a cycle nobody has forecast yet, from the length she gave at the first run. The
 * luteal length is counted back from the first day of the next cycle, which is the day design
 * section 8 counts from, so the learning state and the forecast divide a cycle the same way.
 */
export function shapeFromLength(cycleLengthDays: number, periodDays: number): CycleShape {
  const ovulationDay = ovulationDayWhileLearning(cycleLengthDays);

  return {
    cycleLengthDays,
    periodDays,
    ovulationDay,
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
  const fertileToDay = daysBetween(startedOn, forecast.fertileWindow.to) + 1;

  return {
    cycleLengthDays,
    periodDays,
    // Counted back from the end of the window rather than read off the forecast, which is how the
    // calendar names the same day, so the two can never disagree.
    ovulationDay: fertileToDay - FERTILE_DAYS_AFTER_OVULATION,
    fertileFromDay: daysBetween(startedOn, forecast.fertileWindow.from) + 1,
    fertileToDay,
  };
}

/**
 * Nothing to draw until a period is recorded, because a ring with no cycle behind it would be a
 * picture of somebody else's month.
 */
export function ringInputFor(from: RingInputFrom): RingInput | undefined {
  const read = cycleShapeFor(from);

  return read === undefined
    ? undefined
    : { cycleLengthDays: read.shape.cycleLengthDays, day: read.day, phases: phasesOf(read.shape) };
}

/**
 * The days of each of the four phases of the cycle she is in, by the phase rule, read from the
 * same shape the ring is drawn from. Nothing at all where the ring has nothing to draw.
 */
export function phaseDaysFor(from: RingInputFrom): CyclePhaseDays | undefined {
  const read = cycleShapeFor(from);

  return read === undefined
    ? undefined
    : cyclePhaseDays({
        cycleLengthDays: read.shape.cycleLengthDays,
        periodLengthDays: read.shape.periodDays,
        ovulationDay: read.shape.ovulationDay,
      });
}

/** The day she is on and the shape of the cycle holding it, which the ring and the month read. */
export function cycleShapeFor(
  from: RingInputFrom,
): { readonly day: number; readonly shape: CycleShape } | undefined {
  const open = from.cycles[from.cycles.length - 1];
  if (!open) {
    return undefined;
  }

  const day = daysBetween(open.startedOn, from.today) + 1;
  if (day < 1) {
    return undefined;
  }

  const forecast = forecastOf(from.cycles, from.statedCycleLengthDays);
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

  return { day, shape };
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
