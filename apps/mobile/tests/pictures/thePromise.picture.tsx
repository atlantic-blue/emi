import { render } from '@testing-library/react-native';

import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { ThePromise } from '../../src/features/onboarding/ThePromise';
import { WhatEmiDoesWithIt } from '../../src/features/onboarding/WhatEmiDoesWithIt';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { iPhone16Size } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The two screens between her first forecast and the hold, drawn for somebody to look at. The
 * screen that reads her answers back is drawn twice, because the one card built from an answer
 * says two different things: the groups she pressed, or the order everybody gets.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:promise-picture`.
 */

const theCaveat = [
  'Rendered from the trees the two screens produced under the test runner, at 393 by 852 points,',
  'which is the glass of an iPhone 16, and not captured from a phone.',
  'Reproduce with: npm run generate:promise-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

const screens: DrawnScreen[] = [];

async function drawn(title: string, note: string, element: React.ReactElement): Promise<void> {
  const view = await render(<OnAPhone>{element}</OnAPhone>);
  const tree: unknown = theScreenIn(view);

  view.unmount();

  screens.push({ title, note, tree });
}

describe('the promise and what Emi does with it, drawn for somebody to look at', () => {
  it('renders the promise', async () => {
    await drawn(
      'The promise',
      'Three lines, each one a thing the product does today. Nothing about the hardware the key sits in, and no standard anybody has checked Emi against.',
      <ThePromise onContinue={() => undefined} />,
    );
  });

  it('renders what Emi does with it, for a woman who named two groups', async () => {
    await drawn(
      'What Emi does with it, after she named two groups',
      'The middle card names the groups she pressed on the focus screen, in the order she pressed them, because that is the order her log will open in.',
      <WhatEmiDoesWithIt focus={['mood', 'energy']} onContinue={() => undefined} />,
    );
  });

  it('renders what Emi does with it, for a woman who named none', async () => {
    await drawn(
      'What Emi does with it, after she named none',
      'The same card says what she will open instead, because a woman who pressed nothing named nothing to come first.',
      <WhatEmiDoesWithIt focus={[]} onContinue={() => undefined} />,
    );
  });

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(3);

    const result = drawOrCheck({
      name: 'the-promise',
      screens,
      caveat: theCaveat,
      script: 'generate:promise-picture',
      size: iPhone16Size,
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
