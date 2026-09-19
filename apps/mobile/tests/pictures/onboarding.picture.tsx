import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { render } from '@testing-library/react-native';

import { CycleLength } from '../../src/features/onboarding/CycleLength';
import { LastPeriod } from '../../src/features/onboarding/LastPeriod';
import { WhatEmiIs } from '../../src/features/onboarding/WhatEmiIs';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { pageSize, screenDocument } from '../../../../brand/screens/asHtml';

/**
 * The three screens of the first run, drawn for somebody to look at. They are the first thing she
 * sees of Emi, so the thing worth checking here is whether they look like one product.
 *
 * It is not part of the suite. The file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:onboarding-picture`.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const output = join(repositoryRoot, 'brand', 'screens', 'onboarding.png');

/** Midday, and away from any summer time change, so the day list reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

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
  'Rendered from the trees the three first run screens produced under the test runner, at 390 by',
  '844 points, and not captured from a phone. The step label and the number name the monospaced',
  'face, which no screen loads yet, so both fall back here and on a phone. Reproduce with:',
  'npm run generate:onboarding-picture.',
].join(' ');

interface Screen {
  readonly title: string;
  readonly note: string;
  readonly element: React.ReactElement;
}

const theScreens: readonly Screen[] = [
  {
    title: 'One of three',
    note: 'What Emi is, and what it will not do. She is asked for nothing here.',
    element: <WhatEmiIs onContinue={() => undefined} />,
  },
  {
    title: 'Two of three',
    note: 'She picks the day her last period started from the month she is in. The eleventh is\n      chosen, and the days after today take no press.',
    element: (
      <LastPeriod
        chosen="2026-05-11"
        now={whenSheOpensIt}
        onChoose={() => undefined}
        onContinue={() => undefined}
      />
    ),
  },
  {
    title: 'Three of three',
    note: 'The last answer she gives, and the one the first forecast is made from.',
    element: (
      <CycleLength
        days={defaultCycleLengthDays}
        onChange={() => undefined}
        onDone={() => undefined}
      />
    ),
  },
];

async function drawn(screen: Screen): Promise<DrawnScreen> {
  const view = await render(screen.element);
  const tree: unknown = JSON.parse(JSON.stringify(view.toJSON()));

  await view.unmount();

  return { title: screen.title, note: screen.note, tree };
}

const drawnScreens: DrawnScreen[] = [];

describe('the first run, drawn for somebody to look at', () => {
  for (const screen of theScreens) {
    it(`renders ${screen.title.toLowerCase()}`, async () => {
      drawnScreens.push(await drawn(screen));
    });
  }

  it('draws them into one picture', () => {
    expect(drawnScreens).toHaveLength(theScreens.length);

    const size = pageSize(drawnScreens.length);
    const directory = mkdtempSync(join(tmpdir(), 'emi-onboarding-'));
    const page = join(directory, 'onboarding.html');

    writeFileSync(page, screenDocument(drawnScreens, theCaveat), 'utf8');

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
      `drew ${drawnScreens.length} screens into ${output} (${statSync(output).size} bytes)`,
    );
  });
});
