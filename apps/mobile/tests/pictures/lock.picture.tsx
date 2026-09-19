import { render } from '@testing-library/react-native';

import { Cover } from '../../src/features/lock/Cover';
import { LockScreen } from '../../src/features/lock/LockScreen';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The two screens the lock puts in front of her history, drawn for somebody to look at. Neither one
 * carries a word she wrote, which is the whole point of both: what a stranger holding her phone
 * reads is the wordmark and nothing else.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:lock-picture`.
 */

const theCaveat = [
  'Rendered from the trees the lock screen and the cover produced under the test runner, at 390 by',
  '844 points, and not captured from a phone. The room at the top and the bottom is what an iPhone',
  'with a dynamic island keeps for itself. The prompt the phone puts up belongs to the operating',
  'system and cannot be drawn here. Reproduce with: npm run generate:lock-picture.',
].join(' ');

interface State {
  readonly title: string;
  readonly note: string;
  /** The cover has no state at all, so it is named rather than configured. */
  readonly screen: 'lock' | 'cover';
  readonly wasRefused?: boolean;
}

const theStates: readonly State[] = [
  {
    title: 'On her way back in',
    note: 'The phone is asked as she returns. This is what waits behind that prompt.',
    screen: 'lock',
  },
  {
    title: 'She cancelled the prompt',
    note: 'A cancelled prompt leaves a screen that can do nothing, so the line changes and the button asks again.',
    screen: 'lock',
    wasRefused: true,
  },
  {
    title: 'What the task switcher keeps',
    note: 'The moment Emi leaves the foreground her screens are taken out of the layout and this goes on top.',
    screen: 'cover',
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      {state.screen === 'cover' ? (
        <Cover />
      ) : (
        <LockScreen onUnlock={() => undefined} wasRefused={state.wasRefused ?? false} />
      )}
    </OnAPhone>,
  );
  // A copy, taken before the screen is torn down, with the harness's own provider left out. The
  // runner holds one screen at a time, so a tree kept by reference is the tree of whatever was
  // rendered last.
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the lock, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'lock',
      screens,
      caveat: theCaveat,
      script: 'generate:lock-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
