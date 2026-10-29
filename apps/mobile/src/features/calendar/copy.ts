import { words } from '../../language';
import { phaseName } from '../cycle/copy';
import { monthNames, ordinal } from '../forecast/copy';
import type { WhatSheChanged } from './savePeriod';
import { weekdayOf } from '../onboarding/days';
import type { PeriodItWaitsFor, WhatTheSheetSays } from './theDaySheet';

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
  openTheDay: words('calendar.daySheet.open'),
  recordSex: words('calendar.screen.recordSex'),
  removePeriodDay: words('calendar.screen.removePeriodDay'),
  today: words('calendar.today'),
} as const;

/** The words of the sheet that asks for her past periods over a month Emi cannot forecast. */
export const forecastPopupCopy = {
  eyebrow: words('calendar.forecastPopup.eyebrow'),
  title: words('calendar.forecastPopup.title'),
  line: words('calendar.forecastPopup.line'),
  action: words('calendar.forecastPopup.action'),
  notNow: words('calendar.forecastPopup.notNow'),
} as const;

/** The words of the legend above the grid, in the order the board places them, and the heart last. */
export const monthLegendCopy = {
  fertile: words('calendar.legend.fertile'),
  forecast: words('calendar.legend.forecast'),
  period: words('calendar.legend.period'),
  sex: words('calendar.legend.sex'),
} as const;

/** The two things the card at the foot says about the day she pressed. */
export interface DaySheetSaid {
  /** The date in words, which is how she knows which day she is reading. */
  readonly lead: string;
  /** One sentence: the forecast for a day ahead, or her cycle day, phase and record. */
  readonly line: string;
}

/** The card, in her own language. */
export function daySheetWords(says: WhatTheSheetSays): DaySheetSaid {
  return {
    lead: words('calendar.daySheet.day', undefined, {
      date: Number(says.day.slice(8, 10)),
      month: monthNameOf(says.day),
      weekday: weekdayOf(says.day),
    }),
    line: says.kind === 'ahead' ? theForecastSaid(says.waitsFor) : theLivedDaySaid(says),
  };
}

function monthNameOf(day: string): string {
  const name = monthNames[Number(day.slice(5, 7)) - 1];

  if (name === undefined) {
    throw new Error(`${day} names no month of the year`);
  }

  return name;
}

/**
 * When the period a day ahead of her waits for may start. The two ends are the range the forecast
 * names, so the card says the same days the forecast says.
 */
function theForecastSaid(waitsFor: PeriodItWaitsFor | undefined): string {
  if (waitsFor === undefined) {
    return words('calendar.daySheet.noForecast');
  }

  const { from, to } = waitsFor.mayStart;
  const sameMonth = {
    from: Number(from.slice(8, 10)),
    month: monthNameOf(to),
    to: Number(to.slice(8, 10)),
  };
  const spansMonths = {
    from: sameMonth.from,
    fromMonth: monthNameOf(from),
    to: sameMonth.to,
    toMonth: monthNameOf(to),
  };
  const inOneMonth = from.slice(0, 7) === to.slice(0, 7);

  if (waitsFor.order === 0) {
    return inOneMonth
      ? words('calendar.daySheet.nextPeriod.sameMonth', undefined, sameMonth)
      : words('calendar.daySheet.nextPeriod.spansMonths', undefined, spansMonths);
  }

  return inOneMonth
    ? words('calendar.daySheet.laterPeriod.sameMonth', undefined, sameMonth)
    : words('calendar.daySheet.laterPeriod.spansMonths', undefined, spansMonths);
}

/** Her cycle day and phase, and what she logged or that she logged nothing. */
function theLivedDaySaid(says: Extract<WhatTheSheetSays, { kind: 'lived' }>): string {
  const logged = says.logged ?? words('calendar.daySheet.nothingLogged');
  const cycle = theCycleSaid(says);

  return cycle === undefined
    ? logged
    : words('calendar.daySheet.andLogged', undefined, { logged, said: cycle });
}

/** Her cycle day and the phase, and nothing at all on a date no cycle of hers holds. */
function theCycleSaid(says: Extract<WhatTheSheetSays, { kind: 'lived' }>): string | undefined {
  if (says.cycleDay === undefined) {
    return undefined;
  }

  if (says.phase === undefined) {
    return words('cycle.ring.dayNumber', undefined, { day: says.cycleDay });
  }

  return words('calendar.daySheet.cycleDay', undefined, {
    day: says.cycleDay,
    phase: phaseName(says.phase).toLowerCase(),
  });
}

/** The words of the period picker. */
export const editPeriodCopy = {
  /** The marker on a day she has added to the period since the screen opened. */
  added: words('calendar.editPeriod.addedDay'),
  addAfter: words('calendar.editPeriod.addAfter'),
  addBefore: words('calendar.editPeriod.addBefore'),
  /** The marker on a day she has taken off it. */
  takenOff: words('calendar.editPeriod.takenOffDay'),
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

/** One row of the period list: "Monday the 15th". */
export function aPeriodRowSaid(day: string): string {
  return words('calendar.editPeriod.row', undefined, {
    date: ordinal(Number(day.slice(8, 10))),
    weekday: weekdayOf(day),
  });
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
