import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ForecastResult } from '@emi/cycle';
import { addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { rangeSentence } from '../../src/features/forecast/copy';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { HomeScreen } from '../../src/features/home/HomeScreen';
import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import {
  daysOf,
  genuinelyIrregular,
  oneCycleComplete,
  oneLongCycle,
  twoCyclesExactly,
  veryRegular,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { pageSize, screenDocument } from '../../../../brand/screens/asHtml';
import { daysLogged, migratedDatabase, readDay } from '../fixtures/cycleCache';
import { recordedAt } from '../fixtures/forecast';

/**
 * The picture contract SCREEN-2 asks a person to look at. It renders the screen the application
 * ships, at the four recorded sets, and draws the tree that came back. Nothing here restates the
 * layout, so a change to the screen changes the picture.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:home-picture`.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const output = join(repositoryRoot, 'brand', 'screens', 'home-screen.png');

const browsers = [
  process.env.EMI_BROWSER,
  '/opt/playwright/chromium_headless_shell-1234/chrome-linux/headless_shell',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function browser(): string {
  const found = browsers.find((path) => path !== undefined && existsSync(path));

  if (found === undefined) {
    throw new Error(
      'No browser to draw with. Set EMI_BROWSER to a Chromium or Chrome binary and run this again.',
    );
  }

  return found;
}

/** The day of the cycle each screen is drawn on, and the length she gave at the first run. */
const theDaySheOpensIt = 8;
const sheSaidHerCycleRuns = 31;

const theCaveat = [
  'Rendered from the tree the home screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. No screen names a font family yet, so the browser uses its own',
  'face where the phone would use the system face. Reproduce with: npm run generate:home-picture.',
].join(' ');

interface Recorded {
  readonly title: string;
  readonly set: RecordedSet;
  /** Left out where she has recorded nothing at all, which draws no ring. */
  readonly recorded?: 'nothing';
}

const theFourSets: readonly Recorded[] = [
  { title: 'Her first day, nothing recorded', set: veryRegular, recorded: 'nothing' },
  { title: 'One cycle recorded, still learning', set: oneCycleComplete },
  { title: 'Six cycles of 28 days', set: veryRegular },
  { title: 'Six cycles, one of them 40 days', set: oneLongCycle },
  { title: 'Six cycles from 24 to 41 days', set: genuinelyIrregular },
  { title: 'The two cycles she has', set: twoCyclesExactly },
];

/** What the frame is captioned with: the day she is on, and the sentence the screen names. */
function noteFor(day: number | undefined, forecast: ForecastResult): string {
  if (day === undefined) {
    return 'Nothing recorded, so there is no ring and no forecast.';
  }

  return forecast.kind === 'forecast'
    ? `Day ${day}. ${rangeSentence(forecast.start)}.`
    : `Day ${day}. Emi is still learning.`;
}

async function drawn(recorded: Recorded): Promise<DrawnScreen> {
  const database =
    recorded.recorded === 'nothing'
      ? migratedDatabase()
      : daysLogged(daysOf(recorded.set), recordedAt);
  const cycles = listCycles(database);
  const open = cycles[cycles.length - 1];
  const forecast = forecastOf(cycles);
  const ring =
    open === undefined
      ? undefined
      : ringInputFor({
          cycles,
          records: recordedDays(database, readDay),
          today: addDays(open.startedOn, theDaySheOpensIt - 1),
          statedCycleLengthDays: sheSaidHerCycleRuns,
        });

  const view = await render(
    <HomeScreen
      cycleLengthDays={sheSaidHerCycleRuns}
      forecast={forecast}
      onExport={() => undefined}
      onHistory={() => undefined}
      onLogToday={() => undefined}
      onSettings={() => undefined}
      ring={ring}
    />,
  );
  // A copy, taken before the screen is torn down. The runner holds one screen at a time, so a tree
  // kept by reference is the tree of whatever was rendered last.
  const tree: unknown = JSON.parse(JSON.stringify(view.toJSON()));

  view.unmount();

  return {
    title: recorded.title,
    note: noteFor(ring === undefined ? undefined : theDaySheOpensIt, forecast),
    tree,
  };
}

/** Each screen is rendered in a case of its own, so the runner tears one down before it mounts the
 * next and no tree is read while another is still arriving. */
const screens: DrawnScreen[] = [];

describe('the home screen, drawn for somebody to look at', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  for (const recorded of theFourSets) {
    it(`renders the home screen from ${recorded.title.toLowerCase()}`, async () => {
      screens.push(await drawn(recorded));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theFourSets.length);

    const size = pageSize(screens.length);
    const directory = mkdtempSync(join(tmpdir(), 'emi-home-'));
    const page = join(directory, 'home.html');

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
    console.log(
      `drew ${screens.length} screens at ${size.width} by ${size.height}, into ${output} (${statSync(output).size} bytes)`,
    );
  });
});
