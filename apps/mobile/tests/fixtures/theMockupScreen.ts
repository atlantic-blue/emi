import { join } from 'node:path';

import { screen } from '@testing-library/react-native';

import {
  type MockupRow,
  type Mockups,
  mockupsIn,
  partsOfTheScreen,
  rowsOfTheScreen,
} from '../../../../tools/pipeline/mockups';
import { homeHeaderTestID } from '../../src/features/home/HomeHeader';
import { weekStripTestID } from '../../src/features/home/WeekStrip';
import {
  promiseActionTestID,
  promiseLineTestID,
  thePromiseTestID,
} from '../../src/features/onboarding/ThePromise';
import {
  answerBackTestID,
  answerCancelTestID,
  answerHeaderTestID,
  answerLinesTestID,
  answerQuestionTestID,
  answerSaveTestID,
} from '../../src/features/settings/AnswerScreen';
import { changeCycleLengthStepperTestID } from '../../src/features/settings/ChangeCycleLength';
import { settingsTitleTestID } from '../../src/features/settings/SettingsScreen';
import {
  yourAnswersBackTestID,
  yourAnswersTitleTestID,
} from '../../src/features/settings/YourAnswers';

/**
 * A rendered screen, held against the drawing it names.
 *
 * The comparison reads the parts the drawing places and the order it places them in, and nothing
 * else. It never reads the words: the words come from the catalogue in three languages, and the
 * mockups stage says the wording is not its to settle, so a comparison of text would hold the
 * product to a draft.
 *
 * A drawing names a part by its component name and a built screen answers by a test identifier, so
 * something has to join the two. That is the record below. A part the record does not carry fails
 * the comparison and the failure names it, which is how a screen nobody has built yet goes red
 * rather than quietly passing.
 */

const repositoryRoot = join(__dirname, '..', '..', '..', '..');

let read: Mockups | null = null;

/** The stage, parsed once for the whole file, because every case in it reads the same drawings. */
function theStage(): Mockups {
  read ??= mockupsIn(repositoryRoot);

  return read;
}

/** What one part of a drawing is built under, wherever it is built. */
export type PartIdentifiers = Readonly<Record<string, readonly string[]>>;

/**
 * What each part of a drawing is built under.
 *
 * A list rather than one name, because one component is built once for each screen that stands on
 * it and carries an identifier of its own each time: the affirmative action of the promise is
 * `promise-action` and the affirmative action of the welcome will be its own. A part matches where
 * the screen draws any identifier on its list.
 *
 * Only the parts of the screens a test holds today are here. A step that holds the next screen to
 * its drawing adds the parts of that screen, and until it does the comparison names what it could
 * not find.
 */
export const theIdentifiersOfAPart: PartIdentifiers = {
  Card: [
    promiseLineTestID('encrypted'),
    promiseLineTestID('noTracking'),
    promiseLineTestID('delete'),
  ],
  HomeHeader: [homeHeaderTestID],
  // The drawing calls the question of a changed answer by the name of the frame the first run asks
  // it in, because it is the same question in the same words.
  OnboardingScreen: [answerQuestionTestID],
  PrimaryButton: [promiseActionTestID, answerSaveTestID],
  Stepper: [changeCycleLengthStepperTestID],
  Text: [settingsTitleTestID, yourAnswersTitleTestID, answerHeaderTestID, answerLinesTestID],
  TextLink: [yourAnswersBackTestID, answerBackTestID, answerCancelTestID],
  ThePromise: [thePromiseTestID],
  WeekStrip: [weekStripTestID],
};

export interface Part {
  /** What the drawing calls the part. */
  readonly name: string;
  /** Every identifier the built part may carry. Empty where nothing says what it is built under. */
  readonly builtUnder: readonly string[];
}

/**
 * The markup of one drawing.
 *
 * A comparison reads the parts a drawing names, and the header of the screen she opens names one
 * part with three things inside it that carry no name of their own. So that one step reads the
 * markup to learn the order the drawing puts them in, rather than trusting an order somebody typed.
 */
export function theMarkupOfTheMockup(key: string): string {
  const drawing = theStage().screens[key];

  if (drawing === undefined) {
    throw new Error(`the mockups stage holds no screen called "${key}"`);
  }

  return drawing.html;
}

/** The parts of one drawing, in its order, each one carrying what it is built under. */
export function thePartsOfTheMockup(
  key: string,
  identifiers: PartIdentifiers = theIdentifiersOfAPart,
): Part[] {
  return partsOfTheScreen(theStage(), key).map((name) => ({
    builtUnder: identifiers[name] ?? [],
    name,
  }));
}

/**
 * The rows one drawing places, in its order, each one carrying where the drawing sends it.
 *
 * A screen of rows is held to this as well as to its parts, because a part is named by a
 * `data-component` and a row the drawing sends nowhere carries none. The lock row of Privacy is
 * exactly that, and a comparison that read the parts alone would let it be taken off the built
 * screen without a word.
 */
export function theRowsOfTheMockup(key: string): MockupRow[] {
  return rowsOfTheScreen(theStage(), key);
}

/** Every test identifier the screen on the glass draws, in the order the screen draws them. */
export function theIdentifiersDrawn(): string[] {
  return screen
    .queryAllByTestId(/.+/)
    .map((element) => String(element.props.testID))
    .filter((identifier) => identifier.length > 0);
}

function describePart(part: Part, after: string | null): string {
  if (part.builtUnder.length === 0) {
    return `the drawing names ${part.name}, and nothing says which test identifier it is built under`;
  }

  const under = part.builtUnder.join(' or ');
  const where = after === null ? 'anywhere on the screen' : `after ${after}`;

  return `the drawing names ${part.name}, built under ${under}, and the screen draws none of them ${where}`;
}

/**
 * What a screen does not answer for, given the parts a drawing names and the identifiers the
 * screen drew, in the order each of them came.
 *
 * The walk keeps its place in what the screen drew, so a part found before the part ahead of it
 * counts as out of order rather than as present.
 *
 * A drawing that names no part is refused rather than passed, because a comparison of nothing
 * reads exactly like a comparison every part answered.
 */
export function partsMissing(parts: readonly Part[], drawn: readonly string[]): string[] {
  if (parts.length === 0) {
    throw new Error('a drawing naming no part was compared, and it can refuse nothing');
  }

  const problems: string[] = [];
  let at = 0;
  let after: string | null = null;

  for (const part of parts) {
    const found = drawn.findIndex(
      (identifier, where) => where >= at && part.builtUnder.includes(identifier),
    );

    if (found < 0) {
      problems.push(describePart(part, after));
      continue;
    }

    after = drawn[found] ?? null;
    at = found + 1;
  }

  return problems;
}

/** The screen on the glass, held against the drawing of that name. An empty list is a match. */
export function partsMissingFromTheScreen(
  key: string,
  identifiers: PartIdentifiers = theIdentifiersOfAPart,
): string[] {
  return partsMissing(thePartsOfTheMockup(key, identifiers), theIdentifiersDrawn());
}
