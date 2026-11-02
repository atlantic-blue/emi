import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { chromium } from 'playwright-core';

/**
 * Draws the share preview board into the picture the site serves.
 *
 * Run it by hand, with `npm run generate:share-preview`. The check job of the pipeline installs no
 * browser, so the picture is committed rather than drawn on every merge, the same way the icons
 * are. What the pipeline reads is the committed file: a test holds it to 1200 by 630, and the
 * scenario holds the two numbers in the tags to the two in the file.
 *
 * It has to run on Linux. The heading of the board asks for the faces of a Mac first and names
 * Inter after them, so a Mac draws the heading in SF Pro, which Emi has no licence to serve. On
 * Linux the three names in front of Inter resolve to nothing and Inter draws the heading.
 */

const here = import.meta.dirname;

const board = join(here, 'boards', 'SharePreview.dc.html');

const flattened = join(here, 'render', 'SharePreview.html');

const picture = join(
  here,
  '..',
  '..',
  '..',
  '..',
  'apps',
  'website',
  'public',
  'share-preview.png',
);

/** The board's own size, declared on the canvas and read back here so the two cannot disagree. */
const SIZE = { width: 1200, height: 630 };

/**
 * The one drawing the board asks for, by the name the canvas gave it. The canvas writes an
 * address of its own that no file system has, so the flattened page points at the copy beside it.
 */
const ASSETS: Readonly<Record<string, string>> = {
  '2f3b95d653826b5ca02acab62e8534de': '.svg',
};

const INTER = [
  '@font-face{font-family:"Inter";src:url("fonts/Inter-400.woff2");font-weight:400}',
  '@font-face{font-family:"Inter";src:url("fonts/Inter-600.woff2");font-weight:600}',
].join('\n');

/**
 * This board is one page of plain markup: no board inside it, no list, and no hole for a value.
 * So this reads the three parts it does have and nothing more. A board that gains any of those
 * three stops here rather than being drawn with the new part missing, because a picture that is
 * nearly the board is the one failure nobody sees.
 */
function flatten(source: string): string {
  const inner = source.slice(source.indexOf('<x-dc>') + '<x-dc>'.length, source.indexOf('</x-dc>'));
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(inner);
  const body = inner.replace(/<helmet>[\s\S]*?<\/helmet>/, '');

  for (const [part, named] of [
    ['<dc-import', 'a board inside it'],
    ['<sc-for', 'a list'],
    ['{{', 'a hole for a value'],
  ] as const) {
    if (body.includes(part)) {
      throw new Error(
        `the board now has ${named}, which this program does not draw: read docs/design/website/home-v2/render-board.ts, which does`,
      );
    }
  }

  const styles = (helmet === null ? '' : helmet[1])
    .replace(/<link[^>]*>/g, '')
    .replace(/<\/?style>/g, '')
    .replace(/url\("ds\/emi\/fonts\//g, 'url("fonts/');

  const page = body.replace(
    /\/_blob\/([0-9a-f]{32})/g,
    (whole, id: string) => `assets/${id}${ASSETS[id] ?? whole}`,
  );

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<title>SharePreview</title>',
    `<style>\n${INTER}\n${styles}\n</style>`,
    '</head>',
    `<body>\n${page}\n</body>`,
    '</html>',
    '',
  ].join('\n');
}

async function draw(page: string, to: string): Promise<void> {
  const browser = await chromium.launch({ executablePath: process.env.EMI_CHROME });

  try {
    const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1 });
    const tab = await context.newPage();

    await tab.goto(`file://${page}`);
    await tab.evaluate(async () => document.fonts.ready);
    await tab.screenshot({ path: to });
    await context.close();
  } finally {
    await browser.close();
  }
}

for (const font of ['PlusJakartaSans-Regular', 'JetBrainsMono-Medium']) {
  copyFileSync(
    join(here, 'boards', 'ds', 'emi', 'fonts', `${font}.ttf`),
    join(here, 'render', 'fonts', `${font}.ttf`),
  );
}

mkdirSync(dirname(flattened), { recursive: true });
writeFileSync(flattened, flatten(readFileSync(board, 'utf8')));
await draw(flattened, picture);

process.stdout.write(`drew ${picture} at ${SIZE.width} by ${SIZE.height}\n`);
