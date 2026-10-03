import type { ProfileRecord } from '@emi/crypto';
import { tabTestID, washTestID } from '@emi/ui';
import { screen, waitFor } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen as routedScreen } from 'expo-router/testing-library';
import { join } from 'node:path';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { tabs } from '../../src/features/chrome/tabs';
import {
  exportActionTestID,
  exportBackTestID,
  exportHeaderTestID,
  exportHeldTestID,
  exportLockLineTestID,
  exportScreenTestID,
  exportShareTestID,
  exportTileTestID,
  exportWhatTestID,
  theExportTiles,
} from '../../src/features/export/ExportScreen';
import {
  answerBackTestID,
  answerCancelTestID,
  answerHeaderTestID,
  answerLinesTestID,
  answerQuestionTestID,
  answerSaveTestID,
  answerScreenTestID,
} from '../../src/features/settings/AnswerScreen';
import { changeCycleLengthStepperTestID } from '../../src/features/settings/ChangeCycleLength';
import {
  deleteActionTestID,
  deleteBackTestID,
  deleteGoesTestID,
  deleteLineTestID,
  deleteScreenTestID,
  deleteTitleTestID,
} from '../../src/features/settings/DeleteEverything';
import {
  settingsAnswersTestID,
  settingsDeleteTestID,
  settingsExportTestID,
  settingsRowTestID,
  settingsRows,
  settingsScreenTestID,
  settingsTitleTestID,
} from '../../src/features/settings/SettingsScreen';
import {
  yourAnswersBackTestID,
  yourAnswersHeaderTestID,
  yourAnswersScreenTestID,
  yourAnswerRowTestID,
} from '../../src/features/settings/YourAnswers';
import { yourAnswerRows } from '../../src/features/settings/herAnswers';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoFileSystem } from './expoFileSystem';
import { resetExpoSecureStore } from './expoSecureStore';
import { resetExpoSharing } from './expoSharing';
import { aBleedingDay, herPhoneHoldsTheseAnswers } from './herPhone';
import {
  type Part,
  partsMissing,
  theIdentifiersDrawn,
  thePartsOfTheMockup,
  thePartsOfTheMockupWithoutItsNotes,
} from './theMockupScreen';

/**
 * The five screens that carry the privacy promise, each held against the drawing of it in the
 * mockups stage.
 *
 * One file for all five, because the redesign reaches the whole of Privacy at once and a part named
 * in one place is a part every screen that draws it is held to. Nothing here decides what Emi
 * holds, what a press writes or where a press leads: it puts her phone in one state, opens the
 * screen the drawing names at its own address, and reads what the screen drew.
 *
 * A drawing names a part by a component name and a built screen answers by a test identifier, so
 * the records below join the two. The record is a list in the drawing's own order rather than one
 * keyed by the part name, because a drawing names `Text` three times over and each one is a
 * different thing on the glass.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Every drawing this step holds a screen to, in the order she meets them. */
export const thePrivacyDrawings = [
  'privacyNext',
  'yourAnswers',
  'answerCycleLength',
  'export',
  'delete',
] as const;

export type PrivacyDrawing = (typeof thePrivacyDrawings)[number];

/**
 * The earlier design of route `/settings`, which nothing is held to. The stage holds two drawings
 * of that route, and the built screen answers the later one.
 */
export const theSecondDesignOfTheRoute = 'settings';

/**
 * The reminder. It is a feature of its own, so no screen, no route and no store exist for it, and
 * the drawing stays the record of where it goes.
 */
export const theDrawingNothingIsBuiltFor = 'reminderSettings';

/** Midday, and away from any change of the clocks, so her calendar reads the same anywhere. */
export const whenSheOpensPrivacy = new Date('2026-05-14T12:00:00.000Z');

/** The eight answers her first run sealed, so every row of her answers reads one back. */
export const herAnswers: ProfileRecord = {
  kind: 'profile',
  name: 'Maria',
  birthYear: 1990,
  cycleLengthDays: 28,
  periodLengthDays: 5,
  regularity: 'moves',
  feeling: 'understand',
  goals: ['forecast', 'symptoms', 'doctorRecord'],
  focus: ['sleep', 'mood', 'pain'],
  recordedAt: whenSheOpensPrivacy.toISOString(),
};

/** Three days she bled, so the export has something to count and Privacy stands on real data. */
const herDays = ['2026-05-09', '2026-05-10', '2026-05-11'].map(aBleedingDay);

/** Where the dock draws each of its four columns, in the order the drawings place them. */
const theDock: readonly string[] = tabs.map((tab) => tabTestID(tab.name));

/** What every share identifier begins with, taken from one of them rather than written out here. */
const theSharePrefix = exportShareTestID('');

/**
 * One part of a drawing, and what answers for it on the glass.
 *
 * A part carrying a reason is a part this step does not build, and it is left out of the
 * comparison rather than failing it. The reason is on the record so a gap cannot grow quietly.
 */
export interface PartOfADrawing {
  readonly name: string;
  readonly builtUnder: readonly string[];
  /** Nothing at all where this step builds the part. */
  readonly ownedBy?: string;
}

/** The dock, as the four columns the drawing of a tab screen places under it. */
function theDockOfATabScreen(): PartOfADrawing[] {
  return theDock.map((column) => ({ name: 'BottomNavigation', builtUnder: [column] }));
}

/** The ways to hand a file over that the screen drew, which is one for each file it wrote. */
function theSharesOnTheGlass(): string[] {
  return theIdentifiersDrawn().filter((identifier) => identifier.startsWith(theSharePrefix));
}

/** What each part of the drawing of Privacy is built under, in the drawing's order. */
function theDrawingOfPrivacy(): PartOfADrawing[] {
  return [
    { name: 'Text', builtUnder: [settingsTitleTestID] },
    { name: 'AnswerRow', builtUnder: [settingsAnswersTestID] },
    {
      name: 'AnswerRow',
      builtUnder: [],
      ownedBy:
        'the reminder, which is a feature of its own with no route and no store yet, and the row step 17.2 already names as the one it leaves out',
    },
    { name: 'AnswerRow', builtUnder: [settingsExportTestID] },
    { name: 'AnswerRow', builtUnder: [settingsDeleteTestID] },
    {
      name: 'Text',
      builtUnder: [],
      ownedBy:
        'the line under the rows, which is a sentence no step approved as copy and which step 17.2 already leaves to the stage',
    },
    ...theDockOfATabScreen(),
  ];
}

/** What each part of the drawing of her answers is built under, in the drawing's order. */
function theDrawingOfHerAnswers(): PartOfADrawing[] {
  return [
    { name: 'Text', builtUnder: [yourAnswersHeaderTestID] },
    { name: 'TextLink', builtUnder: [yourAnswersBackTestID] },
    {
      name: 'TextLink',
      builtUnder: [],
      ownedBy:
        'the second way back in that header, and the screen builds one of the two, as step 17.3 recorded',
    },
    { name: 'AnswerRow', builtUnder: [yourAnswerRowTestID('cycleLength')] },
  ];
}

/** What each part of the drawing of the cycle length is built under, in the drawing's order. */
function theDrawingOfTheCycleLength(): PartOfADrawing[] {
  return [
    { name: 'Text', builtUnder: [answerHeaderTestID] },
    { name: 'TextLink', builtUnder: [answerBackTestID] },
    { name: 'TextLink', builtUnder: [answerCancelTestID] },
    { name: 'OnboardingScreen', builtUnder: [answerQuestionTestID] },
    { name: 'Stepper', builtUnder: [changeCycleLengthStepperTestID] },
    { name: 'Text', builtUnder: [answerLinesTestID] },
    { name: 'PrimaryButton', builtUnder: [answerSaveTestID] },
  ];
}

/** What each part of the drawing of the export is built under, in the drawing's order. */
function theDrawingOfTheExport(): PartOfADrawing[] {
  const tiles = theExportTiles.map(exportTileTestID);

  return [
    { name: 'Text', builtUnder: [exportHeaderTestID] },
    { name: 'TextLink', builtUnder: [exportBackTestID] },
    {
      name: 'TextLink',
      builtUnder: [],
      ownedBy:
        'the second way back in that header, and the screen builds one of the two, the way the screen of her answers builds one',
    },
    { name: 'Text', builtUnder: [exportWhatTestID] },
    { name: 'FileTile', builtUnder: tiles },
    { name: 'FileTile', builtUnder: tiles },
    { name: 'Text', builtUnder: [exportHeldTestID] },
    { name: 'SecondaryButton', builtUnder: theSharesOnTheGlass() },
    { name: 'LockLine', builtUnder: [exportLockLineTestID] },
    { name: 'PrimaryButton', builtUnder: [exportActionTestID] },
  ];
}

/** What each part of the drawing of delete everything is built under, in the drawing's order. */
function theDrawingOfDelete(): PartOfADrawing[] {
  return [
    { name: 'Text', builtUnder: [deleteTitleTestID] },
    { name: 'Text', builtUnder: [deleteLineTestID] },
    { name: 'Card', builtUnder: [deleteGoesTestID] },
    { name: 'PrimaryButton', builtUnder: [deleteActionTestID] },
    { name: 'TextLink', builtUnder: [deleteBackTestID] },
  ];
}

/** Every part the drawing of that name places, in its order, each one carrying what builds it. */
export function whatTheDrawingAsksFor(drawing: PrivacyDrawing): PartOfADrawing[] {
  switch (drawing) {
    case 'privacyNext':
      return theDrawingOfPrivacy();
    case 'yourAnswers':
      return theDrawingOfHerAnswers();
    case 'answerCycleLength':
      return theDrawingOfTheCycleLength();
    case 'export':
      return theDrawingOfTheExport();
    default:
      return theDrawingOfDelete();
  }
}

/** The part names the mockups stage places for that drawing, in the stage's own order. */
export function thePartNamesTheStagePlaces(drawing: PrivacyDrawing): string[] {
  switch (drawing) {
    case 'privacyNext':
      return thePartsOfTheMockup('privacyNext').map((part) => part.name);
    case 'yourAnswers':
      return thePartsOfTheMockup('yourAnswers').map((part) => part.name);
    case 'answerCycleLength':
      return thePartsOfTheMockup('answerCycleLength').map((part) => part.name);
    case 'export':
      return thePartsOfTheMockupWithoutItsNotes('export').map((part) => part.name);
    default:
      return thePartsOfTheMockup('delete').map((part) => part.name);
  }
}

/** The parts the earlier design of the same route places, which nothing is held to. */
export function thePartsOfTheSecondDesign(): string[] {
  return thePartsOfTheMockup('settings').map((part) => part.name);
}

/** The parts the drawing of the reminder places, which nothing is built for. */
export function thePartsOfTheReminderDrawing(): Part[] {
  return thePartsOfTheMockup('reminderSettings');
}

function asPart(part: PartOfADrawing): Part {
  return { builtUnder: part.builtUnder, name: part.name };
}

/** The parts of one drawing this step answers for, which is every part no other step owns. */
export function whatThisStepAnswersFor(drawing: PrivacyDrawing): Part[] {
  return whatTheDrawingAsksFor(drawing)
    .filter((part) => part.ownedBy === undefined)
    .map(asPart);
}

/** The parts of one drawing this step leaves to another, each one carrying its reason. */
export function whatThisStepLeaves(drawing: PrivacyDrawing): PartOfADrawing[] {
  return whatTheDrawingAsksFor(drawing).filter((part) => part.ownedBy !== undefined);
}

/** What the rendered screen does not answer for, of the parts this step answers for. */
export function whatPrivacyDoesNotAnswerFor(drawing: PrivacyDrawing): string[] {
  return partsMissing(whatThisStepAnswersFor(drawing), theIdentifiersDrawn());
}

/** Every part of every drawing in this set, counted, so a shrinking comparison is visible. */
export function howManyPartsAreHeldTo(): number {
  return thePrivacyDrawings.reduce(
    (held, drawing) => held + whatThisStepAnswersFor(drawing).length,
    0,
  );
}

/** The address each drawing is opened at, which is the address she would reach it by herself. */
function theAddressOf(drawing: PrivacyDrawing): string {
  switch (drawing) {
    case 'privacyNext':
      return '/settings';
    case 'yourAnswers':
      return '/settings/answers';
    case 'answerCycleLength':
      return '/settings/answers/cycle-length';
    case 'export':
      return '/export';
    default:
      return '/settings/delete';
  }
}

/** The screen each drawing is drawn by, which is where a reading of its order starts. */
export function theScreenOf(drawing: PrivacyDrawing): string {
  switch (drawing) {
    case 'privacyNext':
      return settingsScreenTestID;
    case 'yourAnswers':
      return yourAnswersScreenTestID;
    case 'answerCycleLength':
      return answerScreenTestID;
    case 'export':
      return exportScreenTestID;
    default:
      return deleteScreenTestID;
  }
}

/**
 * The last screen she was looking at, kept so the next one can be taken off the glass first.
 *
 * Two navigators mounted at once both answer a press, and the one that answers is not the one she
 * is looking at, so one screen is closed before the next is opened.
 */
let theScreenSheWasOn: { readonly unmount: () => void | Promise<void> } | null = null;

/** The press that writes the two files, and the wait for the card that reads them back. */
async function sheMakesTheFiles(): Promise<void> {
  await fireEvent.press(routedScreen.getByTestId(exportActionTestID));
  await waitFor(() => routedScreen.getByTestId(exportHeldTestID));
}

/**
 * The screen she is looking at, opened through its own address, so the dock a drawing places under
 * a tab screen is on the glass with it.
 *
 * The export is opened and then asked for the files, because its drawing places the card that says
 * what they hold and the way to hand one over, and neither is on the glass until she presses.
 */
export async function sheIsLookingAtPrivacy(drawing: PrivacyDrawing): Promise<void> {
  if (theScreenSheWasOn !== null) {
    await theScreenSheWasOn.unmount();
    theScreenSheWasOn = null;
  }

  resetExpoSqlite();
  resetExpoSecureStore();
  resetExpoFileSystem();
  resetExpoSharing();
  await herPhoneHoldsTheseAnswers(whenSheOpensPrivacy, herAnswers, herDays);
  theScreenSheWasOn = await renderRouter(appDirectory, { initialUrl: theAddressOf(drawing) });

  if (drawing === 'export') {
    await sheMakesTheFiles();
  }
}

/** Whether the wash is drawn at the top of the screen she is looking at. */
export function theWashIsAtTheTopOfPrivacy(): boolean {
  return screen.queryByTestId(washTestID) !== null;
}

/** The style one part was drawn with, as one object. */
export function theStyleOf(testID: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle;
}

/** The style one run of words was drawn with, which is where a line reads its own layout. */
export function theTextStyleOf(testID: string): TextStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as TextStyle;
}

/** Whether the screen drew one part at all, for a case that reads an absence. */
export function privacyDrew(testID: string): boolean {
  return screen.queryByTestId(testID) !== null;
}

/**
 * Where the screen drew one part, counted from the screen itself downwards.
 *
 * A part the screen never drew is refused rather than answered with nothing. Nothing reads as
 * before everything, so a comparison of two places would pass for a part that is not on the glass.
 */
export function wherePrivacyDrew(testID: string, from: string): number {
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

/** The rows one grouped list drew, in its order, read off the glass rather than off a list. */
export function theRowsOnTheGlass(rows: readonly string[]): string[] {
  return theIdentifiersDrawn().filter((identifier) => rows.includes(identifier));
}

/** The four rows of Privacy, by the identifier each one carries. */
export const theRowsOfPrivacy: readonly string[] = settingsRows.map(settingsRowTestID);

/** The eight rows of her answers, by the identifier each one carries. */
export const theRowsOfHerAnswers: readonly string[] = yourAnswerRows.map(yourAnswerRowTestID);
