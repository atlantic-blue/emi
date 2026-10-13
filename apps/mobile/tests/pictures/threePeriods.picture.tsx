import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { render } from '@testing-library/react-native';

import { ThreePeriods } from '../../src/features/onboarding/ThreePeriods';
import type { PastPeriod } from '../../src/features/pastPeriods/pastPeriods';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { iPhone16Size } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

const theCaveat = [
  'Rendered from the tree the screen of her last three periods produced under the test runner, at 393 by 852',
  'points, which is the glass of an iPhone 16, and not captured from a phone. The page loads the',
  'same font files the application loads, so the words are drawn in Figtree.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

/** Well away from any summer time change, so the grid reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

interface State {
  readonly title: string;
  readonly note: string;
  readonly periods: readonly PastPeriod[];
}

const theStates: readonly State[] = [
  {
    title: 'Nothing given yet',
    note: 'Continue waits for one period. The way past under it is for a woman who remembers none.',
    periods: [],
  },
  {
    title: 'Two given, the third to add',
    note: 'Each row is a start and a length. The third row says she can skip it.',
    periods: [
      { startedOn: '2026-05-09', lengthDays: 7 },
      { startedOn: '2026-04-11', lengthDays: 6 },
    ],
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      <ThreePeriods
        now={whenSheOpensIt}
        onBack={() => undefined}
        onContinue={() => undefined}
        onGive={() => undefined}
        onRemove={() => undefined}
        onWayPast={() => undefined}
        periods={state.periods}
      />
    </OnAPhone>,
  );
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the screen of her last three periods, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'three-periods',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:three-periods-picture',
      size: iPhone16Size,
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
