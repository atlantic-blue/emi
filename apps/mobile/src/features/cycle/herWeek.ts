import { addDays, daysBetween, isBleeding } from '@emi/cycle';
import type { PhaseSpan } from '@emi/tokens';

import type { CycleRow } from '../../data/cycleRepository';
import { startOfWeek, weekdayLetter } from '../onboarding/days';
import { type RingInputFrom, ringInputFor } from './ringInput';

/**
 * Her week, worked out from the cycle she is in.
 *
 * The strip draws whatever it is given and derives none of this itself, which is why the
 * arithmetic sits here beside the ring's own. The cycle day of a date is counted from the cycle
 * that holds it, and whether a date ahead of her is a period day is read off the arcs the ring is
 * drawn from, so the strip and the ring cannot name different days.
 */

/** The four states a day of the strip is drawn in. */
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

export type HerWeekFrom = RingInputFrom;

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
 * Her week, Monday to Sunday, with today somewhere in it.
 *
 * A day she recorded bleeding on is filled and today is ringed, because both are facts. A day
 * ahead of her that the cycle puts inside the period is an outline, because it is an estimate and
 * an estimate she has not lived yet may not look like one she has.
 */
export function herWeek(from: HerWeekFrom): HerDay[] {
  const monday = startOfWeek(from.today);
  const ring = ringInputFor(from);
  const bled = new Set(
    from.records.filter((record) => isBleeding(record)).map((record) => record.day),
  );

  return Array.from({ length: DAYS_IN_A_WEEK }, (_unused, index) => {
    const day = addDays(monday, index);
    const holding = cycleHolding(from.cycles, day);
    const cycleDay = holding === undefined ? undefined : daysBetween(holding.startedOn, day) + 1;

    return {
      cycleDay,
      date: Number(day.slice(8, 10)),
      day,
      letter: weekdayLetter(day),
      mark: markOf({ bled, cycleDay, day, ring, today: from.today }),
    };
  });
}

interface MarkFrom {
  readonly bled: ReadonlySet<string>;
  readonly cycleDay: number | undefined;
  readonly day: string;
  readonly ring: { readonly phases: readonly PhaseSpan[] } | undefined;
  readonly today: string;
}

function markOf({ bled, cycleDay, day, ring, today }: MarkFrom): DayMark {
  if (day === today) {
    return 'today';
  }
  if (bled.has(day)) {
    return 'bled';
  }

  const ahead = daysBetween(today, day) > 0;

  if (
    ahead &&
    ring !== undefined &&
    cycleDay !== undefined &&
    isAPeriodDay(ring.phases, cycleDay)
  ) {
    return 'forecast';
  }

  return 'plain';
}
