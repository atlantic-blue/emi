import { screen } from '@testing-library/react-native';

import {
  type RoundActionName,
  roundActionStem,
  roundActionTestID,
} from '../../src/features/home/RoundAction';

import { type Control, controlsTooSmallToPress } from './tapTargets';
import { type Part, theMarkupOfTheMockup, thePartsOfTheMockup } from './theMockupScreen';

/**
 * The round actions under the ring: the ones the drawing places, and the ones the screen drew.
 *
 * Everything a case holds the screen to is read off the drawing. The count in particular: a number
 * written into a test passes against itself, and the whole question of this step is that the
 * drawing places two and not three.
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
  logSymptoms: 'symptoms',
};

/** What the drawing asks the screen for: one test identifier for each action, in its order. */
export function theRoundActionsTheDrawingAsksFor(): string[] {
  return theRoundActionsOfTheDrawing().map((to) => {
    const action = theActionTheDrawingSendsTo[to];

    if (action === undefined) {
      throw new Error(`the drawing sends a round action to "${to}", and nothing is built for it`);
    }

    return roundActionTestID(action);
  });
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
 * What a screen does not answer for, given the round actions the drawing places and the ones the
 * screen drew. The count is named first and on its own, because a screen carrying a third action
 * differs from the drawing by a number before it differs by anything else.
 */
export function roundActionProblemsIn(asked: readonly string[], drew: readonly string[]): string[] {
  if (asked.length === 0) {
    throw new Error('a drawing placing no round action was compared, and it can refuse nothing');
  }

  if (asked.length !== drew.length) {
    return [
      `the drawing places ${asked.length} round action(s) and the screen draws ${drew.length}`,
    ];
  }

  return asked
    .map((identifier, at) =>
      identifier === drew[at]
        ? null
        : `the drawing places ${identifier} at ${at + 1} and the screen draws ${String(drew[at])}`,
    )
    .filter((problem): problem is string => problem !== null);
}

/** The screen on the glass, held against the round actions the drawing places. */
export function roundActionProblems(): string[] {
  return roundActionProblemsIn(theRoundActionsTheDrawingAsksFor(), theRoundActionsOnTheGlass());
}

/** Each round action the screen drew, named with its size where it is under the floor SEE-3 sets. */
export function roundActionsTooSmallToPress(): string[] {
  const drawn: Control[] = theRoundActionsOnTheGlass().map((identifier) =>
    screen.getByTestId(identifier),
  );

  return controlsTooSmallToPress(drawn);
}
