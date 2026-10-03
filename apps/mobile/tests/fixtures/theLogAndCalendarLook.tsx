import type { DayRecord, ProfileRecord } from '@emi/crypto';
import { addDays, symptomGroups } from '@emi/cycle';
import { tabTestID, washTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { join } from 'node:path';
import { StyleSheet, type ViewStyle } from 'react-native';

import { cycleRingTestID } from '../../src/components/CycleRing';
import {
  calendarBackTestID,
  calendarEditPeriodTestID,
  calendarEarlierTestID,
  calendarHeaderTestID,
  calendarLaterTestID,
  calendarTodayTestID,
} from '../../src/features/calendar/CalendarScreen';
import { dayTestID } from '../../src/features/calendar/CycleMonth';
import { dayParameter } from '../../src/features/calendar/askedMonth';
import { daySheetTestID } from '../../src/features/calendar/DaySheet';
import {
  type PeriodChange,
  editPeriodKeyEntryTestID,
  editPeriodScreenTestID,
  periodChanges,
} from '../../src/features/calendar/PeriodRangePicker';
import { tabs } from '../../src/features/chrome/tabs';
import { dayRefusedTestID } from '../../src/features/log/DayRefused';
import { flowPickerTestID } from '../../src/features/log/FlowPicker';
import {
  logFlowDoneTestID,
  logFlowSavedTestID,
  logFlowTestID,
  logFlowTitleTestID,
  logFlowWhenTestID,
} from '../../src/features/log/LogFlow';
import { opensOnParameter, theSymptoms } from '../../src/features/log/askedGroup';
import { unexpectedBleedingTestID } from '../../src/features/log/UnexpectedBleeding';
import { symptomGroupHeadingTestID, symptomGroupTestID } from '../../src/features/log/SymptomGroup';

import { herPhoneHoldsTheseAnswers } from './herPhone';
import { textIn } from './renderedText';
import {
  herPhoneHoldsThreeRecordedCycles,
  theDayTheDrawingsSheetNames,
  theDayTheEarlierDrawingOpens,
  theDaySheOpensTheMonth,
  theIdentifiersOfTheEarlierMonth,
  theIdentifiersOfTheMonth,
} from './theMonthSheOpens';
import {
  type Part,
  type PartIdentifiers,
  partsMissing,
  theIdentifiersDrawn,
  theIdentifiersOfAPart,
  thePartsOfTheMockup,
  thePartsOfTheMockupWithoutItsNotes,
} from './theMockupScreen';
import {
  herPhoneHoldsAPeriodOfFourDays,
  theDaySheOpensEmi,
  theDaySheTakesOff,
  theDaysSheAdds,
  theIdentifiersOfTheRangePicker,
  theMonthSheCorrects,
  whenSheOpensEmi,
} from './thePeriodSheCorrects';

/**
 * The screens she writes a day on and the screens she corrects one on, each held against the
 * drawing of it in the mockups stage.
 *
 * One file for all seven drawings, because the redesign reaches the log and the calendar at once
 * and a part named in one place is a part every screen that draws it is held to. Nothing here
 * decides what Emi counts or what a press writes: it puts her phone in one state, opens the
 * screen the drawing names, and reads what the screen drew.
 *
 * A drawing names a part by a component name and a built screen answers by a test identifier, so
 * the records below join the two. Three of them are the records the steps that built those screens
 * already wrote, read from their own fixtures rather than copied here.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/**
 * Every drawing this step holds a screen to, in the order she meets them.
 *
 * `log` and `logSymptoms` are one screen opened two ways, `day` and `dayRefused` are one address
 * answered two ways, and `calendar` and `calendarEarlier` are one screen read at two months.
 */
export const theLogAndCalendarDrawings = [
  'log',
  'logSymptoms',
  'day',
  'dayRefused',
  'calendar',
  'calendarEarlier',
  'editPeriod',
] as const;

export type LogOrCalendarDrawing = (typeof theLogAndCalendarDrawings)[number];

/** The week the log drawings are read on: her period started on the Monday, she runs 31 days. */
export const herPeriodStartedOn = '2026-09-14';
export const sheSaidHerCycleRuns = 31;
export const sheSaidHerPeriodRunsFor = 5;

/** The day she opens the log on, which is the fourth day of the period she is in. */
export const theDaySheOpensTheLog = addDays(herPeriodStartedOn, 3);

/** A day behind her, which is the day the drawing of a day she already lived is read on. */
export const theDaySheAlreadyLived = addDays(herPeriodStartedOn, 1);

/** A day ahead of her, which is the day Emi refuses and the day the refusal is read on. */
export const theDaySheCannotOpen = addDays(theDaySheOpensTheLog, 7);

/** How many complete cycles stand behind the one she is in, so the forecast is hers and settled. */
export const herCyclesBehindTheLog = 6;

/** The dock, as the four columns the drawings place under a screen she reaches by a tab. */
const theDock: readonly string[] = tabs.map((tab) => tabTestID(tab.name));

/** Every symptom group section, so a drawing naming the part matches whichever group is drawn. */
function theGroupSections(): string[] {
  return symptomGroups.map(symptomGroupTestID);
}

/** The heading of every group, which is what the drawing names above each set of chips. */
function theGroupHeadings(): string[] {
  return symptomGroups.map(symptomGroupHeadingTestID);
}

/**
 * What each part of the three log drawings is built under.
 *
 * The log draws the date she is writing, the heading over the flow, a group for each set of chips
 * and the line that says where the day is kept, so the four `Text` parts of a drawing are answered
 * by those in the order the screen draws them.
 */
function theIdentifiersOfTheLog(): PartIdentifiers {
  return {
    ...theIdentifiersOfAPart,
    BottomNavigation: theDock,
    CycleRing: [cycleRingTestID],
    FlowPicker: [flowPickerTestID],
    PrimaryButton: [logFlowDoneTestID],
    SymptomGroup: theGroupSections(),
    Text: [logFlowWhenTestID, logFlowTitleTestID, logFlowSavedTestID, ...theGroupHeadings()],
    UnexpectedBleeding: [unexpectedBleedingTestID],
  };
}

/**
 * What each part of the two month drawings is built under.
 *
 * The step that built the month wrote the record for everything down to the sheet at its foot, so
 * that record is read rather than copied, and the two parts below it are added here: the way to
 * her whole period, and the dock the drawing places under the screen.
 */
function theIdentifiersOfTheMonthAndItsFoot(month: PartIdentifiers): PartIdentifiers {
  return {
    ...month,
    BottomNavigation: theDock,
    SecondaryButton: [calendarEditPeriodTestID],
  };
}

/** What each part of the drawing of a day Emi refuses is built under, from the step that built it. */
function theIdentifiersOfTheRefusal(): PartIdentifiers {
  return theIdentifiersOfAPart;
}

/** Every part the drawing of that name places, in its order, each one carrying what builds it. */
export function whatTheDrawingAsksFor(drawing: LogOrCalendarDrawing): Part[] {
  switch (drawing) {
    case 'log':
      return thePartsOfTheMockup('log', theIdentifiersOfTheLog());
    case 'logSymptoms':
      return thePartsOfTheMockup('logSymptoms', theIdentifiersOfTheLog());
    case 'day':
      return thePartsOfTheMockupWithoutItsNotes('day', theIdentifiersOfTheLog());
    case 'dayRefused':
      return thePartsOfTheMockupWithoutItsNotes('dayRefused', theIdentifiersOfTheRefusal());
    case 'calendar':
      return thePartsOfTheMockup(
        'calendar',
        theIdentifiersOfTheMonthAndItsFoot(theIdentifiersOfTheMonth()),
      );
    case 'calendarEarlier':
      return thePartsOfTheMockup(
        'calendarEarlier',
        theIdentifiersOfTheMonthAndItsFoot(theIdentifiersOfTheEarlierMonth()),
      );
    default:
      return thePartsOfTheMockup('editPeriod', theIdentifiersOfTheRangePicker());
  }
}

/** What the rendered screen does not answer for, given the drawing of that name. */
export function whatTheLogOrCalendarDoesNotAnswerFor(drawing: LogOrCalendarDrawing): string[] {
  return partsMissing(whatTheDrawingAsksFor(drawing), theIdentifiersDrawn());
}

/** Every part of every drawing in this set, counted, so a shrinking comparison is visible. */
export function howManyPartsAreHeldTo(): number {
  return theLogAndCalendarDrawings.reduce(
    (held, drawing) => held + whatTheDrawingAsksFor(drawing).length,
    0,
  );
}

/** A part a drawing places that the screen answering it does not draw, and why it does not. */
export interface ADifference {
  readonly drawing: LogOrCalendarDrawing;
  /** What the drawing calls the part. */
  readonly part: string;
  /** How many of that part the comparison leaves unanswered on that screen. */
  readonly howMany: number;
  readonly because: string;
}

/**
 * Where a screen does not answer a part its drawing places, and why.
 *
 * Each one is a part nothing builds today rather than a part somebody moved, so adding it is a
 * feature and not a redesign. It is written out here rather than left out of the comparison,
 * because a comparison that quietly skipped a part would read exactly like a comparison the screen
 * answered.
 */
export const theDifferencesThisStepKeeps: readonly ADifference[] = [
  {
    because:
      'the drawing of the log opened on the symptoms is a pushed screen with a way back and a Done beside its title, and the log is a tab she reaches by the dock, so there is no pushed header to put either on',
    drawing: 'logSymptoms',
    howMany: 2,
    part: 'TextLink',
  },
  {
    because:
      'the search over every symptom is built in the sheet, and nothing opens that sheet today, which the drawing itself records as a defect',
    drawing: 'logSymptoms',
    howMany: 1,
    part: 'LogSheet',
  },
  {
    because:
      'the drawing of the month places a second sheet row for a day that has not happened, and the two rows are two states of one sheet rather than two rows on one screen',
    drawing: 'calendar',
    howMany: 1,
    part: 'DaySheet',
  },
  {
    because:
      'the two ways to another month stand either side of the month name, because the row they are in is held to the width of an iPhone 16 and the title is the box that gives way',
    drawing: 'calendar',
    howMany: 2,
    part: 'TextLink',
  },
  {
    because:
      'the month is a screen pushed over the tabs, so the dock does not reach it, and giving it one would change where she can go from it',
    drawing: 'calendar',
    howMany: 4,
    part: 'BottomNavigation',
  },
  {
    because:
      'the two ways to another month stand either side of the month name, because the row they are in is held to the width of an iPhone 16 and the title is the box that gives way',
    drawing: 'calendarEarlier',
    howMany: 2,
    part: 'TextLink',
  },
  {
    because:
      'the month is a screen pushed over the tabs, so the dock does not reach it, and giving it one would change where she can go from it',
    drawing: 'calendarEarlier',
    howMany: 4,
    part: 'BottomNavigation',
  },
];

/** How many parts of one drawing this step records as unanswered, and nothing where it records none. */
export function howManyDifferencesAreKeptFor(drawing: LogOrCalendarDrawing): number {
  return theDifferencesThisStepKeeps
    .filter((kept) => kept.drawing === drawing)
    .reduce((held, kept) => held + kept.howMany, 0);
}

/** The three answers of her first run, which every state of the log is read against. */
function herProfile(firstRunFinishedAt: Date): ProfileRecord {
  return {
    kind: 'profile',
    cycleLengthDays: sheSaidHerCycleRuns,
    periodLengthDays: sheSaidHerPeriodRunsFor,
    recordedAt: firstRunFinishedAt.toISOString(),
  };
}

/** A day she bled, at the middle value, which is the value her first run writes for her too. */
function aBleedingDay(day: string): DayRecord {
  return { day, flow: 'medium', recordedAt: `${day}T08:00:00.000Z` };
}

/** The periods behind the one she is in, each one four days long, oldest first. */
function herCyclesBefore(): DayRecord[] {
  const days: DayRecord[] = [];

  for (let back = herCyclesBehindTheLog; back >= 1; back -= 1) {
    const started = addDays(herPeriodStartedOn, -back * sheSaidHerCycleRuns);

    for (let day = 0; day < 4; day += 1) {
      days.push(aBleedingDay(addDays(started, day)));
    }
  }

  return days;
}

/** Her six cycles, and the four days of the period she is in, today being the fourth. */
export function herDaysBehindTheLog(): DayRecord[] {
  return [
    ...herCyclesBefore(),
    ...Array.from({ length: 4 }, (_unused, index) =>
      aBleedingDay(addDays(herPeriodStartedOn, index)),
    ),
  ];
}

/** The day each drawing is read on, which is the day her clock says while she reads it. */
export function theDaySheReads(drawing: LogOrCalendarDrawing): string {
  switch (drawing) {
    case 'calendar':
    case 'calendarEarlier':
      return theDaySheOpensTheMonth();
    case 'editPeriod':
      return theDaySheOpensEmi();
    default:
      return theDaySheOpensTheLog;
  }
}

/** Midday on the day of that drawing, well away from any change of the clocks. */
export function whenSheReads(drawing: LogOrCalendarDrawing): Date {
  if (drawing === 'editPeriod') {
    return whenSheOpensEmi();
  }

  return new Date(`${theDaySheReads(drawing)}T12:00:00.000Z`);
}

/** The address each drawing is opened at, which is the address she would type herself. */
function theAddressOf(drawing: LogOrCalendarDrawing): string {
  switch (drawing) {
    case 'log':
      return '/log';
    case 'logSymptoms':
      return `/log?${opensOnParameter}=${theSymptoms}`;
    case 'day':
      return `/day/${theDaySheAlreadyLived}`;
    case 'dayRefused':
      return `/day/${theDaySheCannotOpen}`;
    case 'editPeriod':
      return `/calendar/period?${dayParameter}=${theMonthSheCorrects}`;
    default:
      return '/calendar';
  }
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/**
 * The last screen she was looking at, kept so the next one can take it off the glass first.
 *
 * Two navigators mounted at once both answer a press, and the one that answers is not the one she
 * is looking at: a press for another month then reaches a navigator that has no month in it and
 * the whole walk stops. So one screen is closed before the next is opened.
 */
let theScreenSheWasOn: { readonly unmount: () => void | Promise<void> } | null = null;

/**
 * The screen she is looking at, opened through its own address, so the dock a drawing places under
 * a tab screen is on the glass with it.
 *
 * Three of the seven need a press before the drawing's own state is on the screen: the sheet of a
 * month names the day she pressed, and the markers of the period picker name the days she changed
 * since it opened. The press is hers either way, so the state is reached rather than passed in.
 */
export async function sheIsLookingAtTheLogOrCalendar(drawing: LogOrCalendarDrawing): Promise<void> {
  const opened = whenSheReads(drawing);

  if (theScreenSheWasOn !== null) {
    await theScreenSheWasOn.unmount();
    theScreenSheWasOn = null;
  }

  if (drawing === 'calendar' || drawing === 'calendarEarlier') {
    await herPhoneHoldsThreeRecordedCycles(opened);
  } else if (drawing === 'editPeriod') {
    await herPhoneHoldsAPeriodOfFourDays(opened);
  } else {
    await herPhoneHoldsTheseAnswers(opened, herProfile(opened), herDaysBehindTheLog());
  }

  theScreenSheWasOn = await renderRouter(appDirectory, { initialUrl: theAddressOf(drawing) });

  if (drawing === 'calendar') {
    await shePresses(dayTestID(theDayTheDrawingsSheetNames()));
  }

  if (drawing === 'calendarEarlier') {
    await shePresses(calendarEarlierTestID);
    await shePresses(dayTestID(theDayTheEarlierDrawingOpens()));
  }

  if (drawing === 'editPeriod') {
    for (const day of theDaysSheAdds()) {
      await shePresses(dayTestID(day));
    }

    await shePresses(dayTestID(theDaySheTakesOff()));
  }
}

/** Whether the wash is drawn at the top of the screen she is looking at. */
export function theWashIsAtTheTopOfTheLogOrCalendar(): boolean {
  return screen.queryByTestId(washTestID) !== null;
}

/** The style one part was drawn with, as one object. */
export function theStyleOf(testID: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle;
}

/** The screen each drawing is drawn by, which is where a reading of its order starts. */
export function theScreenOf(drawing: LogOrCalendarDrawing): string {
  switch (drawing) {
    case 'dayRefused':
      return dayRefusedTestID;
    case 'calendar':
    case 'calendarEarlier':
      return calendarHeaderTestID;
    case 'editPeriod':
      return editPeriodScreenTestID;
    default:
      return logFlowTestID;
  }
}

/**
 * Where the screen drew one part, counted from the screen itself downwards.
 *
 * A part the screen never drew is refused rather than answered with nothing. Nothing reads as
 * before everything, so a comparison of two places would pass for a part that is not on the glass
 * at all.
 */
export function whereTheLogOrCalendarDrew(testID: string, from: string = logFlowTestID): number {
  const drawn = theIdentifiersDrawn();
  const screenAt = drawn.indexOf(from);

  if (screenAt < 0) {
    throw new Error(`${from} was not on the glass`);
  }

  const at = drawn.indexOf(testID, screenAt);

  if (at < 0) {
    throw new Error(`the screen drew nothing under ${testID}, so it has no place on it`);
  }

  return at;
}

/** The two kinds of change the key names, where she has made that kind of change. */
export function theChangeKeyNames(): PeriodChange[] {
  return periodChanges.filter(
    (change) => screen.queryByTestId(editPeriodKeyEntryTestID(change)) !== null,
  ) as PeriodChange[];
}

/** The words one entry of that key puts on the glass, which is what she reads beside its cue. */
export function theWordsOfTheKeyEntry(change: PeriodChange): string {
  return textIn(screen.getByTestId(editPeriodKeyEntryTestID(change)))
    .join(' ')
    .trim();
}

/** The parts of the month she reads, so a case can read the panel at its foot in order. */
export const theWaysOffTheMonth = {
  back: calendarBackTestID,
  editPeriod: calendarEditPeriodTestID,
  later: calendarLaterTestID,
  sheet: daySheetTestID,
  today: calendarTodayTestID,
} as const;
