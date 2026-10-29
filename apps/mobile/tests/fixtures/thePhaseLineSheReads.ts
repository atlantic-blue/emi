import { addDays, cyclePhaseDays, ovulationDayWhileLearning } from '@emi/cycle';
import { type PhaseName, colour, phaseNames, phasePalette } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import {
  ringCentreDayTestID,
  ringCentreLengthTestID,
  ringCentreNextPeriodTestID,
  ringCentrePhaseTestID,
} from '../../src/components/CycleRing';
import {
  phaseCardDaysTestID,
  phaseCardLineTestID,
  phaseCardTestID,
} from '../../src/features/home/PhaseCard';

import { colourOf } from './phaseInk';
import { sizedTextIn, textIn } from './renderedText';
import { type Part, thePartsOfTheMockup, theMarkupOfTheMockup } from './theMockupScreen';
import {
  herPeriodStartedOn,
  sheSaidHerCycleRuns,
  sheSaidHerPeriodRunsFor,
} from './theWeekSheOpensWith';

/**
 * The line under the ring in the drawings, and what the built screen draws in its place: the two
 * drawings it is held to, and the two days it is read on.
 *
 * The approved todayPhases board replaces the line. The day of her cycle moves into the middle of
 * the ring as "Day N", with the phase name over it during her period and how long until her next
 * period on the other days, and the place under the ring takes a phase card that names the phase
 * and its days. The drawings are still read, because the day and the phase
 * each drawing is drawn on come from them.
 *
 * Two drawings carry it, because the whole question of this step is a word a stranger could read.
 * `todayNext` is a period day, where contract SCREEN-2 bites, and `todayLuteal` is the same screen
 * three weeks later, where it does not. Both are read here, so neither case is a list somebody
 * typed.
 */

/**
 * The two drawings this step is held to, each named where it is read. The gate over the mockups
 * stage reads these calls to learn which drawings the suite claims, so the key is written out
 * rather than handed in, and a key built at run time would tell it nothing.
 */
const theDrawings: Readonly<Record<string, () => Part[]>> = {
  todayLuteal: () => thePartsOfTheMockup('todayLuteal'),
  todayNext: () => thePartsOfTheMockup('todayNext'),
};

/** The header, the strip, the ring and the line, which is what the top of the drawing carries. */
export function theTopOfTheDrawing(key: string): Part[] {
  const parts = theDrawings[key];

  if (parts === undefined) {
    throw new Error(
      `this step is held to todayNext and todayLuteal, and it was asked for "${key}"`,
    );
  }

  return parts().slice(0, 4);
}

/** The line as one drawing draws it: the day it names, and the phase it names it in. */
export interface DrawnPhaseLine {
  /** The day of her cycle, as the number she reads across the room. */
  readonly day: number;
  readonly phase: PhaseName;
}

const theLine = /<div class="phase-line"[^>]*>([\s\S]*?)<\/div>/;
const theNumber = /<span class="num">[^<]*?(\d+)[^<]*<\/span>/;
const theSaid = /<span class="said ([^"]*)">/;

/**
 * The day and the phase one drawing's line carries. The phase comes off the class the drawing puts
 * on the words rather than off the words themselves, because the words are a draft in one language
 * and the phase is the thing the ink is chosen by.
 */
export function thePhaseLineOfTheDrawing(key: string): DrawnPhaseLine {
  const markup = theMarkupOfTheMockup(key);
  const inside = theLine.exec(markup);

  if (inside === null) {
    throw new Error(`the drawing "${key}" carries no phase line`);
  }

  const day = theNumber.exec(inside[1] ?? '');
  const said = theSaid.exec(inside[1] ?? '');
  const named = phaseNames.find((phase) => said?.[1]?.split(/\s+/).includes(`on-${phase}`));

  if (day === null || named === undefined) {
    throw new Error(`the phase line of "${key}" names no day, or no phase to draw it in`);
  }

  return { day: Number(day[1]), phase: named };
}

/** The period day the drawing of the screen she opens is drawn on, which is her fourth. */
export const theDayOfHerPeriodTheDrawingDraws = thePhaseLineOfTheDrawing('todayNext').day;

/** The cycle day the luteal drawing is drawn on, three weeks further into the same cycle. */
export const theLutealDayTheDrawingDraws = thePhaseLineOfTheDrawing('todayLuteal').day;

/**
 * The first luteal day of her cycle under the phase rule, contract CYCLE-6. The older drawing
 * names day 21 of 31, which the rule now puts in the ovulation phase, so the luteal screen opens on
 * the first day the rule calls luteal rather than on the day the drawing names.
 */
export const theFirstLutealDayTheRuleGives = cyclePhaseDays({
  cycleLengthDays: sheSaidHerCycleRuns,
  periodLengthDays: sheSaidHerPeriodRunsFor,
  ovulationDay: ovulationDayWhileLearning(sheSaidHerCycleRuns),
}).luteal.from;

/** The day of the calendar she reaches her luteal phase on, counted from her period's start. */
export const theDaySheReachesHerLutealPhase = addDays(
  herPeriodStartedOn,
  theFirstLutealDayTheRuleGives - 1,
);

/** The day of the calendar the older luteal drawing is drawn on. */
export const theDayTheLutealDrawingNames = addDays(
  herPeriodStartedOn,
  theLutealDayTheDrawingDraws - 1,
);

function pointsOf(testID: string): number | undefined {
  const style: TextStyle = StyleSheet.flatten(screen.getByTestId(testID).props.style);

  return style.fontSize;
}

function saidUnder(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

function saidIfDrawn(testID: string): string | undefined {
  return screen.queryByTestId(testID) === null ? undefined : saidUnder(testID);
}

/** What the middle of the ring of Today and the card under it say, and the size of each part. */
export interface PhaseOnTheGlass {
  /** The day of her cycle, taken out of "Day N" in the middle of the ring. */
  readonly day: number;
  /** The whole of what the middle of the ring writes under the phase, "Day N". */
  readonly daySaid: string;
  /** The length under it, "of about N". */
  readonly lengthSaid: string;
  /** The phase name over the day, which the middle of the ring writes during her period. */
  readonly phase: string | undefined;
  /** How long until her next period, which the middle of the ring writes in place of the phase. */
  readonly nextPeriod: string | undefined;
  readonly dayPoints: number | undefined;
  /** The size of the line over the day, whichever of the two it is. */
  readonly topLinePoints: number | undefined;
  /** The colour the phase name was drawn in, read back off the rendered style. */
  readonly phaseColour: string | undefined;
  /** The first line of the card under the ring: the phase and its days. */
  readonly cardDays: string;
  /** The sentence of the card under the ring. */
  readonly cardLine: string;
  readonly cardDaysPoints: number | undefined;
}

export function thePhaseSheReads(): PhaseOnTheGlass {
  const daySaid = saidUnder(ringCentreDayTestID);
  const phase = saidIfDrawn(ringCentrePhaseTestID);

  return {
    day: Number(daySaid.replace(/\D+/g, '')),
    daySaid,
    lengthSaid: saidUnder(ringCentreLengthTestID),
    phase,
    nextPeriod: saidIfDrawn(ringCentreNextPeriodTestID),
    dayPoints: pointsOf(ringCentreDayTestID),
    topLinePoints: pointsOf(
      phase === undefined ? ringCentreNextPeriodTestID : ringCentrePhaseTestID,
    ),
    phaseColour:
      phase === undefined ? undefined : colourOf(screen.getByTestId(ringCentrePhaseTestID)),
    cardDays: saidUnder(phaseCardDaysTestID),
    cardLine: saidUnder(phaseCardLineTestID),
    cardDaysPoints: pointsOf(phaseCardDaysTestID),
  };
}

/**
 * The colour under the card, and the colour under the line of days inside it. SEE-2 keeps a word
 * off a phase fill, and a scoped walk of the card alone would never see a fill an ancestor
 * carried, so the ground is read as well as the words.
 */
export function theGroundThePhaseCardIsDrawnOn(): readonly (string | undefined)[] {
  return [phaseCardTestID, phaseCardDaysTestID].map((testID) => {
    const style: ViewStyle = StyleSheet.flatten(screen.getByTestId(testID).props.style);
    const held = style.backgroundColor;

    return typeof held === 'string' ? held : undefined;
  });
}

/** The card as a subtree, so the words inside it can be read without reading the whole glass. */
export function thePhaseCardOnTheGlass(): unknown {
  return screen.getByTestId(phaseCardTestID);
}

/** Every identifier the line under the ring drew under, which the todayPhases board took away. */
export const theIdentifiersOfTheLineThatIsGone: readonly string[] = [
  'home-phase-line',
  'home-phase-line-day',
  'home-phase-line-phase',
];

/** The ink partner of a phase, which is the colour a word about that phase is drawn in. */
export function theInkOf(phase: PhaseName): string {
  return colour[phasePalette[phase].ink];
}

/** The fill of a phase, which SEE-2 keeps every word off. */
export function theFillOf(phase: PhaseName): string {
  return colour[phasePalette[phase].fill];
}

/** The four words a stranger walking past would recognise, whatever else is on the glass. */
export const theWordsAStrangerWouldRead: readonly string[] = [
  'period',
  'bleeding',
  'fertile',
  'ovulation',
];

/** The size contract SCREEN-2 holds those four words to, in points. */
export const theLargestTheyMayBeDrawn = 14;

export interface WordTooLarge {
  readonly text: string;
  readonly points: number | undefined;
}

/**
 * Every run of text on the glass that carries one of the four words, with the size it was drawn at.
 * A run whose size nothing names counts as too large: an unmeasured word is the thing this reader
 * exists to catch.
 */
export function theFourWordsDrawnOn(tree: unknown): WordTooLarge[] {
  return sizedTextIn(tree).filter(({ text }) =>
    theWordsAStrangerWouldRead.some((word) => text.toLowerCase().includes(word)),
  );
}

/** The ones a stranger could read across the room, each named with the size it was drawn at. */
export function theFourWordsDrawnTooLargeOn(tree: unknown): WordTooLarge[] {
  return theFourWordsDrawnOn(tree).filter(
    (run) => run.points === undefined || run.points > theLargestTheyMayBeDrawn,
  );
}
