import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature(join(__dirname, '26.16-the-trailing-slash.feature'));

const websiteWorkspace = resolve(__dirname, '..', '..', 'apps', 'website');

const read = (...where: readonly string[]): string =>
  readFileSync(join(websiteWorkspace, ...where), 'utf8');

/** One row of an Examples table, each cell under the heading it sits beneath. */
type Row = Readonly<Record<string, string>>;

const cellsOf = (line: string): string[] =>
  line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());

/**
 * Every Examples row of a feature file, keyed by heading. A table is a run of lines that open with
 * a bar, and the first line of a run names the columns.
 */
function rowsOf(gherkin: string): Row[] {
  const rows: Row[] = [];
  let headings: string[] = [];

  for (const line of gherkin.split('\n')) {
    if (!line.trim().startsWith('|')) {
      headings = [];
      continue;
    }

    const cells = cellsOf(line);

    if (headings.length === 0) {
      headings = cells;
      continue;
    }

    rows.push(Object.fromEntries(headings.map((heading, at) => [heading, cells[at] ?? ''])));
  }

  return rows;
}

/** The sentences of a feature file, in the order she reads them. */
const sentencesOf = (gherkin: string): string[] =>
  gherkin
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^(Given|When|Then|And) /.test(line));

/** The address a sentence is about, which it carries in quotes. */
function addressIn(sentence: string): string {
  const found = /"([^"]+)"/.exec(sentence);

  if (found === null) {
    throw new Error(`no address is quoted in "${sentence}"`);
  }

  return found[1] as string;
}

/** The columns that say where the site put her, as against the column that says what she typed. */
const whereSheEndsUp = ['moved to', 'landed on'];

/** The words of the page nobody meant to open, and the press that takes her off it. */
const theEmiPage = [
  'which this site does not have',
  'there is no such page',
  'the page does not exist',
  'the press back to Emi',
  'inside the screen she holds',
];

defineFeature(feature, (test) => {
  test('the live checks expect the slash at the end of each address', ({ given, then, and }) => {
    let theOneAddress = '';
    let thePageNobodyMeantToOpen = '';

    given('the sentences the deploy reads against the live site', () => {
      theOneAddress = read('e2e', 'live', 'theOneAddress.feature');
      thePageNobodyMeantToOpen = read('e2e', 'features', 'notFound.feature');
    });

    then('every address it expects her to land on ends in a slash', () => {
      const expected = rowsOf(theOneAddress).flatMap((row) =>
        whereSheEndsUp.filter((column) => column in row).map((column) => row[column] as string),
      );

      // A read that found no table at all would agree with every rule under it.
      expect(expected.length).toBeGreaterThan(4);
      expect(expected.filter((address) => !address.endsWith('/'))).toEqual([]);
    });

    and(
      'she still types the address without one, so the two moves are read rather than assumed',
      () => {
        const walks = rowsOf(theOneAddress).filter((row) => 'landed on' in row);
        const typedWithoutOne = walks.filter((row) => !(row.asked ?? '').endsWith('/'));

        expect(typedWithoutOne.length).toBeGreaterThan(0);

        for (const walk of typedWithoutOne) {
          const asked = walk.asked as string;

          // Wrong in two ways, so the walk reads both moves: the name comes off at the edge, and
          // the framework adds the slash.
          expect(asked).toContain('www.');
          expect(walk['landed on']).toBe(`${asked.replace('www.', '')}/`);
        }
      },
    );

    and('the page she reaches by accident is read on the address the move sends her to', () => {
      const sentences = sentencesOf(thePageNobodyMeantToOpen);
      const opened = addressIn(sentences[0] as string);

      // An address the site may hold one day takes this scenario red on the day that page lands,
      // so she opens one no page of Emi will ever answer.
      expect(opened).toBe('/nothing');
      expect(opened.endsWith('/')).toBe(false);

      const namesTheMove = sentences.findIndex((sentence) => sentence.includes(`"${opened}/"`));
      const readsThePage = sentences.findIndex((sentence) =>
        sentence.includes('the page does not exist'),
      );

      expect(namesTheMove).toBeGreaterThan(0);
      expect(readsThePage).toBeGreaterThan(namesTheMove);
    });

    and('what she reads there is still the Emi page, with her press back to it', () => {
      for (const words of theEmiPage) {
        expect(thePageNobodyMeantToOpen).toContain(words);
      }
    });
  });
});
