import { calendarTestID } from '../../src/features/onboarding/Calendar';
import {
  onboardingActionTestID,
  onboardingLinesTestID,
  onboardingProgressTestID,
  onboardingTitleTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import {
  type Part,
  type PartIdentifiers,
  theIdentifiersOfAPart,
  thePartsOfTheMockup,
} from './theMockupScreen';

/**
 * The question about her last period, held against the drawing of it with a way past.
 *
 * The drawing places six parts: how far along she is, the question, the days, the lines she reads,
 * the way past and the action. Five of them the screen answers in the drawing's order. The sixth
 * is the lines, and the screen draws those above the days rather than under them, so she reads
 * what Emi does with the day before she picks it. That was decided and measured on the glass when
 * the line about encryption moved, so the comparison here states the difference rather than
 * hiding it.
 */

/**
 * The drawing this screen is held to. The key is written out again at the call below, because the
 * check on the mockups stage reads the literal there and a key built at run time is a drawing
 * nobody can tell is missing.
 */
export const theDrawingOfTheWayPast = 'lastPeriodNext';

/** Where the drawing places the lines, which is the one part the screen answers out of order. */
export const theLinesAreAt = 3;

/** What each part of that drawing is built under on the question she reads. */
export function theIdentifiersOfTheLastPeriodScreen(): PartIdentifiers {
  return {
    ...theIdentifiersOfAPart,
    Calendar: [calendarTestID],
    // The drawing names the question and the lines under it by the name of the frame both stand
    // in, so the frame answers for both and the walk takes them in the order it meets them.
    OnboardingScreen: [onboardingTitleTestID, onboardingLinesTestID],
    PrimaryButton: [...(theIdentifiersOfAPart.PrimaryButton ?? []), onboardingActionTestID],
    ProgressBar: [onboardingProgressTestID],
    TextLink: [...(theIdentifiersOfAPart.TextLink ?? []), onboardingWayPastTestID],
  };
}

/** Every part the drawing places, in its order, each one carrying what it is built under. */
export function thePartsOfTheWayPastDrawing(
  identifiers: PartIdentifiers = theIdentifiersOfTheLastPeriodScreen(),
): Part[] {
  return thePartsOfTheMockup('lastPeriodNext', identifiers);
}

/**
 * The same parts without the lines, which are the parts the drawing and the screen agree the
 * order of. A list that lost more than the lines is refused, because a comparison of fewer parts
 * reads exactly like a comparison every part answered.
 */
export function thePartsTheScreenKeepsInOrder(
  identifiers: PartIdentifiers = theIdentifiersOfTheLastPeriodScreen(),
): Part[] {
  const parts = thePartsOfTheWayPastDrawing(identifiers);
  const lines = parts[theLinesAreAt];

  if (lines === undefined || lines.name !== 'OnboardingScreen') {
    throw new Error(
      `the drawing "${theDrawingOfTheWayPast}" no longer places its lines fourth, so this comparison reads the wrong part`,
    );
  }

  return parts.filter((_unused, at) => at !== theLinesAreAt);
}
