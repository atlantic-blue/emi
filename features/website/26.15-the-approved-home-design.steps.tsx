import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature(join(__dirname, '26.15-the-approved-home-design.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

const designDirectory = join(repositoryRoot, 'docs', 'design', 'website', 'home-v2');

const renderDirectory = join(designDirectory, 'render');

/** The hole a board leaves for a value, which the renderer fills before it writes the markup. */
const hole = '{{';

/** The two widths the design was drawn for: a desktop, and the phone most of her reading is on. */
const widths = [1280, 390];

/** Every file the render asks a browser to fetch: the faces in its styles, the pictures in its body. */
function filesNamedIn(markup: string): string[] {
  const named = [
    ...[...markup.matchAll(/url\("([^"]+)"\)/g)].map(([, file]) => file),
    ...[...markup.matchAll(/<img[^>]+src="([^"]+)"/g)].map(([, file]) => file),
  ].filter((file): file is string => file !== undefined);

  return [...new Set(named)].sort();
}

/** The first bytes of a Portable Network Graphics file, so a picture is read as a picture. */
function isAPicture(file: string): boolean {
  return readFileSync(file).subarray(1, 4).toString('latin1') === 'PNG';
}

defineFeature(feature, (test) => {
  test('the approved home design is in the repository', ({ given, then, and }) => {
    let markup = '';

    given('the operator approved the home board on the design canvas', () => {
      const boards = ['MainV2.dc.html', 'Header.dc.html', 'Footer.dc.html'].map((board) =>
        join(designDirectory, 'boards', board),
      );

      expect(boards.filter((board) => !existsSync(board))).toEqual([]);

      for (const board of boards) {
        expect(readFileSync(board, 'utf8')).toContain('<x-dc>');
      }
    });

    then('a session that cannot open the canvas reads the same design in the repository', () => {
      markup = readFileSync(join(renderDirectory, 'MainV2.html'), 'utf8');

      expect(markup).toContain('<!doctype html>');
      expect(markup.length).toBeGreaterThan(10_000);
    });

    and('the render carries no hole, so every machine draws the same page from it', () => {
      expect(markup).not.toContain(hole);
    });

    and('every face and every picture the render asks for sits beside it', () => {
      const named = filesNamedIn(markup);

      // A count rather than a list, so a face the canvas stops asking for fails this. The board
      // the operator drew last asks for seven: two cuts of the heading face, two of the text face,
      // one small label face, and the two cuts of the face the earlier board set its headings in,
      // which the bands the canvas imports still declare.
      expect(named.filter((file) => file.startsWith('fonts/'))).toHaveLength(7);
      expect(named.filter((file) => file.startsWith('assets/'))).toHaveLength(2);
      expect(named.filter((file) => !existsSync(join(renderDirectory, file)))).toEqual([]);
      expect(named.filter((file) => statSync(join(renderDirectory, file)).size === 0)).toEqual([]);
    });

    and('the reference pictures show that page at the width of a desktop and of a phone', () => {
      const pictures = widths.map((width) =>
        join(designDirectory, 'reference', `MainV2-${width}.png`),
      );

      expect(pictures.filter((picture) => !existsSync(picture))).toEqual([]);
      expect(pictures.filter((picture) => !isAPicture(picture))).toEqual([]);
    });

    and('a reader of the directory is told that the canvas is where the design changes', () => {
      const readme = readFileSync(
        join(repositoryRoot, 'docs', 'design', 'website', 'README.md'),
        'utf8',
      );

      expect(readme).toContain('canvas');
      expect(readme).toContain('SIL Open Font License');
    });
  });
});
