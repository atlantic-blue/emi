/**
 * The pattern the address asks the Insights screen to arrive at, and the name it travels under.
 *
 * She reaches Insights from a card on the screen she opens, so the symptom she pressed travels in
 * the address rather than in a store. A woman who pressed the Insights column of the dock asks for
 * no pattern and the screen marks none.
 */

/** The name the address carries the pattern under, which is the slug of that symptom. */
export const patternParameter = 'pattern';

const aSlug = /^[a-z][a-z-]*$/;

/**
 * The pattern the address named, and nothing at all where it named none or named something that is
 * not a slug. An address is typed by anybody, so an unreadable name marks no pattern rather than
 * raising, and the screen draws every row it would have drawn.
 */
export function thePatternAskedFor(asked: string | string[] | undefined): string | undefined {
  const named = Array.isArray(asked) ? asked[0] : asked;

  return named !== undefined && aSlug.test(named) ? named : undefined;
}
