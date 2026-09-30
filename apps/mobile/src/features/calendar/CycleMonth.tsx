import type { ReactNode } from 'react';

import type { DayMark } from '../cycle/herWeek';

/**
 * The month grid, which every screen that shows a month draws. It is named here and drawn by the
 * step that builds it; nothing stands on it yet.
 */

export function dayTestID(day: string): string {
  return `day-${day}`;
}

export function cycleDayTestID(day: string): string {
  return `calendar-cycle-day-${day}`;
}

export function dateTestID(day: string): string {
  return `calendar-date-${day}`;
}

export const weekTestID = 'calendar-week';
export const emptyCellTestID = 'calendar-empty';

/** The seven boxes a week row sizes: the days it holds, and a box where the month has no day. */
export const weekCellTestIDs = new RegExp(`^(${dayTestID('\\d')}|${emptyCellTestID})`);

/** The tick the chosen day carries. It is the cue that survives a screen read in grey. */
export const chosenDayMarkTestID = 'calendar-chosen-mark';

/** One square of the month, as the screen drawing it asks for it. */
export interface MonthSquare {
  /** The day of her cycle, drawn above the date. Nothing where the screen counts no cycle. */
  readonly cycleDay?: number;
  /** What happened on that date, or what is expected on it. */
  readonly mark: DayMark;
  /** The day she picked, where the screen asks her to pick one. */
  readonly chosen?: boolean;
  /** A day the screen draws and will not take, which is dimmed rather than left out. */
  readonly outOfReach?: boolean;
  /** What a screen reader says about the square. */
  readonly label: string;
  /** Nothing where the square takes no press, and then it is read and never pressed. */
  readonly onPress?: () => void;
}

interface Props {
  /** What the grid is named on the glass, which each screen decides for itself. */
  readonly testID: string;
  /** The month drawn, named by any day in it. */
  readonly month: string;
  /** Drawn inside the grid above the columns, where a screen carries its own way to another month. */
  readonly heading?: ReactNode;
  readonly squareOf: (day: string) => MonthSquare;
}

export function CycleMonth(_props: Props): ReactNode {
  return null;
}
