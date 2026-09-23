import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import {
  HOLD_MILLISECONDS,
  HoldToBegin,
  holdCoreTestID,
} from '../../src/features/onboarding/HoldToBegin';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The hold, drawn at rest and part way through, for somebody to look at. The second state is
 * reached by holding the ring rather than by setting a number, so the picture shows what her
 * thumb produces.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:hold-picture`.
 */

const theCaveat = [
  'Rendered from the tree the hold screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. The second state was reached by holding the ring for half of',
  'the hold, with the phone allowing motion. A phone asking for less motion draws no arc at all.',
  'Reproduce with: npm run generate:hold-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

const screens: DrawnScreen[] = [];

async function theHoldScreen() {
  const view = await render(
    <OnAPhone>
      <HoldToBegin onHeld={() => Promise.resolve()} />
    </OnAPhone>,
  );
  // The answer about motion arrives from the phone as a promise, so it is in hand before her
  // thumb goes down rather than after it.
  await act(async () => {
    await Promise.resolve();
  });

  return view;
}

describe('the hold, drawn for somebody to look at', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('renders the ring before she touches it', async () => {
    const view = await theHoldScreen();
    const tree: unknown = theScreenIn(view);

    view.unmount();

    screens.push({
      title: 'Before her thumb goes down',
      note: 'The one moment the first run writes. Nothing is in the database until this hold ends.',
      tree,
    });
  });

  it('renders the ring half way through the hold', async () => {
    const view = await theHoldScreen();

    await act(async () => {
      fireEvent(screen.getByTestId(holdCoreTestID), 'pressIn');
    });
    await act(async () => {
      jest.advanceTimersByTime(HOLD_MILLISECONDS / 2);
    });
    const tree: unknown = theScreenIn(view);

    view.unmount();

    screens.push({
      title: 'Half way through the hold',
      note: 'The arc fills as she holds. Letting go here writes nothing and gives the ring back.',
      tree,
    });
  });

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(2);

    const result = drawOrCheck({
      name: 'hold-to-begin',
      screens,
      caveat: theCaveat,
      script: 'generate:hold-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
