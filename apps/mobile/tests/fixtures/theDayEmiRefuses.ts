import { screen } from '@testing-library/react-native';

import { dayRefusedTestID } from '../../src/features/log/DayRefused';

import {
  type Part,
  theIdentifiersDrawn,
  thePartsOfTheMockupWithoutItsNotes,
} from './theMockupScreen';

/**
 * The day Emi refuses, and the drawing it is held to.
 *
 * She reaches a day ahead of her two ways, from the month and from the address, and the drawing
 * settles what she reads when she does. The scenario and the integration test both read it from
 * here, so the two are held to one drawing rather than to two readings of it that happen to agree.
 */

/** The parts the drawing of a refused day places, in its order, without its note to the reader. */
export function thePartsOfTheDrawingOfARefusedDay(): Part[] {
  return thePartsOfTheMockupWithoutItsNotes('dayRefused');
}

/**
 * Everything the refusal drew, from itself downwards. The route tree wraps the screen in the lock,
 * which draws an identifier of its own above it.
 */
export function whatTheRefusalDrew(): string[] {
  const drawn = theIdentifiersDrawn();
  const at = drawn.indexOf(dayRefusedTestID);

  if (at < 0) {
    throw new Error('the refusal was not on the glass');
  }

  return drawn.slice(at);
}

/** Whether the refusal is on the glass at all, which is what a month must never send her to. */
export function sheIsReadingTheRefusal(): boolean {
  return screen.queryByTestId(dayRefusedTestID) !== null;
}
