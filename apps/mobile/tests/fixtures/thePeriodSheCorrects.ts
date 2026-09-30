import type { DayRecord, ProfileRecord } from '@emi/crypto';
import { addDays, cyclesFrom } from '@emi/cycle';
import { screen, within } from '@testing-library/react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { readDayLog } from '../../src/data/dayLogRepository';
import {
  editPeriodChangeTestID,
  editPeriodScreenTestID,
  editPeriodHeaderTestID,
  editPeriodBackTestID,
  editPeriodCancelTestID,
  editPeriodLeadTestID,
  editPeriodSaveTestID,
  periodRangePickerTestID,
} from '../../src/features/calendar/PeriodRangePicker';
import { chosenDayMarkTestID, dayTestID } from '../../src/features/calendar/CycleMonth';
import { calendarEditPeriodTestID } from '../../src/features/calendar/CalendarScreen';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { firstRunFlow } from '../../src/features/onboarding/firstRun';

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

/**
 * The period she corrects, and the phone she corrects it on. The scenario and the integration test
 * read both from here, so the two are held to one drawing and to one woman.
 *
 * What Emi holds and what she changes are read off the drawing of `editPeriod` rather than typed
 * beside it. The drawing says how many days Emi holds and which date they start on, and it ticks
 * the days she is left holding, so the days she adds are the difference between the two and a list
 * somebody typed would only agree with itself.
 */

/** The month she corrects the period in. The drawing writes no month, so it is stated here. */
export const theMonthSheCorrects = '2026-09-01';

/** How long each of her recorded cycles ran, which gives her two complete cycles and a forecast. */
export const herCycleRuns = 28;

const theLeadOfTheDrawing = /Emi holds (\d+) days, from the (\d+)/;
const anOptionOfTheDrawing = /<li class="opt([^"]*)">[^<>]*?(\d+)/g;

function theDayOf(date: number): string {
  return `${theMonthSheCorrects.slice(0, 8)}${String(date).padStart(2, '0')}`;
}

interface DrawnOption {
  readonly date: number;
  readonly ticked: boolean;
}

/** The days the drawing lists, each one saying whether she is holding it after her presses. */
function theOptionsOfTheDrawing(): DrawnOption[] {
  const markup = theMarkupOfTheMockup('editPeriod');
  const options: DrawnOption[] = [];

  anOptionOfTheDrawing.lastIndex = 0;

  for (
    let found = anOptionOfTheDrawing.exec(markup);
    found !== null;
    found = anOptionOfTheDrawing.exec(markup)
  ) {
    options.push({
      date: Number(found[2]),
      ticked: String(found[1]).split(/\s+/).includes('on'),
    });
  }

  if (options.length === 0) {
    throw new Error('the drawing of the period picker lists no day');
  }

  return options;
}

/** What the drawing says Emi holds: how many days her period runs, and the date it starts on. */
function whatTheDrawingSaysEmiHolds(): { readonly days: number; readonly from: number } {
  const found = theLeadOfTheDrawing.exec(theMarkupOfTheMockup('editPeriod'));

  if (found === null) {
    throw new Error('the drawing of the period picker does not say what Emi holds');
  }

  return { days: Number(found[1]), from: Number(found[2]) };
}

/** The period Emi holds before she corrects it, which is the period the drawing describes. */
export function theDaysEmiHolds(): string[] {
  const held = whatTheDrawingSaysEmiHolds();

  return Array.from({ length: held.days }, (_unused, offset) => theDayOf(held.from + offset));
}

/** The day after her period, which she recorded no flow on, and which is what closes a period. */
export function theDaySheStopped(): string {
  const held = theDaysEmiHolds();
  const last = held[held.length - 1];

  if (last === undefined) {
    throw new Error('the drawing of the period picker says Emi holds no day');
  }

  return addDays(last, 1);
}

/**
 * The days she adds, which are the days the drawing ticks and Emi does not hold. The first of them
 * is the day she recorded no flow on, so one save writes a day it already holds and a day it does
 * not.
 */
export function theDaysSheAdds(): string[] {
  const held = new Set(theDaysEmiHolds());

  return theOptionsOfTheDrawing()
    .filter((option) => option.ticked && !held.has(theDayOf(option.date)))
    .map((option) => theDayOf(option.date));
}

/**
 * How many days she takes off, which the drawing says by leaving one of the days Emi holds
 * unticked.
 */
export function howManyDaysSheTakesOff(): number {
  const ticked = new Set(
    theOptionsOfTheDrawing()
      .filter((option) => option.ticked)
      .map((option) => theDayOf(option.date)),
  );

  return theDaysEmiHolds().filter((day) => !ticked.has(day)).length;
}

/**
 * The day she takes off, which is the first day Emi holds.
 *
 * Bleeding within eight days of the day a cycle started continues the period that cycle already
 * has, and a recorded day with no bleeding ends it. So a day of none in the middle of a period ends
 * the period there and every bleeding day after it reaches no cycle at all: the cache would hold a
 * period of three days while the screen drew five ticks. Taking the first day off moves the day the
 * cycle started instead, which is the correction the length of every cycle around it depends on.
 */
export function theDaySheTakesOff(): string {
  const first = theDaysEmiHolds()[0];

  if (first === undefined) {
    throw new Error('the drawing of the period picker says Emi holds no day');
  }

  return first;
}

/** The period she is left holding: the days she added, and the days Emi held and she kept. */
export function theDaysSheIsLeftHolding(): string[] {
  const off = theDaySheTakesOff();

  return [...theDaysEmiHolds().filter((day) => day !== off), ...theDaysSheAdds()].sort();
}

/**
 * The day she opens Emi on, which is far enough past her period that every day of it is behind
 * her. A day ahead of today takes no press, so a period she could not finish correcting would be
 * the fixture's fault rather than the screen's.
 */
export function theDaySheOpensEmi(): string {
  const last = theDaysSheAdds()[theDaysSheAdds().length - 1];

  if (last === undefined) {
    throw new Error('the drawing of the period picker ticks no day Emi does not hold');
  }

  return addDays(last, 5);
}

/** Midday on that day, so the month and the ring read the same in any zone. */
export function whenSheOpensEmi(): Date {
  return new Date(`${theDaySheOpensEmi()}T12:00:00.000Z`);
}

/** Her three period starts: two complete cycles, and the one the drawing describes. */
export function herThreePeriodStarts(): string[] {
  const last = theDaysEmiHolds()[0];

  if (last === undefined) {
    throw new Error('the drawing of the period picker says Emi holds no day');
  }

  return [addDays(last, -2 * herCycleRuns), addDays(last, -herCycleRuns), last];
}

/**
 * Her days: each period as the drawing describes the last one, and the day after each on which she
 * recorded no flow, which is what closes a period and gives the cache a complete cycle.
 */
export function herRecordedDays(): DayRecord[] {
  const runs = theDaysEmiHolds().length;

  return herThreePeriodStarts().flatMap((start) =>
    Array.from({ length: runs + 1 }, (_unused, offset) => {
      const day = addDays(start, offset);

      return {
        day,
        flow: offset === runs ? ('none' as const) : firstRunFlow,
        recordedAt: `${day}T08:00:00.000Z`,
      };
    }),
  );
}

/** Her phone before she opens Emi: three recorded cycles, and the answers of the first run. */
export async function herPhoneHoldsAPeriodOfFourDays(firstRunFinishedAt: Date): Promise<void> {
  const profile: ProfileRecord = {
    kind: 'profile',
    cycleLengthDays: herCycleRuns,
    periodLengthDays: theDaysEmiHolds().length,
    recordedAt: firstRunFinishedAt.toISOString(),
  };

  await herPhoneHoldsTheseAnswers(firstRunFinishedAt, profile, herRecordedDays());
}

/** What her phone holds for one day: its revision and its identifier, or nothing at all. */
export interface HeldDay {
  readonly revision: number;
  readonly id: string;
}

export function whatHerPhoneHoldsOn(day: string): HeldDay | undefined {
  const row = readDayLog(herDatabase(), day);

  return row === undefined ? undefined : { id: row.id, revision: row.revision };
}

/** Every day her phone holds a record for, which is how a day outside the save is read as absent. */
export function theDaysHerPhoneHolds(): string[] {
  return recordedDays(herDatabase(), herVault().open).map((record) => record.day);
}

/** Her days as the ring reads them, so what the ring says is asked of the ring and not of a list. */
function herReading(): Parameters<typeof ringInputFor>[0] {
  const database = herDatabase();

  return {
    cycles: listCycles(database),
    records: recordedDays(database, herVault().open),
    today: theDaySheOpensEmi(),
    statedCycleLengthDays: herCycleRuns,
    statedPeriodLengthDays: theDaysEmiHolds().length,
  };
}

/** The day of her cycle the ring itself says she is on, read off her phone as it stands. */
export function theCycleDayHerPhoneSays(): number | undefined {
  return ringInputFor(herReading())?.day;
}

/** The day her next period may start on, read off the same forecast every screen reads. */
export function theDayHerNextPeriodMayStartOn(): string | undefined {
  return forecastOf(herReading().cycles, herCycleRuns).start?.from;
}

/** The day each cycle in the cache started, which is what a rebuild from the day log produces. */
export function theCycleStartsHerPhoneHolds(): string[] {
  return listCycles(herDatabase()).map((cycle) => cycle.startedOn);
}

/**
 * What each part of the drawing of the period picker is built under. The grid is named on the grid
 * itself, because the drawing lists the days as rows where the screen draws them as squares.
 */
export function theIdentifiersOfTheRangePicker(): PartIdentifiers {
  const alsoBuiltUnder = (part: string, ...identifiers: readonly string[]): readonly string[] => [
    ...(theIdentifiersOfAPart[part] ?? []),
    ...identifiers,
  ];

  return {
    ...theIdentifiersOfAPart,
    PeriodRangePicker: [periodRangePickerTestID],
    PrimaryButton: alsoBuiltUnder('PrimaryButton', editPeriodSaveTestID),
    Text: alsoBuiltUnder(
      'Text',
      editPeriodHeaderTestID,
      editPeriodLeadTestID,
      editPeriodChangeTestID,
    ),
    TextLink: alsoBuiltUnder('TextLink', editPeriodBackTestID, editPeriodCancelTestID),
  };
}

/** The parts of the drawing this step builds, which is every part it places. */
export function thePartsOfTheRangePickerDrawing(): Part[] {
  return thePartsOfTheMockup('editPeriod', theIdentifiersOfTheRangePicker());
}

/** Every identifier the period picker drew, in the order the screen drew them. */
export function whatTheRangePickerDrew(): string[] {
  return theIdentifiersDrawn();
}

/** Whether she is looking at the period picker at all. */
export function sheIsOnThePeriodPicker(): boolean {
  return screen.queryByTestId(editPeriodScreenTestID) !== null;
}

/** The days drawn as hers on the picker, which is the set she is holding at that moment. */
export function theDaysTickedOnThePicker(): string[] {
  return theDaysOfTheMonthDrawn().filter(theDayIsTicked);
}

function theDaysOfTheMonthDrawn(): string[] {
  return screen
    .queryAllByTestId(new RegExp(`^${dayTestID('')}\\d{4}-\\d{2}-\\d{2}$`))
    .map((square) => String(square.props.testID).slice(dayTestID('').length));
}

/** Whether one square carries the tick a day she is holding carries. */
export function theDayIsTicked(day: string): boolean {
  const square = screen.getByTestId(dayTestID(day));

  return within(square).queryAllByTestId(chosenDayMarkTestID).length > 0;
}

/** What somebody listening is told about one square, which is how a tick is read without colour. */
export interface SquareSpoken {
  readonly role: string;
  readonly checked: boolean | undefined;
  readonly disabled: boolean | undefined;
}

export function whatSomebodyListeningHearsOn(day: string): SquareSpoken {
  const square = screen.getByTestId(dayTestID(day));
  const state = (square.props.accessibilityState ?? {}) as {
    checked?: boolean;
    disabled?: boolean;
  };

  return {
    checked: state.checked,
    disabled: state.disabled,
    role: String(square.props.accessibilityRole),
  };
}

/** The line under the grid, which names what she changed before she saves it. */
export function theChangeLineSheReads(): string {
  return textIn(screen.getByTestId(editPeriodChangeTestID)).join(' ');
}

/** The line above the grid, which says what Emi holds and what to press. */
export function theLeadSheReads(): string {
  return textIn(screen.getByTestId(editPeriodLeadTestID)).join(' ');
}

/** The way into the period picker, which the drawing of the month places under the day sheet. */
export const theWayToEditHerPeriod = calendarEditPeriodTestID;

/** The days of one month her phone holds a record for, which is how an untouched day reads as absent. */
export function theDaysHerPhoneHoldsIn(month: string): string[] {
  return theDaysHerPhoneHolds()
    .filter((day) => day.slice(0, 7) === month.slice(0, 7))
    .sort();
}

/** The day each cycle starts on, as the arithmetic reads her day log, and not as the cache holds it. */
export function theCycleStartsHerDayLogGives(): string[] {
  return cyclesFrom(recordedDays(herDatabase(), herVault().open)).map((cycle) => cycle.startedOn);
}

/**
 * A cycle changed in the cache rather than rebuilt from her days. The table refuses it, so a save
 * that wrote the cache by hand would be stopped by the table and not only by a rule in the code.
 */
export function aCycleIsWrittenByHand(): void {
  herDatabase().run('UPDATE cycle SET length_days = 99 WHERE started_on = ?', [
    String(theCycleStartsHerPhoneHolds()[0]),
  ]);
}

/** How many days the cache says the period of one cycle ran, or nothing where it says none. */
export function thePeriodLengthHerPhoneHolds(startedOn: string): number | null | undefined {
  return listCycles(herDatabase()).find((cycle) => cycle.startedOn === startedOn)?.periodLengthDays;
}
