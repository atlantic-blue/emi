import { render } from '@testing-library/react-native';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { CycleLength } from '../../src/features/onboarding/CycleLength';
import {
  defaultCycleLengthDays,
  maximumCycleLengthDays,
} from '../../src/features/onboarding/firstRun';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The cycle length question of the first run, drawn at three states of its wheel. The bounds come
 * from the module the screen itself reads, so a change to what a cycle may be changes the picture.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:cycle-length-picture`.
 */

const theCaveat = [
  'Rendered from the tree the cycle length screen produced under the test runner, at 390 by 844',
  'points, and not captured from a phone. The page loads the same font files the application loads,',
  'so the number is drawn in Figtree like everything else. Reproduce',
  'with: npm run generate:cycle-length-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

interface State {
  readonly title: string;
  readonly note: string;
  readonly chosen: number | undefined;
}

const theStates: readonly State[] = [
  {
    title: 'The number it opens on',
    note: `${defaultCycleLengthDays} days in the middle, chosen by nobody, so Done waits.`,
    chosen: undefined,
  },
  {
    title: 'Two days longer, chosen',
    note: 'The length she picked reads with its unit, and Done takes her on.',
    chosen: defaultCycleLengthDays + 2,
  },
  {
    title: 'At the longest cycle Emi takes',
    note: `${maximumCycleLengthDays} days. The wheel holds nothing past it.`,
    chosen: maximumCycleLengthDays,
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      <CycleLength
        chosen={state.chosen}
        onBack={() => undefined}
        onChoose={() => undefined}
        onDone={() => undefined}
      />
    </OnAPhone>,
  );
  // A copy, taken before the screen is torn down. The runner holds one screen at a time, so a tree
  // kept by reference is the tree of whatever was rendered last.
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the cycle length screen, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'cycle-length',
      screens,
      caveat: theCaveat,
      script: 'generate:cycle-length-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
