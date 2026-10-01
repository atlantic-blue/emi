import {
  firstForecastActionTestID,
  firstForecastLinesTestID,
  firstForecastNoGuessTestID,
  firstForecastStillLearningTestID,
  firstForecastTitleTestID,
} from '../../src/features/onboarding/FirstForecast';
import {
  type Part,
  type PartIdentifiers,
  theIdentifiersOfAPart,
  thePartsOfTheMockup,
} from './theMockupScreen';

/**
 * The first forecast with no date to count from, held against the drawing of it.
 *
 * The drawing places five parts: the title, the block of two lines, the card that says Emi is
 * still learning, the line saying Emi builds no forecast from a date it guessed, and the way on.
 * The screen answers all five in the drawing's order, so nothing here states a difference.
 */

/**
 * The drawing this screen is held to. The key is written out again at the call below, because the
 * check on the mockups stage reads the literal there and a key built at run time is a drawing
 * nobody can tell is missing.
 */
export const theDrawingOfTheForecastWithNoDate = 'firstForecastLearning';

/** What each part of that drawing is built under on the screen she reads. */
export function theIdentifiersOfTheForecastWithNoDate(): PartIdentifiers {
  return {
    ...theIdentifiersOfAPart,
    Card: [...(theIdentifiersOfAPart.Card ?? []), firstForecastStillLearningTestID],
    // The drawing names the title and the block of lines by the name of the screen both stand on,
    // so the screen answers for both and the walk takes them in the order it meets them.
    FirstForecast: [firstForecastTitleTestID, firstForecastLinesTestID],
    PrimaryButton: [...(theIdentifiersOfAPart.PrimaryButton ?? []), firstForecastActionTestID],
    Text: [...(theIdentifiersOfAPart.Text ?? []), firstForecastNoGuessTestID],
  };
}

/** Every part the drawing places, in its order, each one carrying what it is built under. */
export function thePartsOfTheForecastWithNoDate(
  identifiers: PartIdentifiers = theIdentifiersOfTheForecastWithNoDate(),
): Part[] {
  return thePartsOfTheMockup('firstForecastLearning', identifiers);
}
