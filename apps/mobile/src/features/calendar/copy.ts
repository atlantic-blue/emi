import { phaseLabel } from '@emi/tokens';

import { words } from '../../language';
import { monthNames, ordinal } from '../forecast/copy';
import type { WhatSheChanged } from './savePeriod';
import type { WhatTheSheetSays } from './theDaySheet';

/**
 * The words of the month she opens. The title itself is the month name from the calendar words
 * every screen that carries a date already reads, so a month is named here the way the first run
 * names it.
 */
export const calendarCopy = {
  back: words('calendar.screen.back'),
  earlier: words('calendar.screen.earlier'),
  editPeriod: words('calendar.screen.editPeriod'),
  earlierMonth: words('calendar.screen.earlierMonth'),
  later: words('calendar.screen.later'),
  laterMonth: words('calendar.screen.laterMonth'),
  today: words('calendar.today'),
} as const;

/**
 * The two words of the legend above the grid. The grid is drawn by three screens and only the month
 * carries phases, so the legend is the one place these two words are read.
 */
export const monthLegendCopy = {
  fertile: words('calendar.legend.fertile'),
  period: words('calendar.legend.period'),
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

/** The words of the period picker. */
export const editPeriodCopy = {
  back: words('calendar.editPeriod.back'),
  cancel: words('calendar.editPeriod.cancel'),
  noDayLeft: words('calendar.editPeriod.noDayLeft'),
  save: words('calendar.editPeriod.save'),
  title: words('calendar.editPeriod.title'),
} as const;

/**
 * What she has marked, said above the grid, so she knows which period she is about to correct and
 * how much of it is already down.
 */
export function whatEmiHoldsSaid(held: readonly string[]): string {
  const first = held[0];

  if (first === undefined) {
    return words('calendar.editPeriod.leadWithNoDay');
  }

  return words('calendar.editPeriod.lead', held.length, { date: aDaySaid(first) });
}

/**
 * What she changed, said under the grid. It is worked out from the difference between what Emi held
 * and what she is holding, so the line cannot name a day she did not press.
 */
export function whatSheChangedSaid(changed: WhatSheChanged): string {
  const added =
    changed.added.length === 0
      ? undefined
      : words('calendar.editPeriod.added', undefined, { days: theDaysSaid(changed.added) });
  const removed =
    changed.removed.length === 0
      ? undefined
      : words('calendar.editPeriod.removed', undefined, { days: theDaysSaid(changed.removed) });

  if (added === undefined) {
    return removed ?? words('calendar.editPeriod.nothingChanged');
  }

  return removed === undefined
    ? added
    : words('calendar.editPeriod.bothChanges', undefined, { added, removed });
}

/** One day of the month, as she reads a date: the 19th in English, el 19 in Spanish. */
function aDaySaid(day: string): string {
  return words('calendar.editPeriod.aDay', undefined, {
    date: ordinal(Number(day.slice(8, 10))),
  });
}

/**
 * A list of days as one phrase. A comma separates a list in all three languages Emi is written in,
 * so the only part the catalogue holds is the word before the last of them, and it is the one the
 * day she logged already reads.
 */
function theDaysSaid(days: readonly string[]): string {
  const said = days.map(aDaySaid);
  const last = said[said.length - 1];
  const before = said.slice(0, -1).join(', ');

  if (last === undefined) {
    throw new Error('a list of no day was written as a phrase');
  }

  return before.length === 0
    ? last
    : words('home.loggedToday.andTheLast', undefined, { last, said: before });
}
