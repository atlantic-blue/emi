import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { DrawnScreen, PhoneSize } from './asHtml';
import { pageSize, screenDocument } from './asHtml';

/**
 * A picture of the screens, and the check that it still matches the application.
 *
 * The check compares the markup and never the image. Two browsers draw one page into different
 * bytes, so a check on the bytes goes red on the machine rather than on the change. The markup
 * carries every word, size, colour and arc the component produced, so a screen that drifted from
 * its committed picture fails here and a screen that did not stays quiet.
 */

/** The name the pipeline sets to ask for a comparison instead of a drawing. */
export const CHECK_VARIABLE = 'EMI_PICTURE_CHECK';

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

export interface Picture {
  /** The file name both the markup and the image take, without an extension. */
  readonly name: string;
  readonly screens: readonly DrawnScreen[];
  readonly caveat: string;
  /** The script that writes this picture, named in the message a stale picture prints. */
  readonly script: string;
}

export interface PictureResult {
  readonly markup: string;
  readonly picture: string;
  readonly characters: number;
  /** The size of the image on disk, and null when the run only compared the markup. */
  readonly bytes: number | null;
  /** The one line the run prints, so a reader of a pipeline log sees that it did work. */
  readonly said: string;
  readonly problems: readonly string[];
}

export function repositoryRoot(): string {
  return resolve(__dirname, '..', '..');
}

function markupPath(name: string): string {
  return join('brand', 'screens', `${name}.html`);
}

function picturePath(name: string): string {
  return join('brand', 'screens', `${name}.png`);
}

/** Where the committed copy and the fresh markup first disagree, with the text either side of it. */
function around(text: string, at: number): string {
  return JSON.stringify(text.slice(Math.max(0, at - 40), at + 40));
}

export function driftProblems(
  picture: Picture,
  committed: string | null,
  generated: string,
): readonly string[] {
  const file = markupPath(picture.name);

  if (committed === null) {
    return [
      `${file} is missing, and the screens have ${generated.length} characters to write. Run npm run ${picture.script}.`,
    ];
  }

  if (committed === generated) {
    return [];
  }

  let at = 0;

  while (at < committed.length && at < generated.length && committed[at] === generated[at]) {
    at += 1;
  }

  return [
    `${file} is stale: the committed copy and the screens disagree at character ${at + 1}.`,
    `  committed: ${around(committed, at)}`,
    `  rendered:  ${around(generated, at)}`,
    `A screen changed, or somebody edited the markup by hand. Run npm run ${picture.script}, look at ${picturePath(picture.name)}, and commit both.`,
  ];
}

/**
 * The shared page size budgets one line for the caveat, which holds on a page of three screens and
 * not on a page of one: the same sentence wraps onto four lines at a third of the width, and the
 * last of them is drawn below the window and lost. The lines it wraps onto are added back here.
 */
function windowFor(count: number, caveat: string): PhoneSize {
  const size = pageSize(count);
  const CHARACTER = 6.6;
  const LINE = 18;
  const perLine = Math.floor((size.width - 80) / CHARACTER);
  const lines = Math.ceil(caveat.length / perLine);

  return { width: size.width, height: size.height + Math.max(0, lines - 1) * LINE };
}

function draw(name: string, page: string, count: number, caveat: string): number {
  const size = windowFor(count, caveat);
  const output = join(repositoryRoot(), picturePath(name));

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

  if (run.status !== 0 || !existsSync(output)) {
    throw new Error(`the browser drew nothing into ${output}: ${run.stderr ?? ''}`);
  }

  return statSync(output).size;
}

/**
 * Draws the picture, or says how it drifted. The picture is drawn by default and compared when
 * `EMI_PICTURE_CHECK` is set, which is the mode the pipeline runs, because comparing needs no
 * browser and drawing does.
 */
export function drawOrCheck(picture: Picture): PictureResult {
  const root = repositoryRoot();
  const markup = screenDocument(picture.screens, picture.caveat);
  const file = join(root, markupPath(picture.name));

  const asked = process.env.EMI_PICTURE_CHECK;

  if (asked !== undefined && asked !== '') {
    const committed = existsSync(file) ? readFileSync(file, 'utf8') : null;

    const problems = driftProblems(picture, committed, markup);

    return {
      markup: markupPath(picture.name),
      picture: picturePath(picture.name),
      characters: markup.length,
      bytes: null,
      said:
        problems.length > 0
          ? `${markupPath(picture.name)} is not what the ${picture.screens.length} screen(s) render now`
          : `${markupPath(picture.name)} is what the ${picture.screens.length} screen(s) render now, ` +
            `${markup.length} characters, and no picture was drawn`,
      problems,
    };
  }

  writeFileSync(file, markup, 'utf8');

  const directory = mkdtempSync(join(tmpdir(), `emi-${picture.name}-`));
  const page = join(directory, `${picture.name}.html`);

  writeFileSync(page, markup, 'utf8');

  try {
    const bytes = draw(picture.name, page, picture.screens.length, picture.caveat);

    return {
      markup: markupPath(picture.name),
      picture: picturePath(picture.name),
      characters: markup.length,
      bytes,
      said:
        `drew ${picture.screens.length} screen(s) into ${picturePath(picture.name)} (${bytes} bytes), ` +
        `from ${markupPath(picture.name)} (${markup.length} characters)`,
      problems: [],
    };
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}
