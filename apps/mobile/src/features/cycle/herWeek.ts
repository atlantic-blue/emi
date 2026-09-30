import type { DayRecord } from '@emi/cycle';

import type { CycleRow } from '../../data/cycleRepository';

/**
 * Her week, worked out from the cycle she is in. The strip draws whatever it is given and derives
 * none of this itself, which is why the arithmetic sits here beside the ring's own: the two read
 * the same cycle cache and the same day log, so they cannot name different days.
 */

/** The four states a day of the strip is drawn in. */
export type DayMark = 'bled' | 'today' | 'forecast' | 'plain';

/** The week runs Monday to Sunday, which is the week the calendar of the first run already draws. */
export const DAYS_IN_A_WEEK = 7;

export interface DayOfHerWeek {
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

export interface HerWeekFrom {
  readonly cycles: readonly CycleRow[];
  readonly records: readonly DayRecord[];
  readonly today: string;
  /** Her answer from the first run, used until two cycles of her own exist. */
  readonly statedCycleLengthDays: number;
  /** How long she said her period runs, and nothing at all where she said she is not sure. */
  readonly statedPeriodLengthDays?: number;
}

export function herWeek(from: HerWeekFrom): DayOfHerWeek[] {
  void from;

  return [];
}
