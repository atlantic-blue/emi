import { shortestPeriodLengthDays } from '@emi/crypto';
import {
  type DayRecord,
  type Flow,
  type ForecastResult,
  PERIOD_MAY_RUN_FOR_DAYS,
  addDays,
  cyclesFrom,
  daysBetween,
  forecastFrom,
} from '@emi/cycle';

/**
 * The periods she gives from memory: the first run asks for her last three, and the calendar asks
 * again when it has too little to forecast from. Each one is a start day and a number of days, and
 * every one of those days is written as a day she bled.
 */
export interface PastPeriod {
  readonly startedOn: string;
  readonly lengthDays: number;
}

/** How many periods the list asks for. Three starts make two complete cycles. */
export const PAST_PERIODS_ASKED = 3;

/**
 * Days. The longest period the list offers. The cycle arithmetic reads a bleeding day eight or more
 * days after a start as the start of a new cycle, so a longer period given here would be read back
 * as two.
 */
export const longestPastPeriodDays = PERIOD_MAY_RUN_FOR_DAYS;

/** Every length the wheel offers, shortest first. */
export const pastPeriodLengthsOffered: readonly number[] = Array.from(
  { length: longestPastPeriodDays - shortestPeriodLengthDays + 1 },
  (_unused, at) => shortestPeriodLengthDays + at,
);

/** Days. The length the wheel opens on, which is a place to start and never an answer. */
export const pastPeriodLengthOpensOn = 5;

/**
 * She is asked when a period started and for how long, never how heavy it was, so every day is
 * written with the middle value and she can change it on the day.
 */
export const pastPeriodFlow: Flow = 'medium';

/** Days. The bounds the distance between two starts is held to, which is one cycle. */
export const shortestCycleBetweenDays = 21;
export const longestCycleBetweenDays = 45;

export function pastPeriodLengthIsInRange(days: number): boolean {
  return (
    Number.isInteger(days) && days >= shortestPeriodLengthDays && days <= longestPastPeriodDays
  );
}

/**
 * Whether a start can be the period before the one after it. The two starts are one cycle, so the
 * distance is held to the bounds a cycle runs between.
 */
export function startIsOneCycleBefore(earlier: string, later: string): boolean {
  const between = daysBetween(earlier, later);

  return between >= shortestCycleBetweenDays && between <= longestCycleBetweenDays;
}

/**
 * Whether a row of the list can take this start. The newest row is held to the days she has lived
 * from `oldest` on. Every other row is held to one cycle before the row above it, so a row can only
 * be given once the row above it is.
 */
export function startIsInRangeAt(
  row: number,
  day: string,
  periods: readonly PastPeriod[],
  { today, oldest }: { readonly today: string; readonly oldest: string },
): boolean {
  if (row === 0) {
    return day <= today && day >= oldest;
  }

  const above = periods[row - 1];

  return above !== undefined && startIsOneCycleBefore(day, above.startedOn);
}

/** The days a period was a period: from its start for its length, and never a day after today. */
export function theDaysItBled(period: PastPeriod, today: string): string[] {
  return Array.from({ length: period.lengthDays }, (_unused, at) =>
    addDays(period.startedOn, at),
  ).filter((day) => day <= today);
}

/**
 * The list after she gives one row. A row below it that is no longer one cycle before the row
 * above it is dropped, because its range was measured from the start she just changed.
 */
export function periodsAfterGiving(
  periods: readonly PastPeriod[],
  row: number,
  given: PastPeriod,
): PastPeriod[] {
  const kept = [...periods.slice(0, row), given];

  for (const below of periods.slice(row + 1)) {
    const above = kept[kept.length - 1];
    if (above === undefined || !startIsOneCycleBefore(below.startedOn, above.startedOn)) {
      break;
    }
    kept.push(below);
  }

  return kept;
}

/** The list after she removes one row. Every row below it goes too, for the reason above. */
export function periodsAfterRemoving(periods: readonly PastPeriod[], row: number): PastPeriod[] {
  return periods.slice(0, row);
}

export type PastPeriodsRefusal =
  | 'more-periods-than-asked'
  | 'period-start-is-in-the-future'
  | 'period-start-is-too-long-ago'
  | 'period-before-is-out-of-range'
  | 'past-period-length-is-out-of-range';

/**
 * Why a list cannot be written, or nothing where it can. The newest period comes first, and each
 * one after it is one cycle before the one above it.
 */
export function pastPeriodsRefusal(
  periods: readonly PastPeriod[],
  { today, oldest }: { readonly today: string; readonly oldest: string },
): PastPeriodsRefusal | undefined {
  if (periods.length > PAST_PERIODS_ASKED) {
    return 'more-periods-than-asked';
  }

  const newest = periods[0];
  if (newest !== undefined && newest.startedOn > today) {
    return 'period-start-is-in-the-future';
  }
  if (newest !== undefined && newest.startedOn < oldest) {
    return 'period-start-is-too-long-ago';
  }

  const outOfOrder = periods.some(
    (period, row) =>
      row > 0 && !startIsOneCycleBefore(period.startedOn, periods[row - 1]?.startedOn ?? ''),
  );
  if (outOfOrder) {
    return 'period-before-is-out-of-range';
  }

  if (periods.some((period) => !pastPeriodLengthIsInRange(period.lengthDays))) {
    return 'past-period-length-is-out-of-range';
  }

  return undefined;
}

/** Every day the list says she bled, oldest first. */
export function everyDayTheyBled(periods: readonly PastPeriod[], today: string): string[] {
  return periods.flatMap((period) => theDaysItBled(period, today)).sort();
}

/**
 * What Emi can forecast from the list alone, before anything is written. The days are the days the
 * write is about to seal, so the answer is the one the home screen reads after it. Three periods
 * make two complete cycles, which is what the forecast rule asks for.
 */
export function forecastFromPastPeriods(
  periods: readonly PastPeriod[],
  statedCycleLengthDays?: number,
): ForecastResult {
  // A forecast reads only where each cycle starts, so a day of the newest period that is still
  // ahead of her changes nothing here and is not cut off.
  const days: DayRecord[] = everyDayTheyBled(periods, '9999-12-31').map((day) => ({
    day,
    flow: pastPeriodFlow,
  }));

  return forecastFrom(
    cyclesFrom(days),
    statedCycleLengthDays === undefined ? {} : { statedCycleLengthDays },
  );
}
