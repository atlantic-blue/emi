import { addDays, daysBetween, isBleeding } from '@emi/cycle';
import type { PhaseSpan } from '@emi/tokens';

import type { CycleRow } from '../../data/cycleRepository';
import { forecastOf } from '../forecast/fromCache';
import { startOfWeek, weekdayLetter } from '../onboarding/days';
import { type RingInput, type RingInputFrom, ringInputFor } from './ringInput';

/**
 * Her days, worked out from the cycle each one falls in.
 *
 * The strip and the month draw whatever they are given and derive none of this themselves, which
 * is why the arithmetic sits here beside the ring's own. The cycle day of a date is counted from
 * the cycle that holds it, and whether a date ahead of her is a period day is read off the arcs
 * the ring is drawn from and the forecast the screens already carry, so a week, a month and the
 * ring cannot name different days.
 */

/** The four states a day is drawn in. */
export type DayMark = 'bled' | 'today' | 'forecast' | 'plain';

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

/** How many days the period of the cycle she is in runs, which is the arc the ring draws for it. */
function periodDaysOf(ring: RingInput | undefined): number {
  return ring?.phases.find((span) => span.phase === 'period')?.days ?? 0;
}

/**
 * The days her next period is expected on, read off the range Emi already gives her.
 *
 * Emi never names one day for the next period, so the days marked are the whole range it may start
 * on, and the days her own period would run over from the last of them. A range of three days and a
 * period of five covers seven, and every one of them is a day she may bleed on.
 *
 * A week holds seven days, so the arcs of the cycle she is in carry every day it could mark. A
 * month reaches past the end of that cycle and into the next one, which is a forecast rather than
 * an arc, so it is read here.
 */
function theNextPeriodExpected(
  from: HerDaysFrom,
  ring: RingInput | undefined,
): ReadonlySet<string> {
  const mayStart = forecastOf(from.cycles, from.statedCycleLengthDays).start;
  const runs = periodDaysOf(ring);

  if (mayStart === undefined || runs < 1) {
    return new Set();
  }

  const days = daysBetween(mayStart.from, mayStart.to) + runs;

  return new Set(Array.from({ length: days }, (_unused, index) => addDays(mayStart.from, index)));
}

/**
 * The days she is reading, in the order they were asked for.
 *
 * A day she recorded bleeding on is filled and today is ringed, because both are facts. A day
 * ahead of her that her period is expected on is an outline, because it is an estimate and an
 * estimate she has not lived yet may not look like one she has.
 */
export function herDaysOn(from: HerDaysFrom, days: readonly string[]): HerDay[] {
  const ring = ringInputFor(from);
  const expected = theNextPeriodExpected(from, ring);
  const bled = new Set(
    from.records.filter((record) => isBleeding(record)).map((record) => record.day),
  );

  return days.map((day) => {
    const holding = cycleHolding(from.cycles, day);
    const cycleDay = holding === undefined ? undefined : daysBetween(holding.startedOn, day) + 1;

    return {
      cycleDay,
      date: Number(day.slice(8, 10)),
      day,
      letter: weekdayLetter(day),
      mark: markOf({ bled, cycleDay, day, expected, ring, today: from.today }),
    };
  });
}

/** Her week, Monday to Sunday, with today somewhere in it. */
export function herWeek(from: HerDaysFrom): HerDay[] {
  const monday = startOfWeek(from.today);

  return herDaysOn(
    from,
    Array.from({ length: DAYS_IN_A_WEEK }, (_unused, index) => addDays(monday, index)),
  );
}

interface MarkFrom {
  readonly bled: ReadonlySet<string>;
  readonly cycleDay: number | undefined;
  readonly day: string;
  readonly expected: ReadonlySet<string>;
  readonly ring: { readonly phases: readonly PhaseSpan[] } | undefined;
  readonly today: string;
}

function markOf({ bled, cycleDay, day, expected, ring, today }: MarkFrom): DayMark {
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

  if (ring !== undefined && cycleDay !== undefined && isAPeriodDay(ring.phases, cycleDay)) {
    return 'forecast';
  }

  return expected.has(day) ? 'forecast' : 'plain';
}
