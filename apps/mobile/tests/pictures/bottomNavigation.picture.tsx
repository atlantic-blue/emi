import { colour } from '@emi/tokens';
import { BottomNavigation } from '@emi/ui';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import { tabs } from '../../src/features/chrome/tabs';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';
import { theThemeIsLoaded } from '../fixtures/theTheme';

/**
 * The dock, drawn for somebody to look at. It is the one piece of chrome every screen carries, so
 * it is pictured on its own rather than under a screen that would draw the eye away from it.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:dock-picture`.
 */

const theCaveat = [
  'Rendered from the tree the dock produced under the test runner, at 390 by 844 points, and not',
  'captured from a phone. The class names are turned into these points by the real Tailwind, run',
  'over apps/mobile/tailwind.config.js. The blur behind the capsule is drawn by the phone and',
  'cannot be drawn here, so the glass reads as flat. The dock is a strip and the navigator stands',
  'it at the foot of the glass, which is where the picture stands it. The room kept under the dock',
  'is the room an',
  'iPhone with a dynamic island keeps for itself, which is 34 points.',
  'Reproduce with: npm run generate:dock-picture.',
].join(' ');

const theFootOfTheGlass = {
  backgroundColor: colour.surface,
  height: '100%',
  justifyContent: 'flex-end',
} as const;

interface Standing {
  readonly title: string;
  readonly note: string;
  readonly chosen: string | undefined;
}

const theStates: readonly Standing[] = [
  {
    title: 'She is on Today',
    note: 'The tab she is on is terracotta and semi bold. The other three are the muted ink.',
    chosen: 'index',
  },
  {
    title: 'She is on Insights',
    note: 'The same dock one tab along, so the only thing that moves is which column is lit.',
    chosen: 'history',
  },
];

async function drawn(standing: Standing): Promise<DrawnScreen> {
  // The dock is a strip, and the navigator stands it at the foot of the glass. The picture stands
  // it in the same place so it is looked at where she will see it.
  const view = await render(
    <OnAPhone>
      <View style={theFootOfTheGlass}>
        <BottomNavigation chosen={standing.chosen} onChoose={() => undefined} tabs={tabs} />
      </View>
    </OnAPhone>,
  );
  // A copy, taken before the dock is torn down. The runner holds one tree at a time, so a tree
  // kept by reference is the tree of whatever was rendered last.
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: standing.title, note: standing.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the bottom navigation, drawn for somebody to look at', () => {
  // react-native-css clears the stylesheet before every case, so the theme is loaded in a
  // beforeEach that runs after its own rather than once for the file.
  beforeEach(() => {
    theThemeIsLoaded();
  });

  for (const standing of theStates) {
    it(`renders the dock while ${standing.title.toLowerCase()}`, async () => {
      screens.push(await drawn(standing));
    });
  }

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'bottom-navigation',
      screens,
      caveat: theCaveat,
      script: 'generate:dock-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
