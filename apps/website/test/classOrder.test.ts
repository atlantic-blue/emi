import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

import { aComponentDrawingWith, asTheRepositoryFormatsIt, theClassesOf } from './formatter';
import { orderOfTheStylesheet, websiteWorkspace } from './stylesheet';

/**
 * The scenario in features/website proves a component of the site comes back in one order. These
 * are the rules it leaves out: where the formatter reads the theme from, that a second reading
 * moves nothing, and that a word the theme never heard of survives the sort rather than
 * disappearing in it.
 */

const repositoryRoot = resolve(websiteWorkspace, '..', '..');
const theSortingPlugin = 'prettier-plugin-tailwindcss';
const theStylesheetTheSiteServes = join(websiteWorkspace, 'app', 'globals.css');

/** Tailwind reads the theme, the token package behind it, and every file those two import. */
const longEnoughToCompile = 60_000;

type Configuration = {
  readonly plugins?: readonly string[];
  readonly tailwindStylesheet?: string;
};

function theConfigurationThisRepositoryCommits(): Configuration {
  return JSON.parse(
    readFileSync(join(repositoryRoot, '.prettierrc.json'), 'utf8'),
  ) as Configuration;
}

/** A path in the configuration is read against the directory the configuration sits in. */
function theFileNamed(named: string): string {
  return isAbsolute(named) ? named : resolve(repositoryRoot, named);
}

describe('the one order the classes of this site are written in', () => {
  it('comes from the stylesheet the site serves, which the formatter is pointed at', () => {
    const configuration = theConfigurationThisRepositoryCommits();

    expect(configuration.plugins ?? []).toContain(theSortingPlugin);
    expect(theFileNamed(configuration.tailwindStylesheet ?? '')).toBe(theStylesheetTheSiteServes);
    expect(existsSync(theStylesheetTheSiteServes)).toBe(true);
  });

  it(
    'puts a list in that order, and moves nothing on a second reading',
    async () => {
      const once = asTheRepositoryFormatsIt(
        aComponentDrawingWith('text-text bg-ground flex p-margin'),
      );
      const twice = asTheRepositoryFormatsIt(once);
      const classes = theClassesOf(once);

      expect(await orderOfTheStylesheet(classes)).toEqual(classes);
      expect(twice).toBe(once);
    },
    longEnoughToCompile,
  );

  it(
    'keeps a word the theme never heard of, and still places the words it knows',
    async () => {
      const typed = 'text-text emi-not-a-token p-margin flex bg-ground';
      const formatted = theClassesOf(asTheRepositoryFormatsIt(aComponentDrawingWith(typed)));
      const known = formatted.filter((word) => word !== 'emi-not-a-token');

      expect([...formatted].sort()).toEqual([...typed.split(' ')].sort());
      expect(await orderOfTheStylesheet(known)).toEqual(known);
      expect(known).not.toEqual(['text-text', 'p-margin', 'flex', 'bg-ground']);
    },
    longEnoughToCompile,
  );
});
