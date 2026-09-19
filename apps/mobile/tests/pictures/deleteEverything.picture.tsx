import { spawnSync } from 'node:child_process';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { render } from '@testing-library/react-native';

import { DeleteEverything, type DeleteStage } from '../../src/features/settings/DeleteEverything';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { pageSize, screenDocument } from '../../../../brand/screens/asHtml';

/**
 * The screen the whole privacy claim rests on, drawn for somebody to look at. Both states are
 * here, because the one that matters is the one after: a screen that says it is gone and offers
 * nothing that would put it back.
 *
 * It is not part of the suite. The file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:delete-picture`.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const output = join(repositoryRoot, 'brand', 'screens', 'delete-everything.png');

const browsers = [
  process.env.EMI_BROWSER,
  '/opt/playwright/chromium_headless_shell-1234/chrome-linux/headless_shell',
  '/usr/bin/chromium',
];

function browser(): string {
  const found = browsers.find((path) => path !== undefined && existsSync(path));

  if (found === undefined) {
    throw new Error('No browser to draw with.');
  }

  return found;
}

const theCaveat = [
  'Rendered from the tree the delete screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. No screen names a font family yet.',
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

    const size = pageSize(screens.length);
    const directory = mkdtempSync(join(tmpdir(), 'emi-delete-'));
    const page = join(directory, 'delete.html');

    writeFileSync(page, screenDocument(screens, theCaveat), 'utf8');

    const run = spawnSync(
      browser(),
      [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--hide-scrollbars',
        `--screenshot=${output}`,
        `--window-size=${size.width},${size.height}`,
        pathToFileURL(page).href,
      ],
      { encoding: 'utf8' },
    );

    rmSync(directory, { force: true, recursive: true });

    expect(run.status).toBe(0);
    expect(existsSync(output)).toBe(true);
    console.log(`drew ${screens.length} screens into ${output} (${statSync(output).size} bytes)`);
  });
});
