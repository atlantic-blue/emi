import type { DayRecord } from '@emi/crypto';
import type { PublishedMeasurement } from '@emi/cycle';
import { tabTestID, washTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { join } from 'node:path';
import { StyleSheet, type ViewStyle } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { tabs } from '../../src/features/chrome/tabs';
import {
  citationRowsTestID,
  figuresBackTestID,
  figuresHeaderTestID,
  figuresLeaveTestID,
  figuresPrintedTestID,
  figuresQuotedTestID,
  figuresScreenTestID,
} from '../../src/features/cycle/CitationRow';
import { cycleStripTestID } from '../../src/features/home/CycleStrip';
import { homeTrendTestID } from '../../src/features/home/CycleTrend';
import {
  homeCyclesLineTestID,
  homeFiguresLineTestID,
  homeFiguresPressTestID,
  homePatternsLineTestID,
  homePatternsPressTestID,
  homeScreenTestID,
  homeTrendCountTestID,
  homeTrendPressTestID,
} from '../../src/features/home/HomeScreen';
import { homeNumbersTestID, measuredPillTestID } from '../../src/features/home/MeasuredRow';
import { patternCardTestID } from '../../src/features/home/PatternCard';
import {
  historyBackTestID,
  historyCycleTestID,
  historyCyclesHeadingTestID,
  historyPatternsHeadingTestID,
  historyScreenTestID,
  historyTitleTestID,
  historyWaitingTestID,
} from '../../src/features/history/HistoryScreen';

import { resetExpoSqlite } from '../data/expoSqlite';
import { dayOf, herDatabase, herPhoneHolds } from './herPhone';
import { daysOfHerRepeatingSymptoms, theSymptomsThatCameBack } from './herRepeatingSymptoms';
import { daysOfHerSixCycles, herCycleLengths } from './herSixCycles';
import { textIn } from './renderedText';
import {
  type Part,
  partsMissing,
  theIdentifiersDrawn,
  thePartsOfTheMockup,
} from './theMockupScreen';

/**
 * The six screens that read her own cycles back to her, each held against the drawing of it in the
 * mockups stage.
 *
 * One file for all six, because the redesign reaches the whole of Insights at once and a part named
 * in one place is a part every screen that draws it is held to. Nothing here decides what Emi
 * counted or what it may say: it puts her phone in one state, opens the screen the drawing names,
 * and reads what the screen drew.
 *
 * A drawing names a part by a component name and a built screen answers by a test identifier, so
 * the records below join the two. The record is a list in the drawing's own order rather than one
 * keyed by the part name, because a drawing names `Text` four times over and each one is a
 * different thing on the glass.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/**
 * Every drawing this step holds a screen to, in the order she meets them.
 *
 * `todayNumbers`, `todayCycles`, `todayTrends` and `todayPatterns` are four sections of the one
 * screen at route `/`, so each of those is that screen read at one of its sections. `history` and
 * `citation` are screens of their own.
 */
export const theInsightsDrawings = [
  'history',
  'todayNumbers',
  'citation',
  'todayCycles',
  'todayTrends',
  'todayPatterns',
] as const;

export type InsightsDrawing = (typeof theInsightsDrawings)[number];

/** The four drawings that are sections of the screen she opens, read off one render. */
const theSectionsOfTheScreenSheOpens: readonly InsightsDrawing[] = [
  'todayNumbers',
  'todayCycles',
  'todayTrends',
  'todayPatterns',
];

/** Midday, and well away from any change of the clocks, so her calendar reads the same anywhere. */
export const whenSheReadsHerCycles = new Date('2026-05-14T12:00:00.000Z');

/** The length she gave at her first run, which no row of these screens reads. */
export const sheSaidHerCycleRuns = 29;

/** The three measurements, in the order the one list of published figures holds them. */
export const theThreeMeasurements: readonly PublishedMeasurement[] = [
  'cycle-length',
  'period-duration',
  'cycle-length-variation',
];

/** Where the dock draws each of its four columns, in the order the drawings place them. */
const theDock: readonly string[] = tabs.map((tab) => tabTestID(tab.name));

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

/** Every cycle her phone holds, so a strip and a row of Insights are addressed by her own days. */
function theCyclesHerPhoneHolds(): string[] {
  return listCycles(herDatabase()).map((cycle) => cycle.startedOn);
}

/**
 * The cycles her phone held when the screen was opened, by the day each one began.
 *
 * A case reads the strips and the rows off her own days rather than off a date typed into the test,
 * so a change to the days behind these screens moves the test with it.
 */
export function theCyclesHerPhoneHeld(): string[] {
  return theCyclesHerPhoneHolds();
}

/**
 * The strips the screen actually drew, in its order.
 *
 * Her phone holds more cycles than the screen she opens draws as strips, so a case reads the strips
 * off the glass rather than off the database. A case that walked every cycle on her phone would ask
 * for a strip the section never draws.
 */
export function theStripsSheRead(): string[] {
  const strips = theCyclesHerPhoneHolds().map(cycleStripTestID);

  return theIdentifiersDrawn().filter((identifier) => strips.includes(identifier));
}

/** The cycle rows Insights actually drew, in its order, read off the glass for the same reason. */
export function theRowsInsightsDrew(): string[] {
  const rows = theCyclesHerPhoneHolds().map(historyCycleTestID);

  return theIdentifiersDrawn().filter((identifier) => rows.includes(identifier));
}

/**
 * The pushed header every drawing of a section of the screen she opens opens with: a title, a way
 * back, and the word Today.
 *
 * The four sections live on one tab screen at route `/`, which she reaches by the dock, so there is
 * no pushed header to put any of the three on. Giving each section one is a new route rather than a
 * new layout, so each is named here and left out of the comparison.
 */
function thePushedHeaderOfASection(): PartOfADrawing[] {
  return [
    {
      name: 'Text',
      builtUnder: [],
      ownedBy:
        'the title of a pushed screen, and this section is part of the one screen she opens, which carries the wordmark and her name instead',
    },
    {
      name: 'TextLink',
      builtUnder: [],
      ownedBy:
        'the way back in that pushed header, and a tab screen she reaches by the dock has none',
    },
    {
      name: 'TextLink',
      builtUnder: [],
      ownedBy: 'the word Today in that pushed header, which is the screen she is already on',
    },
  ];
}

/** The dock, as the four columns every drawing of a tab screen places under it. */
function theDockOfASection(): PartOfADrawing[] {
  return theDock.map((column) => ({ name: 'BottomNavigation', builtUnder: [column] }));
}

/** What each part of the drawing of her three numbers is built under, in the drawing's order. */
function theDrawingOfHerNumbers(): PartOfADrawing[] {
  return [
    ...thePushedHeaderOfASection(),
    { name: 'MeasuredRow', builtUnder: [homeNumbersTestID] },
    { name: 'Text', builtUnder: [homeFiguresLineTestID] },
    { name: 'TextLink', builtUnder: [homeFiguresPressTestID] },
    ...theDockOfASection(),
  ];
}

/** What each part of the drawing of her cycles as strips is built under, in the drawing's order. */
function theDrawingOfHerStrips(): PartOfADrawing[] {
  const strips = theCyclesHerPhoneHolds().map(cycleStripTestID);

  return [
    ...thePushedHeaderOfASection(),
    { name: 'CycleStrip', builtUnder: strips },
    { name: 'CycleStrip', builtUnder: strips },
    { name: 'CycleStrip', builtUnder: strips },
    { name: 'Text', builtUnder: [homeCyclesLineTestID] },
    ...theDockOfASection(),
  ];
}

/** What each part of the drawing of her trend is built under, in the drawing's order. */
function theDrawingOfHerTrend(): PartOfADrawing[] {
  return [
    ...thePushedHeaderOfASection(),
    { name: 'CycleTrend', builtUnder: [homeTrendTestID] },
    { name: 'Text', builtUnder: [homeTrendCountTestID] },
    { name: 'TextLink', builtUnder: [homeTrendPressTestID] },
    ...theDockOfASection(),
  ];
}

/** What each part of the drawing of what came back is built under, in the drawing's order. */
function theDrawingOfWhatCameBack(): PartOfADrawing[] {
  return [
    ...thePushedHeaderOfASection(),
    ...theSymptomsThatCameBack.map((symptom) => ({
      name: 'PatternCard',
      builtUnder: [patternCardTestID(symptom.slug)],
    })),
    { name: 'Text', builtUnder: [homePatternsLineTestID] },
    { name: 'TextLink', builtUnder: [homePatternsPressTestID] },
    ...theDockOfASection(),
  ];
}

/**
 * What each part of the Insights screen is built under, in the drawing's order.
 *
 * The drawing names four `Text` parts and they are the four this screen writes: the title, the
 * heading over what came back, the sentence that section carries while it waits, and the heading
 * over her cycles. One `Pressable` follows, which is a cycle row, and the way back closes it.
 */
function theDrawingOfInsights(): PartOfADrawing[] {
  return [
    { name: 'Text', builtUnder: [historyTitleTestID] },
    { name: 'Text', builtUnder: [historyPatternsHeadingTestID] },
    { name: 'Text', builtUnder: [historyWaitingTestID] },
    { name: 'Text', builtUnder: [historyCyclesHeadingTestID] },
    { name: 'Pressable', builtUnder: theCyclesHerPhoneHolds().map(historyCycleTestID) },
    { name: 'TextLink', builtUnder: [historyBackTestID] },
    ...theDockOfASection(),
  ];
}

/** What each part of the page of sources is built under, in the drawing's order. */
function theDrawingOfTheSources(): PartOfADrawing[] {
  return [
    { name: 'Text', builtUnder: [figuresHeaderTestID] },
    { name: 'TextLink', builtUnder: [figuresBackTestID] },
    { name: 'TextLink', builtUnder: [figuresLeaveTestID] },
    { name: 'CitationRow', builtUnder: [citationRowsTestID] },
    { name: 'Text', builtUnder: [figuresQuotedTestID] },
    { name: 'Text', builtUnder: [figuresPrintedTestID] },
  ];
}

/** Every part the drawing of that name places, in its order, each one carrying what builds it. */
export function whatTheDrawingAsksFor(drawing: InsightsDrawing): PartOfADrawing[] {
  switch (drawing) {
    case 'history':
      return theDrawingOfInsights();
    case 'todayNumbers':
      return theDrawingOfHerNumbers();
    case 'citation':
      return theDrawingOfTheSources();
    case 'todayCycles':
      return theDrawingOfHerStrips();
    case 'todayTrends':
      return theDrawingOfHerTrend();
    default:
      return theDrawingOfWhatCameBack();
  }
}

/** The part names the mockups stage places for that drawing, in the stage's own order. */
export function thePartNamesTheStagePlaces(drawing: InsightsDrawing): string[] {
  switch (drawing) {
    case 'history':
      return thePartsOfTheMockup('history').map((part) => part.name);
    case 'todayNumbers':
      return thePartsOfTheMockup('todayNumbers').map((part) => part.name);
    case 'citation':
      return thePartsOfTheMockup('citation').map((part) => part.name);
    case 'todayCycles':
      return thePartsOfTheMockup('todayCycles').map((part) => part.name);
    case 'todayTrends':
      return thePartsOfTheMockup('todayTrends').map((part) => part.name);
    default:
      return thePartsOfTheMockup('todayPatterns').map((part) => part.name);
  }
}

function asPart(part: PartOfADrawing): Part {
  return { builtUnder: part.builtUnder, name: part.name };
}

/** The parts of one drawing this step answers for, which is every part no other step owns. */
export function whatThisStepAnswersFor(drawing: InsightsDrawing): Part[] {
  return whatTheDrawingAsksFor(drawing)
    .filter((part) => part.ownedBy === undefined)
    .map(asPart);
}

/** The parts of one drawing this step leaves to another, each one carrying its reason. */
export function whatThisStepLeaves(drawing: InsightsDrawing): PartOfADrawing[] {
  return whatTheDrawingAsksFor(drawing).filter((part) => part.ownedBy !== undefined);
}

/** What the rendered screen does not answer for, of the parts this step answers for. */
export function whatTheInsightsDoNotAnswerFor(drawing: InsightsDrawing): string[] {
  return partsMissing(whatThisStepAnswersFor(drawing), theIdentifiersDrawn());
}

/** Every part of every drawing in this set, counted, so a shrinking comparison is visible. */
export function howManyPartsAreHeldTo(): number {
  return theInsightsDrawings.reduce(
    (held, drawing) => held + whatThisStepAnswersFor(drawing).length,
    0,
  );
}

/** The address each drawing is opened at, which is the address she would reach it by herself. */
function theAddressOf(drawing: InsightsDrawing): string {
  if (drawing === 'history') {
    return '/history';
  }

  if (drawing === 'citation') {
    return '/cycles/figures';
  }

  return '/';
}

/**
 * The days behind each drawing.
 *
 * The four sections of the screen she opens need every section full at once, so they are read on
 * the phone that carries six cycles and the two symptoms that came back. The drawing of Insights
 * shows the section of what came back still waiting, so it is read on the same six cycles with no
 * symptom written on them.
 */
function herDaysBehind(drawing: InsightsDrawing): DayRecord[] {
  const today = dayOf(whenSheReadsHerCycles);

  return theSectionsOfTheScreenSheOpens.includes(drawing)
    ? daysOfHerRepeatingSymptoms(today)
    : daysOfHerSixCycles(today, herCycleLengths);
}

/**
 * The last screen she was looking at, kept so the next one can be taken off the glass first.
 *
 * Two navigators mounted at once both answer a press, and the one that answers is not the one she
 * is looking at, so one screen is closed before the next is opened.
 */
let theScreenSheWasOn: { readonly unmount: () => void | Promise<void> } | null = null;

/**
 * The screen she is looking at, opened through its own address, so the dock a drawing places under
 * a tab screen is on the glass with it.
 */
export async function sheIsLookingAtTheInsights(drawing: InsightsDrawing): Promise<void> {
  if (theScreenSheWasOn !== null) {
    await theScreenSheWasOn.unmount();
    theScreenSheWasOn = null;
  }

  resetExpoSqlite();
  await herPhoneHolds(whenSheReadsHerCycles, herDaysBehind(drawing), sheSaidHerCycleRuns);
  theScreenSheWasOn = await renderRouter(appDirectory, { initialUrl: theAddressOf(drawing) });
}

/**
 * The screen she opens, over six cycles of the lengths given, so a case can read one row of her
 * three numbers against a figure that sits outside what the paper reports.
 *
 * A pill that printed one word would pass every case read on one phone, so the rule is read twice:
 * once on her own days, and once on days whose last complete cycle ran outside the published range.
 */
export async function sheIsLookingAtHerNumbersOverCyclesOf(
  lengths: readonly number[],
): Promise<void> {
  if (theScreenSheWasOn !== null) {
    await theScreenSheWasOn.unmount();
    theScreenSheWasOn = null;
  }

  const days = daysOfHerSixCycles(dayOf(whenSheReadsHerCycles), lengths);

  resetExpoSqlite();
  await herPhoneHolds(whenSheReadsHerCycles, days, sheSaidHerCycleRuns);
  theScreenSheWasOn = await renderRouter(appDirectory, { initialUrl: '/' });
}

/** Whether the wash is drawn at the top of the screen she is looking at. */
export function theWashIsAtTheTopOfTheInsights(): boolean {
  return screen.queryByTestId(washTestID) !== null;
}

/** The style one part was drawn with, as one object. */
export function theStyleOf(testID: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle;
}

/** The screen each drawing is drawn by, which is where a reading of its order starts. */
export function theScreenOf(drawing: InsightsDrawing): string {
  if (drawing === 'history') {
    return historyScreenTestID;
  }

  if (drawing === 'citation') {
    return figuresScreenTestID;
  }

  return homeScreenTestID;
}

/**
 * Where the screen drew one part, counted from the screen itself downwards.
 *
 * A part the screen never drew is refused rather than answered with nothing. Nothing reads as
 * before everything, so a comparison of two places would pass for a part that is not on the glass.
 */
export function whereTheInsightsDrew(testID: string, from: string = homeScreenTestID): number {
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

/** The words the pill on one row puts on the glass, which is what she reads beside her number. */
export function theWordsOfThePillOn(measures: PublishedMeasurement): string {
  return textIn(screen.getByTestId(measuredPillTestID(measures)))
    .join(' ')
    .trim();
}
