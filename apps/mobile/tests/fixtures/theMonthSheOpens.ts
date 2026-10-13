import type { DayRecord, ProfileRecord } from '@emi/crypto';
import {
  FERTILE_DAYS_AFTER_OVULATION,
  FERTILE_DAYS_BEFORE_OVULATION,
  addDays,
  daysBetween,
} from '@emi/cycle';
import { MINIMUM_TAP_TARGET, type PhaseName, colour, ringGeometry } from '@emi/tokens';
import { screen, within } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import {
  calendarMonthTestID,
  calendarPanelTestID,
  calendarScreenTestID,
  calendarTitleTestID,
} from '../../src/features/calendar/CalendarScreen';
import {
  cycleDayTestID,
  dateDiscTestID,
  dateTestID,
  dayTestID,
  emptyCellTestID,
  type LegendEntry,
  legendDotTestID,
  legendTestID,
  monthLegendTestID,
  weekCellTestIDs,
  weekTestID,
} from '../../src/features/calendar/CycleMonth';
import {
  daySheetLeadTestID,
  daySheetLineTestID,
  daySheetTestID,
} from '../../src/features/calendar/DaySheet';
import { type CycleAhead, theCyclesAhead } from '../../src/features/calendar/forecastAhead';
import type { DayMark } from '../../src/features/cycle/herWeek';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { addMonths } from '../../src/features/onboarding/days';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';

import { herDatabase, herPhoneHoldsTheseAnswers } from './herPhone';
import { herVault } from './herVault';
import { textIn } from './renderedText';
import {
  type Part,
  type PartIdentifiers,
  theIdentifiersDrawn,
  theIdentifiersOfAPart,
  theMarkupOfTheMockup,
  thePartsOfTheMockup,
} from './theMockupScreen';
import { type Box, theRow } from './theWidthOfARow';

/**
 * The month she opens: the drawing it is held to, and the phone it is read off. The scenario and
 * the integration test read both from here, so the two are held to one drawing and to one woman
 * rather than to two of each that happen to agree.
 *
 * Her days are worked out from the drawing rather than typed out beside it. The drawing writes the
 * day of her cycle over every date, so the day her last period started is the date it counts as
 * day one, the cycle before it is counted back from the number it gives its first square, and her
 * period runs for as many days as it fills. A woman built that way reproduces every number on the
 * drawing, and a list somebody typed would only agree with itself.
 */

/** The month the drawing shows. The drawing writes no year, so the year is stated here. */
export const theMonthSheOpens = '2026-09-01';

/**
 * What she said at her first run. Her recorded cycles run twenty days, which the drawing's own
 * numbers give, and a sealed answer of twenty is refused: Emi accepts an answer from twenty one to
 * forty five. So she answered with the length Emi offers first. The number reaches nothing the
 * month draws, because two complete cycles give her a forecast of her own.
 */
export const sheSaidHerCycleRuns = defaultCycleLengthDays;

const aCellOfTheMonth = /<div class="cell([^"]*)"[^>]*>([\s\S]*?)<\/div>/g;
const theDate = /<span class="n">([^<]*)<\/span>/;
const theCycleDay = /<span class="cd">([^<]*)<\/span>/;
const theTitle = /<span class="title">([^<]*)<\/span>/;
const theSheetLeadOfTheDrawing = /<span class="lead">([^<]*)<\/span>/;
const theSheetSubOfTheDrawing = /<span class="sub">([^<]*)<\/span>/;
const aDateInTheSentence = /(\d+)/;
const aCellThatOpensADay = /<div class="cell[^"]*"[^>]*data-to="day"[^>]*>([\s\S]*?)<\/div>/;
const aColumnHead = /<div class="heads">([\s\S]*?)<\/div>/;
const aHeadLetter = /<span>([^<]*)<\/span>/g;

function markOf(classes: string): DayMark {
  for (const mark of ['bled', 'today', 'forecast'] as const) {
    if (classes.split(/\s+/).includes(mark)) {
      return mark;
    }
  }

  return 'plain';
}

/** One box of the drawing's grid. A box the month has no day for carries no date and no cycle day. */
export interface DrawnSquare {
  readonly date: number | undefined;
  readonly cycleDay: number | undefined;
  readonly mark: DayMark;
}

/**
 * The boxes of the drawing's grid, in the order it places them. Everything a case holds the built
 * month to comes from here.
 *
 * The drawing opens its first week on the first of the month. The first of September 2026 is a
 * Tuesday, so which column a date sits in is the calendar's answer and never the drawing's, and
 * nothing below reads a column off it.
 */
export function theSquaresOfTheDrawing(): DrawnSquare[] {
  const markup = theMarkupOfTheMockup('calendar');
  const squares: DrawnSquare[] = [];

  aCellOfTheMonth.lastIndex = 0;

  for (
    let found = aCellOfTheMonth.exec(markup);
    found !== null;
    found = aCellOfTheMonth.exec(markup)
  ) {
    const inside = found[2] ?? '';
    const date = theDate.exec(inside);
    const cycleDay = theCycleDay.exec(inside);

    squares.push({
      cycleDay: cycleDay === null ? undefined : Number(cycleDay[1]),
      date: date === null ? undefined : Number(date[1]),
      mark: markOf(String(found[1])),
    });
  }

  if (squares.length === 0) {
    throw new Error('the drawing of the month carries no square');
  }

  return squares;
}

/** The dates the drawing writes, in its order, without the boxes it leaves empty. */
export function theDatesOfTheDrawing(): number[] {
  return theSquaresOfTheDrawing()
    .map((square) => square.date)
    .filter((date): date is number => date !== undefined);
}

/** The day of her cycle the drawing writes over each of those dates, in the same order. */
export function theCycleDaysOfTheDrawing(): number[] {
  return theSquaresOfTheDrawing()
    .filter((square) => square.date !== undefined)
    .map((square) => (square.cycleDay === undefined ? Number.NaN : square.cycleDay));
}

/** How many boxes the drawing leaves empty, because the week runs outside the month. */
export function theEmptyBoxesOfTheDrawing(): number {
  return theSquaresOfTheDrawing().filter((square) => square.date === undefined).length;
}

/** The month name the drawing writes in its header, which it writes in English. */
export function theMonthTheDrawingNames(): string {
  const found = theTitle.exec(theMarkupOfTheMockup('calendar'));

  if (found === null) {
    throw new Error('the drawing of the month carries no title');
  }

  return String(found[1]);
}

/** The letters the drawing heads its seven columns with. */
export function theColumnsOfTheDrawing(): string[] {
  const heads = aColumnHead.exec(theMarkupOfTheMockup('calendar'));

  if (heads === null) {
    throw new Error('the drawing of the month heads no columns');
  }

  return [...String(heads[1]).matchAll(aHeadLetter)].map((found) => String(found[1]));
}

function theDayOf(date: number): string {
  return `${theMonthSheOpens.slice(0, 8)}${String(date).padStart(2, '0')}`;
}

/** The one day the drawing draws in a state, as a day of the calendar. */
function theDayTheDrawingMarks(mark: DayMark): string {
  const marked = theSquaresOfTheDrawing().filter((square) => square.mark === mark);
  const date = marked[0]?.date;

  if (marked.length !== 1 || date === undefined) {
    throw new Error(`the drawing of the month draws ${marked.length} squares as ${mark}, not one`);
  }

  return theDayOf(date);
}

/** The square the drawing rings, which is the day she opens the month on. */
export function theDaySheOpensTheMonth(): string {
  return theDayTheDrawingMarks('today');
}

/**
 * A day of the drawn month she has not lived yet, two days ahead of the day she opens it on. The
 * drawing rings the eighteenth and the month runs to the thirtieth, so the day is inside it and
 * she can reach its square without leaving the month she is reading.
 */
export function theDayAheadSheCannotOpen(): string {
  return addDays(theDaySheOpensTheMonth(), 2);
}

/** Every day of the drawn month she has already lived, which is every day she may still open. */
export function theDaysBehindHer(): string[] {
  return theSquaresOfTheDrawing()
    .filter((square) => square.date !== undefined)
    .map((square) => theDayOf(Number(square.date)))
    .filter((day) => day <= theDaySheOpensTheMonth());
}

/** The square the drawing outlines, which is a day her next period is expected on. */
export function theDayTheDrawingOutlines(): string {
  return theDayTheDrawingMarks('forecast');
}

/** The dates the drawing fills, which are the days she recorded bleeding on. */
export function theDaysTheDrawingFills(): string[] {
  return theSquaresOfTheDrawing()
    .filter((square) => square.mark === 'bled' && square.date !== undefined)
    .map((square) => theDayOf(Number(square.date)));
}

/** How long her period runs, which is how many days the drawing fills. */
export function herPeriodRunsFor(): number {
  return theDaysTheDrawingFills().length;
}

/** The day her last period started, which is the date the drawing counts as day one. */
export function herLastPeriodStarted(): string {
  const square = theSquaresOfTheDrawing().find((each) => each.cycleDay === 1);

  if (square?.date === undefined) {
    throw new Error('the drawing of the month counts no day as the first of a cycle');
  }

  return theDayOf(square.date);
}

/**
 * The cycle before that one, counted back from the day of her cycle the drawing gives its first
 * date. The first of the month is day nineteen of a cycle, so that cycle began eighteen days
 * before it.
 */
export function herPeriodBeforeThat(): string {
  const first = theSquaresOfTheDrawing().find((each) => each.date !== undefined);

  if (first?.date === undefined || first.cycleDay === undefined) {
    throw new Error('the drawing of the month gives its first date no cycle day');
  }

  return addDays(theDayOf(first.date), -(first.cycleDay - 1));
}

/** How long each of her cycles ran, which the drawing's two cycle counts give. */
export function herCycleRuns(): number {
  return daysBetween(herPeriodBeforeThat(), herLastPeriodStarted());
}

/** Her three period starts, which is two complete cycles and the one she is standing in. */
export function herThreePeriodStarts(): string[] {
  const last = herLastPeriodStarted();
  const runs = herCycleRuns();

  return [addDays(last, -2 * runs), addDays(last, -runs), last];
}

/**
 * Her days: the days she bled, and the day after each period on which she recorded no flow, which
 * is what closes a period and gives the cache a complete cycle.
 */
export function daysOfHerThreeCycles(): DayRecord[] {
  return herThreePeriodStarts().flatMap((start) =>
    Array.from({ length: herPeriodRunsFor() + 1 }, (_unused, offset) => {
      const day = addDays(start, offset);
      const flow = offset === herPeriodRunsFor() ? 'none' : 'medium';

      return { day, flow, recordedAt: `${day}T08:00:00.000Z` } as const;
    }),
  );
}

/**
 * Her phone before she opens the month: three recorded cycles and the answers of the first run.
 *
 * A caller may hand it further days. The drawing's own sheet names a day she marked something on,
 * and a mark that carries no flow reaches no cycle, so the month draws what it drew without it.
 */
export async function herPhoneHoldsThreeRecordedCycles(
  firstRunFinishedAt: Date,
  andAlso: readonly DayRecord[] = [],
): Promise<void> {
  const profile: ProfileRecord = {
    kind: 'profile',
    cycleLengthDays: sheSaidHerCycleRuns,
    periodLengthDays: herPeriodRunsFor(),
    recordedAt: firstRunFinishedAt.toISOString(),
  };

  await herPhoneHoldsTheseAnswers(firstRunFinishedAt, profile, [
    ...daysOfHerThreeCycles(),
    ...andAlso,
  ]);
}

/**
 * Her phone as the ring read it on that date: the cycles that had already started by then, and her
 * days. The ring draws the cycle she is standing in, so asking it about a date two cycles back
 * means asking it what it drew on that date.
 */
function herReading(today: string): Parameters<typeof ringInputFor>[0] {
  const database = herDatabase();

  return {
    cycles: listCycles(database).filter((cycle) => cycle.startedOn <= today),
    records: recordedDays(database, herVault().open),
    today,
    statedCycleLengthDays: sheSaidHerCycleRuns,
    statedPeriodLengthDays: herPeriodRunsFor(),
  };
}

/**
 * The day the ring itself would say she is on, were she opening Emi on that date. The month is
 * held to this rather than to a number in a list, so a month that counted a day of its own would
 * be caught by the thing it is not allowed to disagree with.
 */
export function theDayTheRingSaysOn(day: string): number | undefined {
  return ringInputFor(herReading(day))?.day;
}

/**
 * The phase the ring itself would name on that date, read the same way. The sheet is held to this
 * rather than to a word in a list, so a sheet that named a phase of its own would be caught.
 */
export function thePhaseTheRingSaysOn(day: string): PhaseName | undefined {
  const input = ringInputFor(herReading(day));

  return input === undefined ? undefined : ringGeometry(input).phase;
}

/**
 * The range her next period may start on, read off the same forecast the screens read. Emi never
 * names one day for it, so the month is held to the range and never to a day in the middle of it.
 */
export function theRangeHerNextPeriodMayStartOn(): { readonly from: string; readonly to: string } {
  const range = forecastOf(herReading(theDaySheOpensTheMonth()).cycles, sheSaidHerCycleRuns).start;

  if (range === undefined) {
    throw new Error('her three cycles produced no range, so no day is expected');
  }

  return range;
}

/** The forecast cycles ahead of her on the day she opens the month, read off the app's own rule. */
export function theCyclesAheadOfHer(): CycleAhead[] {
  return theCyclesAhead(herReading(theDaySheOpensTheMonth()));
}

/**
 * The first day her next period may start on, which is where the cycle day starts again at 1. A
 * forecast never names one day (contract CYCLE-2), so the count starts at the front of the range.
 */
export function theDayHerNextPeriodIsForecastOn(): string {
  const next = theCyclesAheadOfHer()[0];

  if (next === undefined) {
    throw new Error('her three cycles produced no forecast period ahead of her');
  }

  return next.startsOn;
}

/**
 * Every day her next period may fall on, which the month draws in a dashed ring: from the first
 * day it may start to the last day it may still run.
 */
export function theDaysOfHerNextForecastPeriod(): string[] {
  const next = theCyclesAheadOfHer()[0];

  if (next === undefined) {
    throw new Error('her three cycles produced no forecast period ahead of her');
  }

  const lastDay = addDays(next.mayStart.to, next.periodDays - 1);

  return Array.from({ length: daysBetween(next.startsOn, lastDay) + 1 }, (_unused, index) =>
    addDays(next.startsOn, index),
  );
}

/**
 * The cycle day the drawing counts over each date, up to the day before her next forecast period,
 * and a count that starts again at 1 from that day. The drawing is older than issue 270 and counts
 * on past the end of the cycle, which is the fault the issue names.
 */
export function theCycleDaysAfterIssue270(): number[] {
  const restart = theDayHerNextPeriodIsForecastOn();

  return theDaysOfTheDrawnMonth().map((day, index) =>
    day < restart
      ? (theCycleDaysOfTheDrawing()[index] ?? Number.NaN)
      : daysBetween(restart, day) + 1,
  );
}

/**
 * What each part of the drawing of the month is built under. The shared record carries every part
 * whose identifier is a constant; a square is built under the day it draws, so the two squares the
 * drawing marks are joined here instead.
 *
 * The drawing names the grid on those two squares rather than on the grid itself, because the
 * reader drops a wrapper that repeats the name of the part inside it.
 */
export function theIdentifiersOfTheMonth(): PartIdentifiers {
  return {
    ...theIdentifiersOfAPart,
    CycleMonth: [dayTestID(theDaySheOpensTheMonth()), dayTestID(theDayTheDrawingOutlines())],
  };
}

/** The parts of the drawing this step builds: the header, the way back, the Today link, the grid. */
export function theHeaderAndTheMonthOfTheDrawing(): Part[] {
  const parts = thePartsOfTheMockup('calendar', theIdentifiersOfTheMonth());
  const sheet = parts.findIndex((part) => part.name === 'DaySheet');

  if (sheet < 1) {
    throw new Error('the drawing of the month places no day sheet, so nothing says where to stop');
  }

  return parts.slice(0, sheet);
}

/**
 * The parts of the drawing down to the sheet at the foot, which is what this step adds.
 *
 * The drawing places two sheet rows, and they are two states of one sheet rather than two rows on
 * one screen: one names a day she lived and one names a day that has not happened. So the walk
 * stops at the first of them.
 */
export function theMonthAndItsSheetOfTheDrawing(): Part[] {
  const parts = thePartsOfTheMockup('calendar', theIdentifiersOfTheMonth());
  const sheet = parts.findIndex((part) => part.name === 'DaySheet');

  if (sheet < 1) {
    throw new Error('the drawing of the month places no day sheet, so nothing says where to stop');
  }

  return parts.slice(0, sheet + 1);
}

/** Every part of that drawing, which is what the later steps of the feature build. */
export function everyPartOfTheDrawing(): Part[] {
  return thePartsOfTheMockup('calendar', theIdentifiersOfTheMonth());
}

/**
 * The day the drawing's own sheet names, as a day of the month it draws. The sheet leads with the
 * date in words, so the number in that sentence is the day she presses.
 */
export function theDayTheDrawingsSheetNames(): string {
  const said = theSheetLeadOfTheDrawing.exec(theMarkupOfTheMockup('calendar'));
  const date = said === null ? null : aDateInTheSentence.exec(String(said[1]));

  if (date === null) {
    throw new Error('the sheet of the drawing of the month names no day');
  }

  return theDayOf(Number(date[1]));
}

/** What the drawing's sheet says under that date, which is where it names a cycle day and a phase. */
export function theSheetLineOfTheDrawing(): string {
  const said = theSheetSubOfTheDrawing.exec(theMarkupOfTheMockup('calendar'));

  if (said === null) {
    throw new Error('the sheet of the drawing of the month says nothing under the date');
  }

  return String(said[1]);
}

/** The two things the sheet on the glass says, or nothing at all where no sheet is on it. */
export interface SheetSheReads {
  /** The date in words, which is the day she pressed. */
  readonly lead: string;
  /** The day of her cycle, the phase, and what she logged. Nothing where it drew no line. */
  readonly line: string | undefined;
}

export function theSheetSheReads(): SheetSheReads | undefined {
  if (screen.queryByTestId(daySheetTestID) === null) {
    return undefined;
  }

  const line = screen.queryByTestId(daySheetLineTestID);

  return {
    lead: saidUnder(daySheetLeadTestID),
    line: line === null ? undefined : textIn(line).join(''),
  };
}

/**
 * Everything the month screen drew, from itself downwards. The route tree wraps the screen in the
 * lock, which draws an identifier of its own above it.
 */
export function whatTheMonthScreenDrew(): string[] {
  const drawn = theIdentifiersDrawn();
  const at = drawn.indexOf(calendarScreenTestID);

  if (at < 0) {
    throw new Error('the month was not on the glass');
  }

  return drawn.slice(at);
}

/** What a square is drawn under, without the day itself, so a reader can match on it. */
const aSquareOfTheMonth = dayTestID('');

/** Every day the built month drew a square for, in the order it drew them. */
export function theSquaresTheMonthDrew(): string[] {
  return screen
    .queryAllByTestId(new RegExp(`^${aSquareOfTheMonth}`))
    .map((element) => String(element.props.testID).slice(aSquareOfTheMonth.length));
}

/** The dates the built month drew, in its order, which is the number she reads in each square. */
export function theDatesTheMonthDrew(): number[] {
  return theSquaresTheMonthDrew().map((day) => Number(day.slice(8, 10)));
}

/** Every square whose cycle day is not drawn above its date, named. */
export function theSquaresCountingTheirCycleDayBelowTheDate(): string[] {
  return theSquaresTheMonthDrew().filter((day) => !theCycleDayIsAboveTheDate(day));
}

/** How many boxes the built month leaves empty, because the week runs outside the month. */
export function theEmptyBoxesTheMonthDrew(): number {
  return screen.queryAllByTestId(emptyCellTestID).length;
}

function saidUnder(testID: string): string {
  return textIn(screen.getByTestId(testID)).join('');
}

/** The month name the built screen wrote in its header. */
export function theMonthSheReads(): string {
  return saidUnder(calendarTitleTestID);
}

/** The cycle day the built month drew over that date, or nothing where it drew none. */
export function theCycleDayOver(day: string): number | undefined {
  const drawn = screen.queryByTestId(cycleDayTestID(day));

  return drawn === null ? undefined : Number(textIn(drawn).join(''));
}

export function theDateDrawnFor(day: string): number {
  return Number(saidUnder(dateTestID(day)));
}

/**
 * Which of the four states the built month drew that date in, read off the drawn style rather than
 * off a name the component wrote for itself. A fill, a ring and a dashed outline are three
 * different things to look at, and that is what the reader below distinguishes.
 */
export function theMarkOnTheSquare(day: string): DayMark {
  const style: ViewStyle = StyleSheet.flatten(screen.getByTestId(dateDiscTestID(day)).props.style);

  if (style.backgroundColor === colour.period) {
    return 'bled';
  }
  if (style.borderStyle === 'dashed') {
    return 'forecast';
  }

  return style.borderColor === colour.accent ? 'today' : 'plain';
}

/** What the built month drew for every day of it: the date, the cycle day and the state. */
export function theMonthSheReadsBack(): DrawnSquare[] {
  return theSquaresTheMonthDrew().map((day) => ({
    cycleDay: theCycleDayOver(day),
    date: theDateDrawnFor(day),
    mark: theMarkOnTheSquare(day),
  }));
}

/**
 * Whether the day of her cycle is drawn above the date inside that square, read off the order the
 * square drew them in.
 */
export function theCycleDayIsAboveTheDate(day: string): boolean {
  const square = screen.getByTestId(dayTestID(day));
  const drawn = within(square)
    .queryAllByTestId(/.+/)
    .map((element) => String(element.props.testID));

  return drawn.indexOf(cycleDayTestID(day)) < drawn.indexOf(dateTestID(day));
}

/** What one square of the month tells her, beyond the numbers written inside it. */
export interface SquareSheSees {
  /** Whether it is drawn faint, which is how the month shows a day it will not open. */
  readonly dimmed: boolean;
  /** Whether it tells somebody listening that it takes no press. */
  readonly saidToTakeNoPress: boolean;
  /** What a screen reader reads out for it. */
  readonly spoken: string;
}

export function theSquareSheSees(day: string): SquareSheSees {
  const square = screen.getByTestId(dayTestID(day));
  const style: ViewStyle = StyleSheet.flatten(square.props.style);
  const state = square.props.accessibilityState as { disabled?: boolean } | undefined;

  return {
    dimmed: typeof style.opacity === 'number' && style.opacity < 1,
    saidToTakeNoPress: state?.disabled === true,
    spoken: String(square.props.accessibilityLabel ?? ''),
  };
}

/**
 * The squares of the month, refusing an empty month. A measurement of nothing reads exactly like a
 * measurement everything passed, so the two readers below are held to a month that drew something.
 */
function theSquaresToMeasure(): string[] {
  const drawn = theSquaresTheMonthDrew();

  if (drawn.length === 0) {
    throw new Error('a month that drew no square at all was measured');
  }

  return drawn;
}

/** Every square the built month drew shorter than a thumb needs, named with its height. */
export function theSquaresTooShortForAThumb(): string[] {
  return theSquaresToMeasure()
    .map((day) => {
      const style: ViewStyle = StyleSheet.flatten(screen.getByTestId(dayTestID(day)).props.style);

      return { day, height: style.minHeight ?? style.height ?? 0 };
    })
    .filter(({ height }) => typeof height !== 'number' || height < MINIMUM_TAP_TARGET)
    .map(({ day, height }) => `${day} is ${String(height)} high`);
}

/** Every square that takes a width of its own rather than the width its week gives it. */
export function theSquaresTakingAWidthOfTheirOwn(): string[] {
  return theSquaresToMeasure().filter((day) => {
    const style: ViewStyle = StyleSheet.flatten(screen.getByTestId(dayTestID(day)).props.style);

    return style.width !== undefined || style.minWidth !== undefined || (style.flex ?? 0) === 0;
  });
}

/**
 * The last week of the month, with the seven boxes that stand in it. The grid keeps a box for a day
 * the month has no room for, so every week holds seven of them whatever month it is.
 */
export function aWeekOfHerMonth(): { row: Box; cells: Box[] } {
  const month = screen.getByTestId(calendarMonthTestID);
  const last = within(month).getAllByTestId(weekTestID).at(-1);

  if (last === undefined) {
    throw new Error('the month drew no weeks, so there was no row to measure');
  }

  return {
    row: last as unknown as Box,
    cells: within(last).getAllByTestId(weekCellTestIDs) as unknown as Box[],
  };
}

/** Where the last square of a week ends, and the width the week had to give, on that phone. */
export function theWeekMeasuredOn(glassWidth: number): { rightEdge: number; width: number } {
  const { row, cells } = aWeekOfHerMonth();
  const measured = theRow(row, cells, glassWidth);

  return { rightEdge: measured.rightEdge, width: measured.width };
}

/**
 * The month before the one she opens, which is the month the drawing `calendarEarlier` shows, and
 * the month two behind it, which is where the walk of story 9 ends.
 */
export function theMonthBeforeSheOpens(): string {
  return addMonths(theMonthSheOpens, -1);
}

export function theMonthTwoBeforeSheOpens(): string {
  return addMonths(theMonthSheOpens, -2);
}

export function theMonthAfterSheOpens(): string {
  return addMonths(theMonthSheOpens, 1);
}

/** The month name the drawing of the month before writes in its header, in English. */
export function theMonthTheEarlierDrawingNames(): string {
  const found = theTitle.exec(theMarkupOfTheMockup('calendarEarlier'));

  if (found === null) {
    throw new Error('the drawing of the month before carries no title');
  }

  return String(found[1]);
}

/**
 * The square the drawing of the month before sends to a day, which is the day it has her open. It
 * is read off the drawing rather than typed here, so a stage that moves the day moves this with it.
 */
export function theDayTheEarlierDrawingOpens(): string {
  const cell = aCellThatOpensADay.exec(theMarkupOfTheMockup('calendarEarlier'));
  const date = cell === null ? null : theDate.exec(String(cell[1]));

  if (date === null) {
    throw new Error('the drawing of the month before sends no square to a day');
  }

  return `${theMonthBeforeSheOpens().slice(0, 8)}${String(date[1]).padStart(2, '0')}`;
}

/**
 * What each part of the drawing of the month before is built under. That drawing names the grid on
 * the one square it sends to a day, so the grid answers on the square for that day.
 */
export function theIdentifiersOfTheEarlierMonth(): PartIdentifiers {
  return { ...theIdentifiersOfAPart, CycleMonth: [dayTestID(theDayTheEarlierDrawingOpens())] };
}

/** The parts of the drawing of the month before, down to the sheet it puts at the foot. */
export function theEarlierMonthOfTheDrawing(): Part[] {
  return theEarlierDrawingDownTo(0);
}

/** Those parts and the sheet, which is what she reads once she has pressed a day of that month. */
export function theEarlierMonthAndItsSheetOfTheDrawing(): Part[] {
  return theEarlierDrawingDownTo(1);
}

/**
 * The drawing of the month before down to its sheet, with or without the sheet itself. Below the
 * sheet it draws a footer and a dock, which the month screen does not carry and the later steps of
 * the path do not add, so the comparison stops there the way it stops on the drawing of the month.
 */
function theEarlierDrawingDownTo(andTheSheet: 0 | 1): Part[] {
  const parts = thePartsOfTheMockup('calendarEarlier', theIdentifiersOfTheEarlierMonth());
  const sheet = parts.findIndex((part) => part.name === 'DaySheet');

  if (sheet < 1) {
    throw new Error(
      'the drawing of the month before places no day sheet, so nothing says where to stop',
    );
  }

  return parts.slice(0, sheet + andTheSheet);
}

/** The disc the date is drawn inside, as the style it was drawn with. */
export function theDiscAroundTheDate(day: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(dateDiscTestID(day)).props.style);
}

/**
 * The ground the disc of that date is drawn on, which is how the month says a phase. A day with no
 * phase to say draws no ground at all, and reads back as nothing rather than as a colour.
 */
export function thePhaseGroundOn(day: string): string | undefined {
  const style: ViewStyle = StyleSheet.flatten(screen.getByTestId(dateDiscTestID(day)).props.style);

  return typeof style.backgroundColor === 'string' ? style.backgroundColor : undefined;
}

/** The colour the date itself is written in, which is the ink the ground it sits on takes. */
export function theDateInkOn(day: string): string | undefined {
  const style = StyleSheet.flatten(screen.getByTestId(dateTestID(day)).props.style) as {
    color?: unknown;
  };

  return typeof style.color === 'string' ? style.color : undefined;
}

/** Every day of the drawn month, as a day of the calendar, in the order the drawing places them. */
export function theDaysOfTheDrawnMonth(): string[] {
  return theDatesOfTheDrawing().map(theDayOf);
}

/**
 * The days of the drawn month inside the fertile window her forecast names, read off the same
 * forecast every screen reads. The window is not the ovulation phase the ring draws, which is
 * narrower, so the month is held to the forecast and a month that tinted the phase is caught.
 */
export function theFertileDaysTheForecastNames(): string[] {
  const restart = theDayHerNextPeriodIsForecastOn();
  const forecast = forecastOf(herReading(theDaySheOpensTheMonth()).cycles, sheSaidHerCycleRuns);

  return theDaysOfTheDrawnMonth().filter((day) => {
    if (day >= restart && forecast.kind === 'forecast') {
      // Issue 270: the fertile window of the forecast cycle, counted the way the forecast counts
      // the one she is in: the luteal length back from the start after it, five days before that
      // and one after, never on a day the forecast period may fall on.
      const cycleDay = daysBetween(restart, day) + 1;
      const ovulationDay = Math.round(forecast.medianLengthDays) - forecast.lutealLengthDays + 1;

      return (
        cycleDay > theDaysOfHerNextForecastPeriod().length &&
        cycleDay >= ovulationDay - FERTILE_DAYS_BEFORE_OVULATION &&
        cycleDay <= ovulationDay + FERTILE_DAYS_AFTER_OVULATION
      );
    }

    const read = forecastOf(herReading(day).cycles, sheSaidHerCycleRuns);

    return (
      read.kind === 'forecast' && day >= read.fertileWindow.from && day <= read.fertileWindow.to
    );
  });
}

/**
 * The one day of the drawn month the forecast names as the estimated ovulation, read off the same
 * forecast every screen reads. Nothing at all where no cycle of hers held that month.
 */
export function theOvulationDayTheForecastNames(): string | undefined {
  return theDaysOfTheDrawnMonth().find((day) => {
    const forecast = forecastOf(herReading(day).cycles, sheSaidHerCycleRuns);

    return forecast.kind === 'forecast' && forecast.estimatedOvulation === day;
  });
}

/**
 * The ovulation day of the forecast cycle that starts with her next forecast period: the luteal
 * length counted back from the start after it, which is how the forecast counts the one she is in.
 */
export function theOvulationDayOfTheForecastCycle(): string {
  const forecast = forecastOf(herReading(theDaySheOpensTheMonth()).cycles, sheSaidHerCycleRuns);

  if (forecast.kind !== 'forecast') {
    throw new Error('her three cycles produced no forecast');
  }

  return addDays(
    theDayHerNextPeriodIsForecastOn(),
    Math.round(forecast.medianLengthDays) - forecast.lutealLengthDays,
  );
}

/** The three words of the legend above the grid, or nothing where the screen draws no legend. */
export interface LegendSheReads {
  readonly period: string;
  readonly forecast: string;
  readonly fertile: string;
}

export function theLegendSheReads(): LegendSheReads | undefined {
  if (screen.queryByTestId(monthLegendTestID) === null) {
    return undefined;
  }

  return {
    fertile: saidUnder(legendTestID('fertile')),
    forecast: saidUnder(legendTestID('forecast')),
    period: saidUnder(legendTestID('period')),
  };
}

/** How each mark of the legend is drawn: its fill, and the line around it. */
export interface LegendMark {
  readonly fill: string | undefined;
  readonly line: string | undefined;
  readonly lineStyle: string | undefined;
}

/** The mark of each entry of the legend, which is what ties a word to the days it describes. */
export function theLegendDots(): Readonly<Record<LegendEntry, LegendMark>> {
  const markOf = (of: LegendEntry): LegendMark => {
    const style: ViewStyle = StyleSheet.flatten(
      screen.getByTestId(legendDotTestID(of)).props.style,
    );
    const asText = (value: unknown): string | undefined =>
      typeof value === 'string' ? value : undefined;

    return {
      fill: asText(style.backgroundColor),
      line: asText(style.borderColor),
      lineStyle: asText(style.borderStyle),
    };
  };

  return { fertile: markOf('fertile'), forecast: markOf('forecast'), period: markOf('period') };
}

/** Whether the month put the panel at the foot on the glass. */
export function thePanelIsAtTheFoot(): boolean {
  return screen.queryByTestId(calendarPanelTestID) !== null;
}

/** What the panel at the foot holds, in the order it holds it. */
export function whatThePanelHolds(): string[] {
  const panel = screen.getByTestId(calendarPanelTestID);

  return within(panel)
    .queryAllByTestId(/.+/)
    .map((element) => String(element.props.testID));
}
