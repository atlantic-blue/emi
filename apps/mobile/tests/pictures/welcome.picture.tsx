import { render } from '@testing-library/react-native';

import { WhatEmiIs } from '../../src/features/onboarding/WhatEmiIs';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The first thing she sees, drawn for somebody to look at. It renders the screen the application
 * ships and draws the tree that came back, so nothing here restates the words and a change to the
 * screen changes the picture.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:welcome-picture`.
 */

const theCaveat = [
  'Rendered from the tree the welcome screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. No screen names a font family yet, so the browser uses its own',
  'face where the phone would use the system face. Reproduce with: npm run generate:welcome-picture.',
].join(' ');

const screens: DrawnScreen[] = [];

describe('the welcome screen, drawn for somebody to look at', () => {
  it('renders the first screen of the first run', async () => {
    const view = await render(<WhatEmiIs onContinue={() => undefined} />);
    const tree: unknown = JSON.parse(JSON.stringify(view.toJSON()));

    view.unmount();

    screens.push({
      title: 'Step 1 of 3, and it asks her nothing',
      note: 'No account, no email address, and the two refusals stated on the first screen.',
      tree,
    });
  });

  it('draws it into one picture', () => {
    expect(screens).toHaveLength(1);

    const result = drawOrCheck({
      name: 'welcome',
      screens,
      caveat: theCaveat,
      script: 'generate:welcome-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(
      `${result.markup}: ${result.characters} characters, ${result.picture}: ${result.bytes ?? 'not drawn'} bytes`,
    );
  });
});
