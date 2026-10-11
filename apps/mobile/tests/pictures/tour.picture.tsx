import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { TourScreen } from '../../src/features/onboarding/TourScreen';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The one card she reads after the welcome and before Emi asks her anything, drawn for somebody to
 * look at. It is the screen the application ships, so nothing here restates a word and a change to
 * the tour changes the picture.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:tour-picture`.
 */

const theCaveat = [
  'Rendered from the tree the tour produced under the test runner, at 390 by 844 points, and not',
  'captured from a phone. The page loads the same font files the application loads, so the words',
  'are drawn in Figtree and JetBrains Mono. Reproduce with:',
  'npm run generate:tour-picture. The room kept at the top and the bottom of each screen is the',
  'room an iPhone with a dynamic island keeps for itself, which is 59 points and 34 points.',
  'The ring draws a cycle nobody has lived, because the tour comes before she',
  'has given Emi a day.',
].join(' ');

const screens: DrawnScreen[] = [];

describe('the tour, drawn for somebody to look at', () => {
  beforeEach(() => {
    // The ring arrives open, so the picture holds the shape and never a frame of its movement.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the card', async () => {
    const view = await render(
      <OnAPhone>
        <TourScreen onNext={() => undefined} onSkip={() => undefined} />
      </OnAPhone>,
    );
    const tree: unknown = theScreenIn(view);

    view.unmount();

    screens.push({
      title: 'The tour',
      note: 'The ring and its legend, what the ring is, the price, and the way on.',
      tree,
    });
  });

  it('draws it into one picture', () => {
    expect(screens).toHaveLength(1);

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
