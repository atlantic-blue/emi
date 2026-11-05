import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { asPlaywrightReadsIt } from './theConfiguration';

/**
 * The approved design of the support page, as the repository holds it.
 *
 * A session cannot open the design canvas, so the board, its render and its reference pictures are
 * committed here and the page is built from them. Two things have to hold for that to be worth
 * anything. The render must be finished, because a hole the renderer left behind draws as the five
 * characters of its own name. And every face and every picture the render asks for must sit beside
 * it, because a browser that cannot find a face falls back to another one, and the page then
 * measures differently on the next machine that opens it.
 *
 * The three other boards of the site are read the same way, in `designReference.test.ts`, in
 * `theProtectionDesign.test.ts` and in `thePrivacyPolicyDesign.test.ts`. The four are kept apart
 * rather than joined, because each one names the files of its own board and a joined reader would
 * pass while holding only one of them.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..');

const designDirectory = join('docs', 'design', 'website', 'support');

const renderDirectory = join(repositoryRoot, designDirectory, 'render');

const theRender = join(renderDirectory, 'Support.html');

/** The hole a board leaves for a value, which the renderer fills before it writes the markup. */
const hole = '{{';

/** Every file the render asks a browser to fetch: the faces in its styles, the pictures in its body. */
function filesNamedIn(markup: string): string[] {
  const named = [
    ...[...markup.matchAll(/url\("([^"]+)"\)/g)].map(([, file]) => file),
    ...[...markup.matchAll(/<img[^>]+src="([^"]+)"/g)].map(([, file]) => file),
  ].filter((file): file is string => file !== undefined);

  return [...new Set(named)].sort();
}

function theMarkup(): string {
  return readFileSync(theRender, 'utf8');
}

describe('the approved design of the support page', () => {
  it('holds the board the operator approved, its render and a picture at each width', () => {
    const held = [
      join('boards', 'Support.dc.html'),
      join('boards', 'Support.tablet.dc.html'),
      join('boards', 'Support.phone.dc.html'),
      join('boards', 'Header.dc.html'),
      join('boards', 'Footer.dc.html'),
      join('render', 'Support.html'),
      join('render-board.ts'),
      join('reference', 'Support-1280.png'),
      join('reference', 'Support-834.png'),
      join('reference', 'Support-390.png'),
    ];

    const absent = held.filter((file) => !existsSync(join(repositoryRoot, designDirectory, file)));

    expect(absent).toEqual([]);
  });

  it('holds a picture at each width the browser suite reads the page at', () => {
    const drawnAt = readdirSync(join(repositoryRoot, designDirectory, 'reference'))
      .map((file) => Number(/Support-(\d+)\.png/.exec(file)?.[1]))
      .filter((width) => Number.isFinite(width))
      .sort((one, other) => one - other);

    expect(drawnAt).toEqual([...asPlaywrightReadsIt().widths]);
  });

  it('left no hole unfilled in the render, so a browser draws a page and not a name', () => {
    expect(theMarkup()).not.toContain(hole);
  });

  /**
   * The board draws the line that says nothing matched, because the renderer was given the one
   * value that band is drawn by. The page draws it only once a reader has typed something that
   * matches no question, which is why the comparison with the board leaves that band out.
   */
  it('draws the line nothing matched, which the page draws only once she has typed', () => {
    expect(theMarkup()).toContain('Nothing found.');
  });

  it('keeps every face and every picture the render names beside it', () => {
    const named = filesNamedIn(theMarkup());
    const absent = named.filter((file) => !existsSync(join(renderDirectory, file)));

    expect(absent).toEqual([]);
  });

  it('names the six faces and the one drawing, so a shorter list is a reader that stopped early', () => {
    expect(filesNamedIn(theMarkup())).toEqual([
      'assets/2f3b95d653826b5ca02acab62e8534de.svg',
      'fonts/Inter-400.woff2',
      'fonts/Inter-600.woff2',
      'fonts/Newsreader16pt-Medium.ttf',
      'fonts/Newsreader16pt-Regular.ttf',
      'fonts/PlusJakartaSans-Regular.ttf',
      'fonts/PlusJakartaSans-SemiBold.ttf',
    ]);
  });
});
