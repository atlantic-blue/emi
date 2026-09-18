import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import '../jsx/register.ts';

const here = import.meta.dirname;
const repositoryRoot = resolve(here, '..', '..');
const output = join(here, 'specimen.png');

// The picture needs a browser that can load a font from the file system. The path is asked for
// rather than assumed, because a machine keeps its browser wherever it keeps it.
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

async function main(): Promise<void> {
  const { specimenDocument, specimenPage } = await import('./specimen.tsx');
  const { fontsRoot } = await import('@emi/tokens');

  const fontsBase = `${pathToFileURL(join(repositoryRoot, fontsRoot)).href}/`;
  const directory = mkdtempSync(join(tmpdir(), 'emi-specimen-'));
  const page = join(directory, 'specimen.html');

  writeFileSync(page, specimenDocument(fontsBase), 'utf8');

  const run = spawnSync(
    browser(),
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      `--screenshot=${output}`,
      `--window-size=${specimenPage.width},${specimenPage.height}`,
      pathToFileURL(page).href,
    ],
    { encoding: 'utf8' },
  );

  rmSync(directory, { force: true, recursive: true });

  if (run.status !== 0 || !existsSync(output)) {
    throw new Error(`the browser drew nothing: ${run.stderr ?? ''}`);
  }

  console.log(
    `drew the specimen at ${specimenPage.width} by ${specimenPage.height}, into ${output} (${statSync(output).size} bytes)`,
  );
}

await main();
