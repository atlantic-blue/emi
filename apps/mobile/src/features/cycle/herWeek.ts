import { daysBetween, isBleeding } from '@emi/cycle';
import type { PhaseSpan } from '@emi/tokens';

import type { CycleRow } from '../../data/cycleRepository';
import {
  type CycleAhead,
  hasItsRangeOpened,
  isAForecastPeriodDay,
  isALikelyPeriodDay,
  theCycleAheadHolding,
  theCyclesAhead,
  theDayOfTheCycleAhead,
} from '../calendar/forecastAhead';
import { weekdayLetter } from '../onboarding/days';
import { type RingInputFrom, ringInputFor } from './ringInput';

/**
 * Her days, worked out from the cycle each one falls in.
 *
 * The strip and the month draw whatever they are given and derive none of this themselves, which
 * is why the arithmetic sits here beside the ring's own. The cycle day of a date is counted from
 * the cycle that holds it, and whether a date ahead of her is a period day is read off the arcs
 * the ring is drawn from and the forecast the screens already carry, so a week, a month and the
 * ring cannot name different days.
 */

/**
 * The states a day is drawn in. A forecast day is one of the period days counted from the middle of
 * the range, and a possible day is a ringed day either side of them.
 */
export type DayMark = 'bled' | 'today' | 'forecast' | 'possible' | 'plain';

/** The week runs Monday to Sunday, which is the week the calendar of the first run already draws. */
export const DAYS_IN_A_WEEK = 7;

export interface HerDay {
  /** The calendar day, as a year, a month and a day. */
  readonly day: string;
  /** The letter of the weekday, from the catalogue, in her own language. */
  readonly letter: string;
  /** The day of the month, which is the number she reads. */
  readonly date: number;
  /** The day of the cycle that day falls in, or nothing at all before her first cycle began. */
  readonly cycleDay: number | undefined;
  readonly mark: DayMark;
}

export type HerDaysFrom = RingInputFrom;

/** The cycle a day falls in, which is the last one that had started by then. */
function cycleHolding(cycles: readonly CycleRow[], day: string): CycleRow | undefined {
  let holding: CycleRow | undefined;

  for (const cycle of cycles) {
    if (daysBetween(cycle.startedOn, day) >= 0) {
      holding = cycle;
    }
  }

  return holding;
}

/**
 * Whether a cycle day falls inside the period the ring draws. The arcs are counted from day one,
 * so the period is the first of them and a day past the end of the cycle is in none.
 */
function isAPeriodDay(phases: readonly PhaseSpan[], cycleDay: number): boolean {
  let firstDay = 1;

  for (const span of phases) {
    if (cycleDay >= firstDay && cycleDay < firstDay + span.days) {
      return span.phase === 'period';
    }

    firstDay += span.days;
  }

  return false;
}

/**
 * The days she is reading, in the order they were asked for.
 *
 * A day she recorded bleeding on is filled and today is ringed, because both are facts. A day
 * ahead of her that the forecast puts a period on is an outline, because it is an estimate and an
 * estimate she has not lived yet may not look like one she has.
 *
 * A day ahead of her inside a forecast cycle counts its cycle day from the day that forecast period
 * starts, so the count starts again at one on each period, real or forecast.
 */
export function herDaysOn(from: HerDaysFrom, days: readonly string[]): HerDay[] {
  const ring = ringInputFor(from);
  const ahead = theCyclesAhead(from);
  const bled = new Set(
    from.records.filter((record) => isBleeding(record)).map((record) => record.day),
  );

  return days.map((day) => {
    const forecast =
      daysBetween(from.today, day) > 0 ? theCycleAheadHolding(ahead, day) : undefined;
    const holding = cycleHolding(from.cycles, day);
    const cycleDay =
      forecast !== undefined && !hasItsRangeOpened(forecast, from.today)
        ? theDayOfTheCycleAhead(forecast, day)
        : holding === undefined
          ? undefined
          : daysBetween(holding.startedOn, day) + 1;

    return {
      cycleDay,
      date: Number(day.slice(8, 10)),
      day,
      letter: weekdayLetter(day),
      mark: markOf({ bled, cycleDay, day, forecast, ring, today: from.today }),
    };
  });
}

interface MarkFrom {
  readonly bled: ReadonlySet<string>;
  readonly cycleDay: number | undefined;
  readonly day: string;
  /** The forecast cycle holding a day ahead of her, or nothing. */
  readonly forecast: CycleAhead | undefined;
  readonly ring: { readonly phases: readonly PhaseSpan[] } | undefined;
  readonly today: string;
}

function markOf({ bled, cycleDay, day, forecast, ring, today }: MarkFrom): DayMark {
  if (day === today) {
    return 'today';
  }
  if (bled.has(day)) {
    return 'bled';
  }

  const ahead = daysBetween(today, day) > 0;

  if (!ahead) {
    return 'plain';
  }

  if (forecast !== undefined) {
    if (!isAForecastPeriodDay(forecast, day)) {
      return 'plain';
    }

    return isALikelyPeriodDay(forecast, day) ? 'forecast' : 'possible';
  }

  // The rest of the period she is in, on the days ahead of her before the next forecast period.
  return ring !== undefined && cycleDay !== undefined && isAPeriodDay(ring.phases, cycleDay)
    ? 'forecast'
    : 'plain';
}
