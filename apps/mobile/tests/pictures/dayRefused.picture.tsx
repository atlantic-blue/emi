import { render } from '@testing-library/react-native';

import { DayRefused } from '../../src/features/log/DayRefused';
import type { DayRefusal } from '../../src/features/log/editDay';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The two answers Emi gives to a day she cannot take, drawn for somebody to look at. She reaches
 * either one by typing an address or by pressing a day of the month that has not happened.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:day-refused-picture`.
 */

const theCaveat = [
  'Rendered from the tree the refusal produced under the test runner, at 390 by 844 points, and not',
  'captured from a phone. The room at the top and the bottom is what an iPhone with a dynamic',
  'island keeps for itself. Reproduce with: npm run generate:day-refused-picture.',
].join(' ');

interface State {
  readonly title: string;
  readonly note: string;
  readonly refusal: DayRefusal;
}

const theStates: readonly State[] = [
  {
    note: 'She asked for a day ahead of today. Emi says so and offers the way back, because an empty editor would let her record a day she has not lived.',
    refusal: 'day-is-in-the-future',
    title: 'A day that has not happened',
  },
  {
    note: 'The address is hers to type, so an address that is not a date is an answer rather than a fault.',
    refusal: 'day-is-not-a-date',
    title: 'An address that is not a day',
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      <DayRefused onBack={() => undefined} refusal={state.refusal} />
    </OnAPhone>,
  );
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { note: state.note, title: state.title, tree };
}

const screens: DrawnScreen[] = [];

describe('the day Emi refuses, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      caveat: theCaveat,
      name: 'day-refused',
      screens,
      script: 'generate:day-refused-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
