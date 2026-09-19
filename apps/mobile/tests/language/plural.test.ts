import { languages } from '../../src/language/language';
import { pluralCategories, pluralCategory, type PluralCategory } from '../../src/language/words';

/**
 * The plural rule, held to the standard on node.
 *
 * The rule is written out in the source because the phone's engine has no `Intl.PluralRules`. A
 * written copy of a standard drifts, so this tier reads the standard back off node, where the
 * constructor does exist, and holds every count Emi can reach to it.
 *
 * This file proves the rule is right. It proves nothing about whether the application can run it,
 * which is what `plural.hermes.test.ts` is for.
 */

/** Further than Emi counts. Six years of cycles is under a hundred, and days are under two thousand. */
const theCounts = Array.from({ length: 2001 }, (_unused, count) => count);

/** The counts that separate one language's rule from another's, named so a failure reads. */
const theTellingCounts = [0, 1, 2, 5, 11, 21, 22, 101];

function theStandard(language: string, count: number): PluralCategory {
  return new Intl.PluralRules(language).select(count) as PluralCategory;
}

describe('the plural rule says what the standard says', () => {
  it.each([...languages])('agrees with the standard for every count %s can reach', (language) => {
    const disagreed = theCounts
      .filter((count) => pluralCategory(language, count) !== theStandard(language, count))
      .map(
        (count) =>
          `${language} ${count}: the rule says ${pluralCategory(language, count)} and the standard says ${theStandard(language, count)}`,
      );

    expect(disagreed).toEqual([]);
    expect(theCounts).toHaveLength(2001);
  });

  it.each([...languages])(
    'agrees about a negative count too, which reads by its size',
    (language) => {
      const disagreed = [-1, -2, -5, -11, -21]
        .filter((count) => pluralCategory(language, count) !== theStandard(language, count))
        .map((count) => `${language} ${count}`);

      expect(disagreed).toEqual([]);
    },
  );

  it.each([...languages])(
    'calls a count with a fraction other, as the standard does',
    (language) => {
      for (const count of [0.5, 1.5, 2.5]) {
        expect(pluralCategory(language, count)).toBe('other');
        expect(theStandard(language, count)).toBe('other');
      }
    },
  );

  it('answers only a category the language writes a form for', () => {
    const outside = languages.flatMap((language) =>
      theCounts
        .map((count) => pluralCategory(language, count))
        .filter((category) => !(pluralCategories[language] as readonly string[]).includes(category))
        .map((category) => `${language} answers ${category}, and writes no form for it`),
    );

    expect(outside).toEqual([]);
  });

  describe('the counts that separate the rules', () => {
    it('gives English one for one and other for the rest', () => {
      expect(theTellingCounts.map((count) => pluralCategory('en', count))).toEqual([
        'other',
        'one',
        'other',
        'other',
        'other',
        'other',
        'other',
        'other',
      ]);
    });

    it('gives Spanish the same two', () => {
      expect(theTellingCounts.map((count) => pluralCategory('es', count))).toEqual(
        theTellingCounts.map((count) => pluralCategory('en', count)),
      );
    });

    it('gives Russian three, where eleven is many and a hundred and one is one', () => {
      expect(theTellingCounts.map((count) => pluralCategory('ru', count))).toEqual([
        'many',
        'one',
        'few',
        'many',
        'many',
        'one',
        'few',
        'one',
      ]);
    });
  });
});
