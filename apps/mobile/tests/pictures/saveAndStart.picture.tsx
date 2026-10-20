import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { SaveAndStart, saveButtonTestID } from '../../src/features/onboarding/SaveAndStart';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The last screen of the first run, drawn before the tap and after a save that refused, for
 * somebody to look at. The second state is reached by tapping the button, so the picture shows
 * what her tap produces.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:save-picture`.
 */

const theCaveat = [
  'Rendered from the tree the last screen of the first run produced under the test runner, at 390',
  'by 844 points, and not captured from a phone. The second state was reached by tapping Save and',
  'start with a write that refused. Reproduce with: npm run generate:save-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

const screens: DrawnScreen[] = [];

describe('Save and start, drawn for somebody to look at', () => {
  it('renders the screen before she taps', async () => {
    const view = await render(
      <OnAPhone>
        <SaveAndStart onSave={() => Promise.resolve()} />
      </OnAPhone>,
    );
    const tree: unknown = theScreenIn(view);

    view.unmount();

    screens.push({
      title: 'Before she taps',
      note: 'The one moment the first run writes. Nothing is in the database until she taps.',
      tree,
    });
  });

  it('renders the screen after a save that refused', async () => {
    const view = await render(
      <OnAPhone>
        <SaveAndStart onSave={() => Promise.reject(new Error('the write refused'))} />
      </OnAPhone>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId(saveButtonTestID));
    });
    await act(async () => {
      await Promise.resolve();
    });
    const tree: unknown = theScreenIn(view);

    view.unmount();

    screens.push({
      title: 'After a save that refused',
      note: 'Nothing was written, and the button is ready for another tap.',
      tree,
    });
  });

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(2);

    const result = drawOrCheck({
      name: 'save-and-start',
      screens,
      caveat: theCaveat,
      script: 'generate:save-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
