import type { DayRecord } from '@emi/crypto';
import { type DayRange, daysBetween } from '@emi/cycle';
import type { PhaseName } from '@emi/tokens';

import type { HerDay, HerDaysFrom } from '../cycle/herWeek';
import { whatSheMarkedOn } from '../log/copy';
import { thePeriodADayWaitsFor, theCyclesAhead } from './forecastAhead';
import { thePhaseOn } from './herMonthPhases';

/**
 * The day she pressed in the month, as the card at the foot reads it back.
 *
 * Nothing here counts a cycle day or decides a phase. The cycle day is the one the square already
 * draws over that date, handed straight on, and the phase is the one the ring would have drawn on
 * that day, so the card cannot disagree with either of the two things she reads it beside.
 *
 * A day ahead of her is a forecast, so the card says when the period it waits for may start, and
 * nothing about a phase or a record she cannot have yet.
 */
/** Her days as the month and the card both read them, with the whole of each day she recorded. */
export interface HerReading extends HerDaysFrom {
  readonly records: readonly DayRecord[];
}

/** The forecast period a day ahead of her waits for. */
export interface PeriodItWaitsFor {
  /** Zero for her next period, more for a period after it. */
  readonly order: number;
  readonly mayStart: DayRange;
}

export type WhatTheSheetSays =
  | {
      readonly kind: 'lived';
      readonly day: string;
      /** The day of her cycle, or nothing at all where no cycle of hers holds that date. */
      readonly cycleDay?: number;
      /** The phase that date fell in, on the same terms. */
      readonly phase?: PhaseName;
      /** What she marked on it, in her own words, or nothing where she marked nothing. */
      readonly logged?: string;
    }
  | {
      readonly kind: 'ahead';
      readonly day: string;
      /** Nothing where the forecast reaches no period on or after that day. */
      readonly waitsFor?: PeriodItWaitsFor;
    };

export function whatTheSheetSays(
  from: HerReading,
  hers: HerDay,
  record: DayRecord | undefined,
): WhatTheSheetSays {
  if (daysBetween(from.today, hers.day) > 0) {
    const period = thePeriodADayWaitsFor(theCyclesAhead(from), hers.day);

    return {
      day: hers.day,
      kind: 'ahead',
      ...(period === undefined
        ? {}
        : { waitsFor: { mayStart: period.mayStart, order: period.order } }),
    };
  }

  const phase = thePhaseOn(from, hers.day);
  const logged = whatSheMarkedOn(record);

  return {
    day: hers.day,
    kind: 'lived',
    ...(hers.cycleDay === undefined ? {} : { cycleDay: hers.cycleDay }),
    ...(phase === undefined ? {} : { phase }),
    ...(logged === undefined ? {} : { logged }),
  };
}
