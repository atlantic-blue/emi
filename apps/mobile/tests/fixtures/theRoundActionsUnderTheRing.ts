import { screen } from '@testing-library/react-native';

import {
  type RoundActionName,
  roundActionStem,
  roundActionTestID,
} from '../../src/features/home/RoundAction';

import { type Control, controlsTooSmallToPress } from './tapTargets';
import { type Part, theMarkupOfTheMockup, thePartsOfTheMockup } from './theMockupScreen';

/**
 * The round actions under the ring: the ones the drawing places, the ones the todayPhases board
 * places, and the ones the screen drew.
 *
 * The mockup drawing places two, Period and Symptoms. The approved todayPhases board (issue 275)
 * places three, Sex, Period and Cycle phase, and moves Symptoms to the Cycle phase page. Nobody
 * edits a drawing by hand, so the mockup still places two, and the screen is held to the board.
 */

/** Where the drawing sends one round action, which is a key of another drawing. */
export type Destination = string;

const aRoundAction = /<a class="round"((?:"[^"]*"|[^>])*)>/g;
const aDestination = /data-to="([^"]*)"/;

/**
 * Where the drawing sends each round action, in the order it places them. A drawing carrying none
 * is refused, because a comparison against nothing reads exactly like one every action answered.
 */
export function theRoundActionsOfTheDrawing(): Destination[] {
  const markup = theMarkupOfTheMockup('todayNext');
  const sent: Destination[] = [];

  aRoundAction.lastIndex = 0;

  for (let found = aRoundAction.exec(markup); found !== null; found = aRoundAction.exec(markup)) {
    const to = aDestination.exec(found[1] ?? '');

    if (to === null) {
      throw new Error('a round action of the drawing is sent nowhere');
    }

    sent.push(String(to[1]));
  }

  if (sent.length === 0) {
    throw new Error('the drawing of the screen she opens places no round action');
  }

  return sent;
}

/**
 * The action each destination of the drawing is built as. The drawing names a screen of its own
 * and the built screen answers with a test identifier, so something has to join the two, and this
 * is the same record the parts of a drawing are joined by.
 */
export const theActionTheDrawingSendsTo: Readonly<Record<Destination, RoundActionName>> = {
  log: 'period',
};

/** The actions of the drawing the todayPhases board takes off Today, with the reason. */
export const theActionsTheBoardReplaced: Readonly<Record<Destination, string>> = {
  logSymptoms:
    'the todayPhases board moves Symptoms to the Cycle phase page, and its diary links to all symptoms',
};

/** The round actions the todayPhases board places, in its order (issue 275, criterion 1). */
export const theRoundActionsOfTheBoard: readonly RoundActionName[] = ['sex', 'period', 'phase'];

/**
 * Each destination of the drawing, either built as an action or replaced by the board. A
 * destination that is neither is refused, so a new action in the drawing cannot pass unread.
 */
export function theDrawingActionsAccountedFor(): string[] {
  return theRoundActionsOfTheDrawing().map((to) => {
    const action = theActionTheDrawingSendsTo[to];

    if (action !== undefined) {
      return roundActionTestID(action);
    }

    const replaced = theActionsTheBoardReplaced[to];

    if (replaced === undefined) {
      throw new Error(`the drawing sends a round action to "${to}", and nothing is built for it`);
    }

    return replaced;
  });
}

/** What the board asks the screen for: one test identifier for each action, in its order. */
export function theRoundActionsTheBoardAsksFor(): string[] {
  return theRoundActionsOfTheBoard.map(roundActionTestID);
}

/** The parts the drawing places from the top of the screen down to the last round action. */
export function theScreenDownToTheRoundActions(): Part[] {
  const parts = thePartsOfTheMockup('todayNext');
  const last = parts.map((part) => part.name).lastIndexOf('RoundAction');

  if (last < 0) {
    throw new Error('the drawing of the screen she opens names no round action');
  }

  return parts.slice(0, last + 1);
}

/** What the screen drew, under the name a round action is built under, in the order it drew them. */
export function theRoundActionsOnTheGlass(): string[] {
  return screen
    .queryAllByTestId(new RegExp(`^${roundActionStem}`))
    .map((element) => String(element.props.testID));
}

/**
 * What a screen does not answer for, given the round actions the board places and the ones the
 * screen drew. The count is named first and on its own, because a screen carrying a third action
 * differs from the drawing by a number before it differs by anything else.
 */
export function roundActionProblemsIn(asked: readonly string[], drew: readonly string[]): string[] {
  if (asked.length === 0) {
    throw new Error('a board placing no round action was compared, and it can refuse nothing');
  }

  if (asked.length !== drew.length) {
    return [`the board places ${asked.length} round action(s) and the screen draws ${drew.length}`];
  }

  return asked
    .map((identifier, at) =>
      identifier === drew[at]
        ? null
        : `the board places ${identifier} at ${at + 1} and the screen draws ${String(drew[at])}`,
    )
    .filter((problem): problem is string => problem !== null);
}

/** The screen on the glass, held against the round actions the board places. */
export function roundActionProblems(): string[] {
  return roundActionProblemsIn(theRoundActionsTheBoardAsksFor(), theRoundActionsOnTheGlass());
}

/** Each round action the screen drew, named with its size where it is under the floor SEE-3 sets. */
export function roundActionsTooSmallToPress(): string[] {
  const drawn: Control[] = theRoundActionsOnTheGlass().map((identifier) =>
    screen.getByTestId(identifier),
  );

  return controlsTooSmallToPress(drawn);
}
