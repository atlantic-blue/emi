import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { render } from '@testing-library/react-native';

import { LastPeriod } from '../../src/features/onboarding/LastPeriod';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { pageSize, screenDocument } from '../../../../brand/screens/asHtml';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const output = join(repositoryRoot, 'brand', 'screens', 'last-period.png');

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
  'Rendered from the tree the last period screen produced under the test runner, at 390 by 844',
  'points, and not captured from a phone. No screen names a font family yet.',
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
    <LastPeriod
      chosen={state.chosen}
      now={whenSheOpensIt}
      onChoose={() => undefined}
      onContinue={() => undefined}
    />,
  );
  const tree: unknown = JSON.parse(JSON.stringify(view.toJSON()));

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

    const size = pageSize(screens.length);
    const directory = mkdtempSync(join(tmpdir(), 'emi-last-period-'));
    const page = join(directory, 'last-period.html');

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
