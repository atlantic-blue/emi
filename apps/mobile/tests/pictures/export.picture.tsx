import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';

import { logDay } from '../../src/features/cycle/rebuild';
import { everythingIn } from '../../src/features/export/everything';
import { readableFile } from '../../src/features/export/files';
import { chooseUnits } from '../../src/features/log/units';
import { migratedDatabase } from '../fixtures/cycleCache';
import { herVault } from '../fixtures/herVault';

/**
 * The document she can hand to a doctor, drawn as it opens. The markup is the file the application
 * writes, so the picture is the product rather than an illustration of it.
 *
 * The suite never picks it up. It is drawn on demand by npm run generate:export-picture.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const output = join(repositoryRoot, 'brand', 'screens', 'export-document.png');

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

const whenSheExported = new Date('2026-05-14T20:00:00.000Z');
const today = '2026-05-14';
const herCycleLengthDays = 28;
const herPeriodDays = 4;

const herPeriodStarts = [4, 3, 2, 1, 0].map((back) =>
  addDays(addDays(today, -13), -back * herCycleLengthDays),
);

const theFullDay = addDays(today, -5);

function herDays(): DayRecord[] {
  const bleeding = herPeriodStarts.flatMap((start) =>
    Array.from({ length: herPeriodDays }, (_unused, day) => ({
      day: addDays(start, day),
      flow: (day === 0 ? 'light' : 'medium') as DayRecord['flow'],
      recordedAt: `${addDays(start, day)}T08:00:00.000Z`,
    })),
  );

  return [
    ...bleeding,
    {
      day: theFullDay,
      flow: 'spotting',
      bleedingIsUnexpected: true,
      symptoms: ['cramps', 'headache'],
      moods: ['irritable'],
      energy: 2,
      temperatureCelsius: 36.7,
      weightKilograms: 63.2,
      note: 'Cramps started in the afternoon and the headache came with them.',
      recordedAt: `${theFullDay}T20:00:00.000Z`,
    },
  ];
}

describe('the document she can hand to a doctor', () => {
  it('draws it as it opens', () => {
    const database = migratedDatabase();
    const vault = herVault();

    for (const record of herDays()) {
      logDay(
        database,
        { day: record.day, payload: vault.seal(record), now: new Date(record.recordedAt) },
        vault.open,
      );
    }

    chooseUnits(database, { temperature: 'celsius', weight: 'kilograms' });

    const file = readableFile(everythingIn(database, vault, whenSheExported), whenSheExported);
    const directory = mkdtempSync(join(tmpdir(), 'emi-export-'));
    const page = join(directory, file.name);

    writeFileSync(page, file.text, 'utf8');

    const run = spawnSync(
      browser(),
      [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--hide-scrollbars',
        `--screenshot=${output}`,
        '--window-size=860,1400',
        pathToFileURL(page).href,
      ],
      { encoding: 'utf8' },
    );

    rmSync(directory, { force: true, recursive: true });

    expect(run.status).toBe(0);
    expect(existsSync(output)).toBe(true);
    console.log(`drew ${file.name} into ${output} (${statSync(output).size} bytes)`);
  });
});
