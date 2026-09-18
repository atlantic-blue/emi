import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import '../jsx/register.ts';

const { writeSheet } = await import('./sheetFile.ts');
const { picturePath, sheetPage, sheetPath } = await import('./sheet.tsx');

const root = resolve(import.meta.dirname, '..', '..');
const page = join(root, sheetPath);
const picture = join(root, picturePath);

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

const characters = writeSheet(root);

// The page is drawn where it is committed, so the fonts and the drawings resolve through the same
// relative paths a person opening the committed file gets.
//
// The browser hangs now and then on a page this tall, at no particular height: 3200 drew in a
// second and 3300 was still going a minute later. So each attempt is given a deadline and tried
// again rather than waited on.
const ATTEMPT_SECONDS = 60;
const ATTEMPTS = 4;

function draw(): string | null {
  const run = spawnSync(
    browser(),
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      `--screenshot=${picture}`,
      `--window-size=${sheetPage.width},${sheetPage.height}`,
      pathToFileURL(page).href,
    ],
    { encoding: 'utf8', killSignal: 'SIGKILL', timeout: ATTEMPT_SECONDS * 1000 },
  );

  if (run.status === 0 && existsSync(picture)) {
    return null;
  }

  return run.signal === 'SIGKILL'
    ? `the browser was still drawing after ${ATTEMPT_SECONDS} seconds`
    : `the browser drew nothing: ${run.stderr ?? ''}`;
}

const failures: string[] = [];

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  rmSync(picture, { force: true });
  const failure = draw();

  if (failure === null) {
    break;
  }

  failures.push(`attempt ${attempt}: ${failure}`);

  if (attempt === ATTEMPTS) {
    throw new Error(failures.join('\n'));
  }
}

process.stdout.write(
  `wrote ${sheetPath} from the tokens, ${characters} characters, and drew ${picturePath} at ` +
    `${sheetPage.width} by ${sheetPage.height} (${statSync(picture).size} bytes).\n`,
);

export {};
