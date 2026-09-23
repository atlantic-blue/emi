import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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

/**
 * The file each comparison writes its name into. The check counts the lines against the picture
 * files on disk, so a picture that drew instead of comparing leaves the count short and the run
 * fails. Without the name set, nothing is written and a drawing stays a drawing.
 */
export const LEDGER_VARIABLE = 'EMI_PICTURE_LEDGER';

function recordTheComparison(name: string): void {
  const ledger = process.env.EMI_PICTURE_LEDGER;

  if (ledger !== undefined && ledger !== '') {
    appendFileSync(ledger, `${name}\n`, 'utf8');
  }
}

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
  /** The glass each screen is drawn on. Left out where an ordinary phone is the point. */
  readonly size?: PhoneSize;
}

/**
 * A page drawn from markup the caller holds rather than from a list of screens, which is how the
 * document she hands to a doctor is pictured: the markup there is the file the application writes.
 */
export interface DrawnPage {
  /** The file name both the markup and the image take, without an extension. */
  readonly name: string;
  readonly markup: string;
  readonly size: PhoneSize;
  /** The script that writes this picture, named in the message a stale picture prints. */
  readonly script: string;
  /** What the page holds, as the one line the run prints names it. */
  readonly holds: string;
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
  picture: { readonly name: string; readonly script: string },
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
function windowFor(count: number, caveat: string, phone?: PhoneSize): PhoneSize {
  const size = pageSize(count, phone);
  const CHARACTER = 6.6;
  const LINE = 18;
  const perLine = Math.floor((size.width - 80) / CHARACTER);
  const lines = Math.ceil(caveat.length / perLine);

  return { width: size.width, height: size.height + Math.max(0, lines - 1) * LINE };
}

/**
 * The page is drawn where it is committed rather than from a copy in a temporary directory, because
 * it declares the font files by a path of its own and a copy somewhere else cannot reach them.
 */
function drawPage(name: string, page: string, size: PhoneSize): number {
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
 * Draws the page, or says how it drifted. The page is drawn by default and compared when
 * `EMI_PICTURE_CHECK` is set, which is the mode the pipeline runs, because comparing needs no
 * browser and drawing does.
 *
 * Every picture in the repository comes through here, so each one writes its markup beside its
 * image and each one is read back. A picture that drew and never compared leaves the ledger short
 * and `npm run check:pictures` fails on the count.
 */
export function drawOrCheckPage(page: DrawnPage): PictureResult {
  const root = repositoryRoot();
  const file = join(root, markupPath(page.name));

  const asked = process.env.EMI_PICTURE_CHECK;

  if (asked !== undefined && asked !== '') {
    const committed = existsSync(file) ? readFileSync(file, 'utf8') : null;
    const problems = driftProblems(page, committed, page.markup);

    recordTheComparison(page.name);

    return {
      markup: markupPath(page.name),
      picture: picturePath(page.name),
      characters: page.markup.length,
      bytes: null,
      said:
        problems.length > 0
          ? `${markupPath(page.name)} is not what ${page.holds} draws now`
          : `${markupPath(page.name)} is what ${page.holds} draws now, ` +
            `${page.markup.length} characters, and no picture was drawn`,
      problems,
    };
  }

  writeFileSync(file, page.markup, 'utf8');

  const bytes = drawPage(page.name, file, page.size);

  return {
    markup: markupPath(page.name),
    picture: picturePath(page.name),
    characters: page.markup.length,
    bytes,
    said:
      `drew ${page.holds} into ${picturePath(page.name)} (${bytes} bytes), ` +
      `from ${markupPath(page.name)} (${page.markup.length} characters)`,
    problems: [],
  };
}

/** The same, for a picture made of screens, which is all of them but the export document. */
export function drawOrCheck(picture: Picture): PictureResult {
  return drawOrCheckPage({
    name: picture.name,
    markup: screenDocument(picture.screens, picture.caveat, picture.size),
    size: windowFor(picture.screens.length, picture.caveat, picture.size),
    script: picture.script,
    holds: `the ${picture.screens.length} screen(s)`,
  });
}
