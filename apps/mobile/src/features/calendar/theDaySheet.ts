import type { DayRecord } from '@emi/crypto';
import type { PhaseName } from '@emi/tokens';

import type { HerDay, HerDaysFrom } from '../cycle/herWeek';
import { whatSheMarkedOn } from '../log/copy';
import { thePhaseOn } from './herMonthPhases';

/**
 * The day she pressed in the month, as the sheet at the foot reads it back.
 *
 * Nothing here counts a cycle day or decides a phase. The cycle day is the one the square already
 * draws over that date, handed straight on, and the phase is the one the ring would have drawn on
 * that day, so the sheet cannot disagree with either of the two things she reads it beside.
 */
/** Her days as the month and the sheet both read them, with the whole of each day she recorded. */
export interface HerReading extends HerDaysFrom {
  readonly records: readonly DayRecord[];
}

export interface WhatTheSheetSays {
  readonly day: string;
  /** The day of her cycle, or nothing at all where no cycle of hers holds that date. */
  readonly cycleDay?: number;
  /** The phase that date fell in, on the same terms. */
  readonly phase?: PhaseName;
  /** What she marked on it, in her own words, or nothing where she marked nothing. */
  readonly logged?: string;
}

export function whatTheSheetSays(
  from: HerReading,
  hers: HerDay,
  record: DayRecord | undefined,
): WhatTheSheetSays {
  const phase = thePhaseOn(from, hers.day);
  const logged = whatSheMarkedOn(record);

  return {
    day: hers.day,
    ...(hers.cycleDay === undefined ? {} : { cycleDay: hers.cycleDay }),
    ...(phase === undefined ? {} : { phase }),
    ...(logged === undefined ? {} : { logged }),
  };
}
