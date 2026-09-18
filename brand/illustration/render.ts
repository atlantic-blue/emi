#!/usr/bin/env -S node --experimental-strip-types
/**
 * Draws each piece into a picture beside it, so the pull request shows what the numbers make.
 * The soft edge is a blur, and a blur is the one thing a reader cannot check by reading the source.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PIECE_HEIGHT, PIECE_WIDTH, fileOf, pictureOf, pieces } from './pieces.ts';

const here = dirname(fileURLToPath(import.meta.url));

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

const drawWith = browser();

for (const piece of pieces) {
  const picture = join(here, pictureOf(piece));
  const run = spawnSync(
    drawWith,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--default-background-color=00000000',
      `--screenshot=${picture}`,
      `--window-size=${PIECE_WIDTH},${PIECE_HEIGHT}`,
      `file://${join(here, fileOf(piece))}`,
    ],
    { encoding: 'utf8' },
  );

  if (run.status !== 0 || !existsSync(picture)) {
    throw new Error(`the browser drew nothing for ${piece.name}: ${run.stderr ?? ''}`);
  }

  process.stdout.write(
    `${pictureOf(piece)} at ${PIECE_WIDTH} by ${PIECE_HEIGHT}, ${statSync(picture).size} bytes\n`,
  );
}
