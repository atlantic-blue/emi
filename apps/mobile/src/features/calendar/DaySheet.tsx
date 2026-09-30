import type { ReactNode } from 'react';

/**
 * The sheet at the foot of the month. It names the day she pressed and opens that day.
 *
 * Nothing is drawn here yet. The identifiers below are what the tests of this step hold the screen
 * to, and the row that answers for them arrives with the code.
 */

export const daySheetTestID = 'calendar-day-sheet';
export const daySheetLeadTestID = 'calendar-day-sheet-lead';
export const daySheetLineTestID = 'calendar-day-sheet-line';

interface Props {
  /** The date in words, which is the day she pressed. */
  readonly lead: string;
  /** The day of her cycle, the phase, and what she logged. Nothing where none of the three is known. */
  readonly line?: string;
  readonly onPress: () => void;
}

export function DaySheet(_props: Props): ReactNode {
  return null;
}
