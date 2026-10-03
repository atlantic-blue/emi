import { render, screen, waitFor } from '@testing-library/react-native';
import { fireEvent } from '@testing-library/react-native';

import {
  ExportScreen,
  exportActionTestID,
  exportHeldTestID,
} from '../../src/features/export/ExportScreen';
import type { WrittenFile } from '../../src/features/export/destination';
import type { ExportOutcome } from '../../src/features/export/exportNow';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The screen that makes the two files, drawn for somebody to look at. Both states are here: the
 * screen she arrives on, and the screen after the press, where the two files are hers to hand over.
 *
 * It is not part of the suite. The file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:export-screen-picture`.
 */

const theCaveat = [
  'Rendered from the tree the export screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Figtree.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
  'The two files are the ones a phone with 30 days and 7 cycles on it writes.',
].join(' ');

const theDocument: WrittenFile = {
  name: 'emi-2026-05-14.html',
  mediaType: 'text/html',
  uri: 'file:///cache/emi-2026-05-14.html',
  characters: 4096,
};

const theDataFile: WrittenFile = {
  name: 'emi-2026-05-14.json',
  mediaType: 'application/json',
  uri: 'file:///cache/emi-2026-05-14.json',
  characters: 8192,
};

const made: ExportOutcome = { files: [theDocument, theDataFile], days: 30, cycles: 7 };

interface State {
  readonly title: string;
  readonly note: string;
  /** Whether the press has been made, which is what puts the card and the two files on the glass. */
  readonly asked: boolean;
}

const theStates: readonly State[] = [
  {
    title: 'Before she presses',
    note: 'A tile for each file, and the one action at the foot. Nothing has been written yet.',
    asked: false,
  },
  {
    title: 'After she presses',
    note: 'The card says how much the files hold, and each one is hers to hand over.',
    asked: true,
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      <ExportScreen
        canShare
        onBack={() => undefined}
        onExport={() => Promise.resolve(made)}
        onShare={() => Promise.resolve()}
      />
    </OnAPhone>,
  );

  if (state.asked) {
    await fireEvent.press(screen.getByTestId(exportActionTestID));
    await waitFor(() => screen.getByTestId(exportHeldTestID));
  }

  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the export screen, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'export-screen',
      screens,
      caveat: theCaveat,
      script: 'generate:export-screen-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
