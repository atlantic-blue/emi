/**
 * The cycle the address asks the Insights screen to arrive at, and the name it travels under.
 *
 * She reaches Insights from a strip on the screen she opens, so the cycle she pressed travels in
 * the address rather than in a store. A woman who pressed the Insights column of the dock asks for
 * no cycle and the screen marks none.
 */

/** The name the address carries the cycle under, which is the day that cycle began. */
export const cycleParameter = 'cycle';

const aDay = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The cycle the address named, and nothing at all where it named none or named something that is
 * not a day. An address is typed by anybody, so an unreadable day marks no cycle rather than
 * raising, and the screen draws every row it would have drawn.
 */
export function theCycleAskedFor(asked: string | string[] | undefined): string | undefined {
  const named = Array.isArray(asked) ? asked[0] : asked;

  return named !== undefined && aDay.test(named) ? named : undefined;
}
