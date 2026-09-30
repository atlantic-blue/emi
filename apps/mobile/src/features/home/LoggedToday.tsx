import type { ReactNode } from 'react';

/**
 * The row under the phase line that reads back what she marked today.
 *
 * Nothing on the screen she opens says it yet, so the second press of story 3 lands somewhere that
 * does not show what it just recorded.
 */

export const loggedTodayTestID = 'home-logged-today';
export const loggedTodayLeadTestID = 'home-logged-today-lead';
export const loggedTodayLineTestID = 'home-logged-today-line';

interface Props {
  /** What she marked today, already in her own words. */
  readonly marked: string;
  /** The way back into the log, on the groups, which is where the drawing sends this row. */
  readonly onPress: () => void;
}

export function LoggedToday(_props: Props): ReactNode {
  return null;
}
