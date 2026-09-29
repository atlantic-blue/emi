import { render } from '@testing-library/react-native';

import { ChangeCycleLength } from '../../src/features/settings/ChangeCycleLength';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The cycle length, asked again so she can correct it, drawn for somebody to look at. Whether this
 * reads as the same question the first run asked, rather than as a second interface for the same
 * answer, is the thing a reader checks with their eyes.
 *
 * The second screen is a woman who gave no length, because the line saying what she gave is the
 * part of this screen that is easiest to get wrong.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:answer-cycle-length-picture`.
 */

const theCaveat = [
  'Rendered from the trees the screens produced under the test runner, at 390 by 844 points, and',
  'not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Plus Jakarta Sans. The room kept at the top and the bottom is the room an',
  'iPhone with a dynamic island keeps for itself, which is 59 points and 34 points. The numbers are',
  'the ones the drawing of this screen carries, and not a profile read off a device.',
  'Reproduce with: npm run generate:answer-cycle-length-picture.',
].join(' ');

/** What the drawing of this screen carries: she gave 28 days and she is moving it to 31. */
const sheGave = 28;

const drawn: DrawnScreen[] = [];

async function draw(title: string, note: string, gave: number | undefined): Promise<void> {
  const view = await render(
    <OnAPhone>
      <ChangeCycleLength gave={gave} onCancel={() => undefined} onSave={() => undefined} />
    </OnAPhone>,
  );
  // A copy, taken before the screen is torn down, with the harness's own provider left out.
  const tree: unknown = theScreenIn(view);

  view.unmount();

  drawn.push({ title, note, tree });
}

describe('the cycle length asked again, drawn for somebody to look at', () => {
  it('renders it for a woman who gave a length at the first run', async () => {
    await draw(
      'Cycle length',
      'The stepper opens on the number she already gave, and the line under it says so, so she can see what she is changing away from.',
      sheGave,
    );
  });

  it('renders it for a woman who gave none', async () => {
    await draw(
      'No length given',
      'The stepper opens on the number the first run opens on, and nothing under it claims she said anything.',
      undefined,
    );
  });

  it('draws them into one picture', () => {
    expect(drawn).toHaveLength(2);

    const result = drawOrCheck({
      name: 'answer-cycle-length',
      screens: drawn,
      caveat: theCaveat,
      script: 'generate:answer-cycle-length-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
