import { screen } from '@testing-library/react-native';

import { logFlowTestID } from '../../src/features/log/LogFlow';

import { theIdentifiersDrawn, theIdentifiersOfAPart, thePartsOfTheMockup } from './theMockupScreen';

/**
 * The log she lands on, held against the drawing that sent her there.
 *
 * Two drawings answer one question in opposite ways. `logSymptoms` places a symptom group and no
 * flow picker. `log` places the flow picker and puts the groups after it. So nothing here says
 * which part comes first: each drawing says that for itself, and the screen is held to what the
 * drawing it names opens on.
 */

/** The drawing the symptoms action is held to. */
export const theDrawingOfTheSymptoms = 'logSymptoms';

/** The drawing the Log column of the dock is held to. */
export const theDrawingOfTheFlow = 'log';

/** Which of the two parts a screen puts first. */
export type OpenedOn = 'symptoms' | 'flow';

/** The part of a drawing each of the two is named by. */
const thePartOfTheDrawing: Readonly<Record<OpenedOn, string>> = {
  flow: 'FlowPicker',
  symptoms: 'SymptomGroup',
};

const theWordsFor: Readonly<Record<OpenedOn, string>> = {
  flow: 'the flow picker',
  symptoms: 'the symptom groups',
};

/**
 * What one of the two is built under, read off the record every comparison of a drawing reads. A
 * part nothing says an identifier for is refused here, because a search for no identifier finds
 * nothing and finding nothing reads exactly like a screen that drew the other part.
 */
export function builtUnder(part: OpenedOn): readonly string[] {
  const under = theIdentifiersOfAPart[thePartOfTheDrawing[part]] ?? [];

  if (under.length === 0) {
    throw new Error(
      `nothing says which test identifier ${thePartOfTheDrawing[part]} is built under`,
    );
  }

  return under;
}

/**
 * What one drawing opens on, read off the parts it places. A drawing that places neither is
 * refused rather than answered, because a comparison against nothing reads exactly like a match.
 */
export function whatTheDrawingOpensOn(key: string): OpenedOn {
  const names = thePartsOfTheMockup(key).map((part) => part.name);
  const group = names.indexOf(thePartOfTheDrawing.symptoms);
  const picker = names.indexOf(thePartOfTheDrawing.flow);

  if (group < 0 && picker < 0) {
    throw new Error(`the drawing "${key}" places neither a symptom group nor the flow picker`);
  }

  if (picker < 0) {
    return 'symptoms';
  }

  if (group < 0) {
    return 'flow';
  }

  return group < picker ? 'symptoms' : 'flow';
}

/** Whether the drawing places that part at all, wherever it places it. */
export function theDrawingPlaces(key: string, part: OpenedOn): boolean {
  return thePartsOfTheMockup(key).some((placed) => placed.name === thePartOfTheDrawing[part]);
}

/**
 * Everything the log drew, from itself downwards. The route tree wraps the screen in the lock,
 * which draws an identifier of its own above it, so a walk of the whole glass would answer the
 * lock where the question is about the log.
 */
export function whatTheLogDrew(): string[] {
  const drawn = theIdentifiersDrawn();
  const at = drawn.indexOf(logFlowTestID);

  if (at < 0) {
    throw new Error('the log was not on the glass');
  }

  return drawn.slice(at + 1);
}

/** Which of the two the screen drew first, and nothing at all where it drew neither. */
export function whatTheScreenOpenedOn(drawn: readonly string[]): OpenedOn | undefined {
  const groups = builtUnder('symptoms');
  const pickers = builtUnder('flow');

  for (const identifier of drawn) {
    if (groups.includes(identifier)) {
      return 'symptoms';
    }

    if (pickers.includes(identifier)) {
      return 'flow';
    }
  }

  return undefined;
}

/** What the screen does not answer for, given what the drawing opens on and what the screen drew. */
export function theLogProblemsIn(asked: OpenedOn, drawn: readonly string[]): string[] {
  const drew = whatTheScreenOpenedOn(drawn);

  if (drew === undefined) {
    return [`the drawing opens on ${theWordsFor[asked]} and the screen draws neither of them`];
  }

  if (drew === asked) {
    return [];
  }

  return [
    `the drawing opens on ${theWordsFor[asked]} and the screen opens on ${theWordsFor[drew]}`,
  ];
}

/** The log on the glass, held against the drawing of that name. An empty list is a match. */
export function theLogProblems(key: string): string[] {
  return theLogProblemsIn(whatTheDrawingOpensOn(key), whatTheLogDrew());
}

/** Every symptom group the log drew, in the order it drew them. */
export function theGroupsTheLogDrew(): string[] {
  const groups = builtUnder('symptoms');

  return whatTheLogDrew().filter((identifier) => groups.includes(identifier));
}

/** Whether the flow picker is anywhere on the log, which is the way to a flow from this screen. */
export function theFlowPickerIsOnTheLog(): boolean {
  return builtUnder('flow').some((identifier) => screen.queryByTestId(identifier) !== null);
}
