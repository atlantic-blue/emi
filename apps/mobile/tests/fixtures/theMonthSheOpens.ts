import type { DayRecord, ProfileRecord } from '@emi/crypto';
import { addDays, daysBetween } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, type PhaseName, colour, ringGeometry } from '@emi/tokens';
import { screen, within } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import {
  calendarMonthTestID,
  calendarScreenTestID,
  calendarTitleTestID,
} from '../../src/features/calendar/CalendarScreen';
import {
  cycleDayTestID,
  dateTestID,
  dayTestID,
  emptyCellTestID,
  weekCellTestIDs,
  weekTestID,
} from '../../src/features/calendar/CycleMonth';
import {
  daySheetLeadTestID,
  daySheetLineTestID,
  daySheetTestID,
} from '../../src/features/calendar/DaySheet';
import type { DayMark } from '../../src/features/cycle/herWeek';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { forecastOf } from '../../src/features/forecast/fromCache';
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
 * off a name the component wrote for itself. A fill, a ring and a dotted outline are three
 * different things to look at, and that is what the reader below distinguishes.
 */
export function theMarkOnTheSquare(day: string): DayMark {
  const style: ViewStyle = StyleSheet.flatten(screen.getByTestId(dayTestID(day)).props.style);

  if (style.backgroundColor === colour.period) {
    return 'bled';
  }
  if (style.borderStyle === 'dotted') {
    return 'forecast';
  }

  return style.borderColor === colour.primary ? 'today' : 'plain';
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
