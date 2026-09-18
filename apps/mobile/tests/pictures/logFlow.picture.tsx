import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Flow } from '@emi/cycle';
import { addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { LogFlow } from '../../src/features/log/LogFlow';
import { daysOf, veryRegular } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { pageSize, screenDocument } from '../../../../brand/screens/asHtml';
import { daysLogged, readDay } from '../fixtures/cycleCache';
import { recordedAt } from '../fixtures/forecast';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const output = join(repositoryRoot, 'brand', 'screens', 'log-flow.png');

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
  'Rendered from the tree the flow screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. No screen names a font family yet.',
].join(' ');

const theDaySheOpensIt = 14;

interface State {
  readonly title: string;
  readonly note: string;
  readonly chosen?: Flow;
  readonly marked: boolean;
}

const theStates: readonly State[] = [
  {
    title: 'Day 14, nothing picked yet',
    note: 'No bleeding, so there is nothing to mark.',
    marked: false,
  },
  {
    title: 'She picks spotting',
    note: 'The question arrives under the flow she picked.',
    chosen: 'spotting',
    marked: false,
  },
  {
    title: 'She says it is not her period',
    note: 'The mark is on, and the line says what it did.',
    chosen: 'spotting',
    marked: true,
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const database = daysLogged(daysOf(veryRegular), recordedAt);
  const cycles = listCycles(database);
  const open = cycles[cycles.length - 1];

  if (open === undefined) {
    throw new Error('the recorded set holds no cycle, so there is no day 14 to draw');
  }

  const today = addDays(open.startedOn, theDaySheOpensIt - 1);
  const ring = ringInputFor({
    cycles,
    records: recordedDays(database, readDay),
    today,
    statedCycleLengthDays: 28,
  });

  const view = await render(
    <LogFlow
      chosen={state.chosen}
      day={today}
      marked={state.marked}
      onDone={() => undefined}
      onMark={() => undefined}
      onPick={() => undefined}
      ring={ring}
      today={today}
    />,
  );
  const tree: unknown = JSON.parse(JSON.stringify(view.toJSON()));

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the flow screen, drawn for somebody to look at', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theStates.length);

    const size = pageSize(screens.length);
    const directory = mkdtempSync(join(tmpdir(), 'emi-flow-'));
    const page = join(directory, 'flow.html');

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
