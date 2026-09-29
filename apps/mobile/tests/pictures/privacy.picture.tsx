import { render } from '@testing-library/react-native';

import { SettingsScreen } from '../../src/features/settings/SettingsScreen';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The screen the fourth column of the dock opens, drawn for somebody to look at. The four rows are
 * the subject of the picture: what each of them says under its name, and how much room a thumb is
 * given, are both things a reader checks with their eyes.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:privacy-picture`.
 */

const theCaveat = [
  'Rendered from the tree the screen produced under the test runner, at 390 by 844 points, and not',
  'captured from a phone. The page loads the same font files the application loads, so the words',
  'are drawn in Plus Jakarta Sans. The room kept at the top and the bottom is the room an iPhone',
  'with a dynamic island keeps for itself, which is 59 points and 34 points. The dock is not drawn,',
  'because the screen is rendered on its own rather than inside the navigator.',
  'Reproduce with: npm run generate:privacy-picture.',
].join(' ');

const theTitle = 'The screen the dock opens';
const theNote = [
  'Four rows: her answers, the lock, the export and the way out. Each one says what it holds under',
  'its name, and her answers opens the screen that reads her first run back to her.',
].join(' ');

const screens: DrawnScreen[] = [];

describe('the screen the dock opens, drawn for somebody to look at', () => {
  it('renders it', async () => {
    const view = await render(
      <OnAPhone>
        <SettingsScreen
          onAnswers={() => undefined}
          onBack={() => undefined}
          onDelete={() => undefined}
          onExport={() => undefined}
        />
      </OnAPhone>,
    );
    // A copy, taken before the screen is torn down, with the harness's own provider left out.
    const tree: unknown = theScreenIn(view);

    view.unmount();

    screens.push({ title: theTitle, note: theNote, tree });
  });

  it('draws it into one picture', () => {
    expect(screens).toHaveLength(1);

    const result = drawOrCheck({
      name: 'privacy',
      screens,
      caveat: theCaveat,
      script: 'generate:privacy-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
