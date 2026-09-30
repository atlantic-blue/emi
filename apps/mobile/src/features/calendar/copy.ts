import { phaseLabel } from '@emi/tokens';

import { words } from '../../language';
import { monthNames, ordinal } from '../forecast/copy';
import type { WhatTheSheetSays } from './theDaySheet';

/**
 * The words of the month she opens. The title itself is the month name from the calendar words
 * every screen that carries a date already reads, so a month is named here the way the first run
 * names it.
 */
export const calendarCopy = {
  back: words('calendar.screen.back'),
  today: words('calendar.today'),
} as const;

/** The two things the sheet at the foot says about the day she pressed. */
export interface DaySheetSaid {
  /** The date in words, which is how she knows which day she is reading. */
  readonly lead: string;
  /** Her cycle day, the phase, and what she marked. Nothing where it knows none of the three. */
  readonly line?: string;
}

/**
 * The sheet, in her own language. The date is written the way the forecast writes one, so the two
 * sentences she meets a date in are the same sentence.
 */
export function daySheetWords(says: WhatTheSheetSays): DaySheetSaid {
  const line = theLine(theCycleSaid(says), says.logged);

  return {
    lead: words('calendar.daySheet.day', undefined, {
      date: ordinal(Number(says.day.slice(8, 10))),
      month: monthNameOf(says.day),
    }),
    ...(line === undefined ? {} : { line }),
  };
}

function monthNameOf(day: string): string {
  const name = monthNames[Number(day.slice(5, 7)) - 1];

  if (name === undefined) {
    throw new Error(`${day} names no month of the year`);
  }

  return name;
}

/** Her cycle day and the phase, and nothing at all on a date no cycle of hers holds. */
function theCycleSaid(says: WhatTheSheetSays): string | undefined {
  if (says.cycleDay === undefined) {
    return undefined;
  }

  if (says.phase === undefined) {
    return words('cycle.phaseLine.day', undefined, { day: says.cycleDay });
  }

  return words('calendar.daySheet.cycleDay', undefined, {
    day: says.cycleDay,
    phase: phaseLabel[says.phase].toLowerCase(),
  });
}

function theLine(cycle: string | undefined, logged: string | undefined): string | undefined {
  if (cycle === undefined) {
    return logged;
  }
  if (logged === undefined) {
    return cycle;
  }

  return words('calendar.daySheet.andLogged', undefined, { logged, said: cycle });
}
