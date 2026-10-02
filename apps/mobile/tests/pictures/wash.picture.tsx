import { type PhaseName, colour, phaseLabel, phaseNames, washOfPhase } from '@emi/tokens';
import { Wash } from '@emi/ui';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';
import { theThemeIsLoaded } from '../fixtures/theTheme';

/**
 * The wash, drawn for somebody to look at. It is the colour at the top of the screen that says
 * where she is in her cycle before she reads a word, so the only way to review it is to see it.
 *
 * Nothing renders it on a screen yet, which is why it is pictured on its own rather than under one.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:wash-picture`.
 */

const theCaveat = [
  'Rendered from the tree the Wash component produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. Every colour is read from @emi/tokens, which is held to the wash',
  'block of docs/design/prototype-design-system.md. Each panel is one wash over her own ground, so',
  'the band where the wash reaches the ground is the join and not an edge in the wash. A browser',
  'draws a circle where react-native-svg draws an ellipse, so each tint is written as the unit',
  'circle under a transform carrying its two radii: the shape is the one the component asked for,',
  'in another coordinate system. No screen of the application draws the wash yet.',
  'Reproduce with: npm run generate:wash-picture.',
].join(' ');

/** Her own surface under the wash, so the colour the wash falls to is visible against it. */
const theGlass = { backgroundColor: colour.ground, height: '100%' } as const;

interface Panel {
  readonly title: string;
  readonly note: string;
  readonly phase: PhaseName | undefined;
}

const thePanels: readonly Panel[] = [
  {
    title: 'No phase yet',
    note: 'The soft wash, which every screen that knows no phase draws. A new phone opens on this.',
    phase: undefined,
  },
  ...phaseNames.map((phase) => ({
    title: phaseLabel[phase],
    note: `The ${washOfPhase[phase]} wash, which the ${phaseLabel[phase].toLowerCase()} phase takes.`,
    phase,
  })),
];

async function drawn(panel: Panel): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      <View style={theGlass}>
        <Wash phase={panel.phase} />
      </View>
    </OnAPhone>,
  );
  // A copy, taken before the wash is torn down. The runner holds one tree at a time, so a tree
  // kept by reference is the tree of whatever was rendered last.
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: panel.title, note: panel.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the top wash, drawn for somebody to look at', () => {
  // react-native-css clears the stylesheet before every case, so the theme is loaded in a
  // beforeEach that runs after its own rather than once for the file.
  beforeEach(() => {
    theThemeIsLoaded();
  });

  for (const panel of thePanels) {
    it(`renders the wash for ${panel.title.toLowerCase()}`, async () => {
      screens.push(await drawn(panel));
    });
  }

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(thePanels.length);

    const result = drawOrCheck({
      name: 'wash',
      screens,
      caveat: theCaveat,
      script: 'generate:wash-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
