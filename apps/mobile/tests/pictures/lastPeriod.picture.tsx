import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { render } from '@testing-library/react-native';

import { LastPeriod } from '../../src/features/onboarding/LastPeriod';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

const theCaveat = [
  'Rendered from the tree the last period screen produced under the test runner, at 390 by 844',
  'points, and not captured from a phone. The page loads the same font files the application',
  'loads, so the words are drawn in Plus Jakarta Sans.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

/** Well away from any summer time change, so the grid reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

interface State {
  readonly title: string;
  readonly note: string;
  readonly chosen: string | undefined;
}

const theStates: readonly State[] = [
  {
    title: 'The month she is in',
    note: 'Today is the fourteenth. The days after it are drawn and take no press.',
    chosen: undefined,
  },
  {
    title: 'Five days back, chosen',
    note: 'The square she pressed is marked, and the screen will now take her on.',
    chosen: '2026-05-09',
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      <LastPeriod
        chosen={state.chosen}
        now={whenSheOpensIt}
        onBack={() => undefined}
        onChoose={() => undefined}
        onContinue={() => undefined}
      />
    </OnAPhone>,
  );
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the last period screen, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'last-period',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:last-period-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
