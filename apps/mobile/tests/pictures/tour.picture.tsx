import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { TourScreen } from '../../src/features/onboarding/TourScreen';
import { type TourCard, tourCards } from '../../src/features/onboarding/copy';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The four cards she reads before Emi asks her anything, drawn for somebody to look at. Each one
 * is the screen the application ships, so nothing here restates a word and a change to the tour
 * changes the picture.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:tour-picture`.
 */

const theCaveat = [
  'Rendered from the tree the tour produced under the test runner, at 390 by 844 points, and not',
  'captured from a phone. The page loads the same font files the application loads, so the words',
  'are drawn in Newsreader, Plus Jakarta Sans and JetBrains Mono. Reproduce with:',
  'npm run generate:tour-picture. The room kept at the top and the bottom of each screen is the',
  'room an iPhone with a dynamic island keeps for itself, which is 59 points and 34 points.',
  'The ring on the first card draws a cycle nobody has lived, because the tour comes before she',
  'has given Emi a day.',
].join(' ');

const theNoteOn: Readonly<Record<TourCard, string>> = {
  ring: 'The ring, and the count in the header with the way out beside it.',
  range: 'The card that names a forecast, so it carries the two denials.',
  records: 'What she writes, and what six cycles of it buys her.',
  yours: 'The emblem, the price, and what the money pays for.',
};

const screens: DrawnScreen[] = [];

describe('the tour, drawn for somebody to look at', () => {
  beforeEach(() => {
    // The ring arrives open, so the picture holds the shape and never a frame of its movement.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(tourCards.map((card, at) => [card, at] as const))(
    'renders card %s of the tour',
    async (card, at) => {
      const view = await render(
        <OnAPhone>
          <TourScreen
            card={card}
            onBack={() => undefined}
            onNext={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );
      const tree: unknown = theScreenIn(view);

      view.unmount();

      screens.push({
        title: `Card ${at + 1} of ${tourCards.length}`,
        note: theNoteOn[card],
        tree,
      });
    },
  );

  it('draws the four of them into one picture', () => {
    expect(screens).toHaveLength(tourCards.length);

    const result = drawOrCheck({
      name: 'tour',
      screens,
      caveat: theCaveat,
      script: 'generate:tour-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
