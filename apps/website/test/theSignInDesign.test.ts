import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { asPlaywrightReadsIt } from './theConfiguration';

/**
 * The approved design of the sign in page, as the repository holds it.
 *
 * A session cannot open the design canvas, so the three boards, their renders and their reference
 * pictures are committed here and the pages are built from them. Two things have to hold for that
 * to be worth anything. Each render must be finished, because a hole the renderer left behind
 * draws as the five characters of its own name. And every face and every picture a render asks
 * for must sit beside it, because a browser that cannot find a face falls back to another one, and
 * the page then measures differently on the next machine that opens it.
 *
 * Three boards rather than one. `SignIn` is the page she arrives on, `SignInCode` is the same page
 * after she has pressed "Send code", and `Profile` is where the code leaves her. The first two are
 * one page of the site in two states, so they are read together here.
 *
 * The other four boards of the site are read the same way, in `designReference.test.ts`, in
 * `theProtectionDesign.test.ts`, in `thePrivacyPolicyDesign.test.ts` and in
 * `theSupportDesign.test.ts`. They are kept apart rather than joined, because each one names the
 * files of its own board and a joined reader would pass while holding only one of them.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..');

const designDirectory = join('docs', 'design', 'website', 'sign-in');

const renderDirectory = join(repositoryRoot, designDirectory, 'render');

/** The three boards of this design, each at its own name. */
const theBoards = ['SignIn', 'SignInCode', 'Profile'] as const;

/** The hole a board leaves for a value, which the renderer fills before it writes the markup. */
const hole = '{{';

/** Every file a render asks a browser to fetch: the faces in its styles, the pictures in its body. */
function filesNamedIn(markup: string): string[] {
  const named = [
    ...[...markup.matchAll(/url\("([^"]+)"\)/g)].map(([, file]) => file),
    ...[...markup.matchAll(/<img[^>]+src="([^"]+)"/g)].map(([, file]) => file),
  ].filter((file): file is string => file !== undefined);

  return [...new Set(named)].sort();
}

function theMarkupOf(board: string): string {
  return readFileSync(join(renderDirectory, `${board}.html`), 'utf8');
}

describe('the approved design of the sign in page', () => {
  it('holds the three boards the operator approved, their renders and a picture at each width', () => {
    const held = [
      join('boards', 'Header.dc.html'),
      join('boards', 'Footer.dc.html'),
      join('render-board.ts'),
      ...theBoards.flatMap((board) => [
        join('boards', `${board}.dc.html`),
        join('render', `${board}.html`),
        join('reference', `${board}-1280.png`),
        join('reference', `${board}-834.png`),
        join('reference', `${board}-390.png`),
      ]),
    ];

    const absent = held.filter((file) => !existsSync(join(repositoryRoot, designDirectory, file)));

    expect(absent).toEqual([]);
  });

  it.each(theBoards)(
    'holds a picture of %s at each width the browser suite reads it at',
    (board) => {
      const drawnAt = readdirSync(join(repositoryRoot, designDirectory, 'reference'))
        .map((file) => Number(new RegExp(`^${board}-(\\d+)\\.png$`).exec(file)?.[1]))
        .filter((width) => Number.isFinite(width))
        .sort((one, other) => one - other);

      expect(drawnAt).toEqual([...asPlaywrightReadsIt().widths]);
    },
  );

  it.each(theBoards)(
    'left no hole unfilled in %s, so a browser draws a page and not a name',
    (board) => {
      expect(theMarkupOf(board)).not.toContain(hole);
    },
  );

  it('draws the three ways in the page holds back, so the board is the whole offer', () => {
    const markup = theMarkupOf('SignIn');

    expect(markup).toContain('Sign in with Apple');
    expect(markup).toContain('Sign in with Google');
    expect(markup).toContain('Log in with Telegram');
  });

  it('writes the address a code went to into the second board, which the page fills from her', () => {
    expect(theMarkupOf('SignInCode')).toContain('iuliia@example.com');
  });

  it('draws the four sections of the account the page does not build yet', () => {
    const markup = theMarkupOf('Profile');

    expect(markup).toContain('SUBSCRIPTION');
    expect(markup).toContain('SIGN IN');
    expect(markup).toContain('PREFERENCES');
    expect(markup).toContain('DATA AND PRIVACY');
  });

  it.each(theBoards)('keeps every face and every picture %s names beside it', (board) => {
    const named = filesNamedIn(theMarkupOf(board));
    const absent = named.filter((file) => !existsSync(join(renderDirectory, file)));

    expect(absent).toEqual([]);
  });

  it('names the six faces and the one drawing, so a shorter list is a reader that stopped early', () => {
    expect(filesNamedIn(theMarkupOf('SignIn'))).toEqual([
      'assets/2f3b95d653826b5ca02acab62e8534de.svg',
      'fonts/Inter-400.woff2',
      'fonts/Inter-600.woff2',
      'fonts/Newsreader16pt-Medium.ttf',
      'fonts/Newsreader16pt-Regular.ttf',
      'fonts/PlusJakartaSans-Regular.ttf',
      'fonts/PlusJakartaSans-SemiBold.ttf',
    ]);
  });

  it('names the face the code is set in as well, which only the two later boards draw', () => {
    expect(filesNamedIn(theMarkupOf('SignInCode'))).toContain('fonts/JetBrainsMono-Medium.ttf');
    expect(filesNamedIn(theMarkupOf('SignIn'))).not.toContain('fonts/JetBrainsMono-Medium.ttf');
  });
});
