import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { render } from '@testing-library/react-native';

import { DeleteEverything, type DeleteStage } from '../../src/features/settings/DeleteEverything';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The screen the whole privacy claim rests on, drawn for somebody to look at. Both states are
 * here, because the one that matters is the one after: a screen that says it is gone and offers
 * nothing that would put it back.
 *
 * It is not part of the suite. The file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:delete-picture`.
 */

const theCaveat = [
  'Rendered from the tree the delete screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Plus Jakarta Sans.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

interface State {
  readonly title: string;
  readonly note: string;
  readonly stage: DeleteStage;
}

const theStates: readonly State[] = [
  {
    title: 'Before she presses',
    note: 'What goes is listed first, and the way back out is an ordinary button beside the one that deletes.',
    stage: 'ready',
  },
  {
    title: 'After she presses',
    note: 'One press did it. There is nothing here that would put any of it back.',
    stage: 'deleted',
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      <DeleteEverything
        onBack={() => undefined}
        onDelete={() => undefined}
        onStartAgain={() => undefined}
        stage={state.stage}
      />
    </OnAPhone>,
  );
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the delete screen, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'delete-everything',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:delete-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
