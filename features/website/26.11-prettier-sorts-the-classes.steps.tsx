import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import {
  aComponentDrawingWith,
  asTheRepositoryFormatsIt,
  theClassesOf,
} from '../../apps/website/test/formatter';
import {
  orderOfTheStylesheet,
  quotedWordRuns,
  websiteWorkspace,
} from '../../apps/website/test/stylesheet';

const feature = loadFeature(join(__dirname, '26.11-prettier-sorts-the-classes.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

/** A colour, a gap, a corner and a size of Emi, beside two words Tailwind ships, in no order. */
const asSomebodyTypedIt =
  'text-text p-margin bg-ground flex rounded-xxl items-center text-headline-lg';

/** The same list with nothing in it but words out of the Emi theme. */
const onlyTheWordsEmiChose = 'text-text p-margin bg-ground rounded-xxl';

/** The directories a page of the site is built from. */
const whatThePagesAreBuiltFrom = ['app', 'components'];

function filesUnder(path: string): string[] {
  return statSync(path).isDirectory()
    ? readdirSync(path).flatMap((name) => filesUnder(join(path, name)))
    : [path];
}

function everyComponentTheSiteShips(): string[] {
  return whatThePagesAreBuiltFrom
    .flatMap((name) => filesUnder(join(websiteWorkspace, name)))
    .filter((file) => file.endsWith('.tsx'));
}

/**
 * A variant such as hover or motion-safe carries its own rule, and the stylesheet writes that rule
 * where its condition belongs rather than beside the plain ones. So the stylesheet states the
 * order of the plain words and says nothing about where a variant sits among them. A list that
 * carries one is left to the formatter.
 */
function carriesAVariant(words: readonly string[]): boolean {
  return words.some((word) => word.includes(':'));
}

/** Each class list in these files that the stylesheet knows every word of and did not order. */
async function theListsOutOfOrder(files: readonly string[]): Promise<string[]> {
  const written = files.flatMap((file) =>
    quotedWordRuns(readFileSync(file, 'utf8')).map((words) => ({ file, words })),
  );
  const order = await orderOfTheStylesheet([...new Set(written.flatMap(({ words }) => words))]);
  const known = new Set(order);

  return written
    .filter(({ words }) => words.every((word) => known.has(word)) && !carriesAVariant(words))
    .filter(
      ({ words }) => order.filter((name) => words.includes(name)).join(' ') !== words.join(' '),
    )
    .map(({ file, words }) => `${relative(repositoryRoot, file)}: ${words.join(' ')}`);
}

defineFeature(feature, (test) => {
  test('prettier sorts the classes of a website component', ({ given, when, then, and }) => {
    let typedByHand = '';
    let formatted = '';
    let emiWordsOnly = '';

    given('a component of the site whose classes are in the order somebody typed them', () => {
      typedByHand = aComponentDrawingWith(asSomebodyTypedIt);
      emiWordsOnly = aComponentDrawingWith(onlyTheWordsEmiChose);

      expect(theClassesOf(typedByHand)).toEqual(asSomebodyTypedIt.split(' '));
    });

    when('the formatter this repository runs reads that component', () => {
      formatted = asTheRepositoryFormatsIt(typedByHand);
      emiWordsOnly = asTheRepositoryFormatsIt(emiWordsOnly);
    });

    then('the classes come back in the order the stylesheet writes their rules', async () => {
      const classes = theClassesOf(formatted);

      expect(await orderOfTheStylesheet(classes)).toEqual(classes);
      expect(classes).not.toEqual(asSomebodyTypedIt.split(' '));
    });

    and('a list of only the words Emi chose comes back in that order too', async () => {
      const classes = theClassesOf(emiWordsOnly);

      expect(await orderOfTheStylesheet(classes)).toEqual(classes);
      expect(classes).not.toEqual(onlyTheWordsEmiChose.split(' '));
    });

    and('every word the component was given is still there', () => {
      expect([...theClassesOf(formatted)].sort()).toEqual([...asSomebodyTypedIt.split(' ')].sort());
    });

    and('every component the site ships is already in that order', async () => {
      const shipped = everyComponentTheSiteShips();

      expect(shipped.length).toBeGreaterThan(5);
      expect(await theListsOutOfOrder(shipped)).toEqual([]);
    });
  });
});
