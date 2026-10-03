import { addDays } from '@emi/cycle';
import { type PhaseName, colour, phaseNames, phasePalette } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import {
  phaseLineDayTestID,
  phaseLinePhaseTestID,
  phaseLineTestID,
} from '../../src/features/home/PhaseLine';

import { colourOf } from './phaseInk';
import { sizedTextIn, textIn } from './renderedText';
import { type Part, thePartsOfTheMockup, theMarkupOfTheMockup } from './theMockupScreen';
import { herPeriodStartedOn } from './theWeekSheOpensWith';

/**
 * The line under her week: the drawings it is held to, and the two days it is read on.
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

/** The header, the strip, the ring and the line, which is what the top of the screen carries. */
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
 * The day of the calendar she reaches her luteal phase on, counted from the day her period started
 * rather than typed, so the cycle day the drawing names and the day the test opens are one number.
 */
export const theDaySheReachesHerLutealPhase = addDays(
  herPeriodStartedOn,
  theLutealDayTheDrawingDraws - 1,
);

function pointsOf(testID: string): number | undefined {
  const style: TextStyle = StyleSheet.flatten(screen.getByTestId(testID).props.style);

  return style.fontSize;
}

/** What the built line drew: the day, the phase in words, and the size each was drawn at. */
export interface PhaseLineOnTheGlass {
  /** The whole line, as she reads it, day and phase together. */
  readonly said: string;
  /** The day of her cycle, taken out of the large type. */
  readonly day: number;
  /** The phase in words, which is the part held under 14 points. */
  readonly phase: string;
  readonly dayPoints: number | undefined;
  readonly phasePoints: number | undefined;
  /** The colour the phase was drawn in, read back off the rendered style. */
  readonly phaseColour: string | undefined;
}

export function thePhaseLineSheReads(): PhaseLineOnTheGlass {
  const day = textIn(screen.getByTestId(phaseLineDayTestID)).join('');
  const phase = textIn(screen.getByTestId(phaseLinePhaseTestID)).join('');

  return {
    said: textIn(screen.getByTestId(phaseLineTestID)).join(' '),
    day: Number(day.replace(/\D+/g, '')),
    phase,
    dayPoints: pointsOf(phaseLineDayTestID),
    phasePoints: pointsOf(phaseLinePhaseTestID),
    phaseColour: colourOf(screen.getByTestId(phaseLinePhaseTestID)),
  };
}

/**
 * The colour under the line, and the colour under the phase word inside it. SEE-2 keeps a word off
 * a phase fill, and a scoped walk of the line alone would never see a fill an ancestor carried, so
 * the ground is read as well as the words.
 */
export function theGroundThePhaseLineIsDrawnOn(): readonly (string | undefined)[] {
  return [phaseLineTestID, phaseLinePhaseTestID].map((testID) => {
    const style: ViewStyle = StyleSheet.flatten(screen.getByTestId(testID).props.style);
    const held = style.backgroundColor;

    return typeof held === 'string' ? held : undefined;
  });
}

/** The line as a subtree, so the words inside it can be read without reading the whole glass. */
export function thePhaseLineOnTheGlass(): unknown {
  return screen.getByTestId(phaseLineTestID);
}

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
