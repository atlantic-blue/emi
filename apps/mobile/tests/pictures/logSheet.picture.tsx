import { fireEvent, render } from '@testing-library/react-native';

import { LogSheet } from '../../src/features/log/LogSheet';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The sheet she logs a day into, drawn at four of its states. The last two are driven rather than
 * passed in, because the search and the refusal are the sheet's own state and a picture built from
 * props alone would show a sheet the component cannot reach.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:log-sheet-picture`.
 */

const theCaveat = [
  'Rendered from the tree the log sheet produced under the test runner, at 390 by 844 points, and',
  'not captured from a phone. The sheet scrolls on a phone and the frame does not, so each frame',
  'shows the top of it. Reproduce with: npm run generate:log-sheet-picture.',
].join(' ');

const theDay = '2026-03-14';

/** A temperature nobody has, which the record refuses and the sheet then refuses to save. */
const tooCold = '21.5';

interface State {
  readonly title: string;
  readonly note: string;
  readonly symptoms?: readonly string[];
  readonly moods?: readonly string[];
  readonly energy?: number;
  readonly temperatureCelsius?: number;
  readonly weightKilograms?: number;
  /** Typed into the symptom search once the sheet is up. */
  readonly searches?: string;
  /** Typed into the temperature field once the sheet is up. */
  readonly types?: string;
}

const theStates: readonly State[] = [
  {
    title: 'A day with nothing logged',
    note: 'It opens empty. Mood, energy, temperature and weight come before the seventy symptoms.',
  },
  {
    title: 'How she feels today',
    note: 'Two moods, energy at four, a temperature and a weight. The foot counts what one save writes.',
    moods: ['irritable', 'anxious'],
    energy: 4,
    symptoms: ['cramps', 'lower-back-pain'],
    temperatureCelsius: 36.8,
    weightKilograms: 62.4,
  },
  {
    title: 'She looks for one symptom',
    note: 'The search reads the whole catalogue and answers with what matches, counted.',
    searches: 'head',
  },
  {
    title: 'A temperature nobody has',
    note: 'One save writes the whole day, so a measurement the record refuses stops the save rather than being dropped out of it.',
    types: tooCold,
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <LogSheet
      day={theDay}
      energy={state.energy}
      moods={state.moods}
      onSave={() => undefined}
      symptoms={state.symptoms}
      temperatureCelsius={state.temperatureCelsius}
      weightKilograms={state.weightKilograms}
    />,
  );

  if (state.searches !== undefined) {
    await fireEvent.changeText(view.getByTestId('symptom-search'), state.searches);
  }

  if (state.types !== undefined) {
    await fireEvent.changeText(view.getByTestId('temperature-value'), state.types);
  }

  // A copy, taken before the screen is torn down. The runner holds one screen at a time, so a tree
  // kept by reference is the tree of whatever was rendered last.
  const tree: unknown = JSON.parse(JSON.stringify(view.toJSON()));

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the log sheet, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'log-sheet',
      screens,
      caveat: theCaveat,
      script: 'generate:log-sheet-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
