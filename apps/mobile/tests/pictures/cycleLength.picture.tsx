import { render } from '@testing-library/react-native';

import { CycleLength } from '../../src/features/onboarding/CycleLength';
import {
  defaultCycleLengthDays,
  minimumCycleLengthDays,
} from '../../src/features/onboarding/firstRun';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The last question of the first run, drawn at the three states of its stepper. The bounds come
 * from the module the screen itself reads, so a change to what a cycle may be changes the picture.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:cycle-length-picture`.
 */

const theCaveat = [
  'Rendered from the tree the cycle length screen produced under the test runner, at 390 by 844',
  'points, and not captured from a phone. No screen names a font family yet, so the browser uses',
  'its own face where the phone would use the system face. Reproduce with: npm run',
  'generate:cycle-length-picture.',
].join(' ');

interface State {
  readonly title: string;
  readonly note: string;
  readonly days: number;
}

const theStates: readonly State[] = [
  {
    title: 'The number it starts on',
    note: `${defaultCycleLengthDays} days, which is the one she changes rather than the one she is told.`,
    days: defaultCycleLengthDays,
  },
  {
    title: 'Three presses longer',
    note: 'One press moves one day, so the number is hers and not a list she picks from.',
    days: defaultCycleLengthDays + 3,
  },
  {
    title: 'At the shortest cycle Emi takes',
    note: `${minimumCycleLengthDays} days. The minus is spent and takes no press.`,
    days: minimumCycleLengthDays,
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <CycleLength days={state.days} onChange={() => undefined} onDone={() => undefined} />,
  );
  // A copy, taken before the screen is torn down. The runner holds one screen at a time, so a tree
  // kept by reference is the tree of whatever was rendered last.
  const tree: unknown = JSON.parse(JSON.stringify(view.toJSON()));

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
    console.log(
      `${result.markup}: ${result.characters} characters, ${result.picture}: ${result.bytes ?? 'not drawn'} bytes`,
    );
  });
});
