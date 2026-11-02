import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { websiteFontCuts, websiteFontFile, websiteFontsRoot } from '@emi/tokens';

import { asPlaywrightReadsIt } from './theConfiguration';

/**
 * The approved design of the home page, as the repository holds it.
 *
 * A session cannot open the design canvas, so the board, its render and its reference pictures are
 * committed here and the later steps build the page from them. Two things have to hold for that to
 * be worth anything. The render must be finished, because a hole the renderer left behind draws as
 * the five characters of its own name. And every face and every picture the render asks for must
 * sit beside it, because a browser that cannot find a face falls back to another one, and the page
 * then measures differently on the next machine that opens it.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..');

const designDirectory = join('docs', 'design', 'website', 'home-v2');

const renderDirectory = join(repositoryRoot, designDirectory, 'render');

const theRender = join(renderDirectory, 'MainV2.html');

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

describe('the approved home design, in the repository', () => {
  it('holds the board the operator approved, its render and a picture at each width', () => {
    const held = [
      join('boards', 'MainV2.dc.html'),
      join('boards', 'MainV2.tablet.dc.html'),
      join('boards', 'MainV2.phone.dc.html'),
      join('boards', 'Header.dc.html'),
      join('boards', 'Footer.dc.html'),
      join('boards', 'ds', 'emi', 'tokens.json'),
      join('render', 'MainV2.html'),
      join('render-board.ts'),
      join('reference', 'MainV2-1280.png'),
      join('reference', 'MainV2-834.png'),
      join('reference', 'MainV2-390.png'),
    ];

    const absent = held.filter((file) => !existsSync(join(repositoryRoot, designDirectory, file)));

    expect(absent).toEqual([]);
  });

  it('holds a picture at each width the browser suite reads the page at', () => {
    const drawnAt = readdirSync(join(repositoryRoot, designDirectory, 'reference'))
      .map((file) => Number(/MainV2-(\d+)\.png/.exec(file)?.[1]))
      .filter((width) => Number.isFinite(width))
      .sort((one, other) => one - other);

    expect(drawnAt).toEqual([...asPlaywrightReadsIt().widths]);
  });

  it('says where the design changes, so nobody edits the render by hand', () => {
    const readme = join(repositoryRoot, 'docs', 'design', 'website', 'README.md');

    expect(existsSync(readme)).toBe(true);
    expect(readFileSync(readme, 'utf8')).toContain('SIL Open Font License');
  });

  it('left no hole unfilled in the render, so a browser draws a page and not a name', () => {
    expect(theMarkup()).not.toContain(hole);
  });

  it('keeps every face and every picture the render names beside it', () => {
    const named = filesNamedIn(theMarkup());
    const absent = named.filter((file) => !existsSync(join(renderDirectory, file)));

    expect(absent).toEqual([]);
  });

  it('names the seven faces and the two pictures, so a shorter list is a reader that stopped early', () => {
    expect(filesNamedIn(theMarkup())).toEqual([
      'assets/2f3b95d653826b5ca02acab62e8534de.svg',
      'assets/797e3d46d2df35dd822032622f5dc2e5.png',
      'fonts/Inter-400.woff2',
      'fonts/Inter-600.woff2',
      'fonts/JetBrainsMono-Medium.ttf',
      'fonts/Newsreader16pt-Medium.ttf',
      'fonts/Newsreader16pt-Regular.ttf',
      'fonts/PlusJakartaSans-Regular.ttf',
      'fonts/PlusJakartaSans-SemiBold.ttf',
    ]);
  });

  /**
   * The board asks for the heading face by the family a machine may already hold, and the site has
   * to serve the very file the board drew with. A second release of one family measures differently,
   * so the two files are read byte for byte rather than by name.
   */
  it('serves the board’s own heading cuts, byte for byte, so the letters measure the same', () => {
    for (const cut of websiteFontCuts.display) {
      const file = websiteFontFile(cut);
      const beside = readFileSync(join(renderDirectory, 'fonts', file));
      const served = readFileSync(join(repositoryRoot, websiteFontsRoot, file));

      expect(served.equals(beside)).toBe(true);
    }
  });

  it('serves no face the board stopped asking for', () => {
    const served = readdirSync(join(repositoryRoot, websiteFontsRoot));

    expect(served.filter((file) => file.startsWith('Newsreader'))).toEqual([]);
  });
});
