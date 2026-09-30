import { CycleError } from '@emi/cycle';

import { startOfMonth } from '../onboarding/days';

/**
 * The month the address asks for, and the name it carries the day under.
 *
 * She reaches the month from a day of her week, and a week can cross a month, so the day she
 * pressed travels in the address and the month is read out of it here. It travels in the address
 * rather than in a store, so the month she lands on is decided by the day she pressed.
 */

/** The name the address carries the day under. */
export const dayParameter = 'day';

/**
 * The month the day in the address falls in, named by its first, and nothing at all where the
 * address names no day or names something that is not a day. An address is typed by anybody, so an
 * unreadable day is read as no day rather than as an error, and the month opens on today.
 */
export function theMonthAskedFor(asked: string | undefined): string | undefined {
  if (asked === undefined || asked === '') {
    return undefined;
  }

  try {
    return startOfMonth(asked);
  } catch (thrown) {
    if (thrown instanceof CycleError) {
      return undefined;
    }
    throw thrown;
  }
}
