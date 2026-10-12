import type { ReactNode } from 'react';

import { NumberWheel, ROWS_EACH_SIDE, WHEEL_ROW_HEIGHT } from './NumberWheel';

export function yearTestID(year: number): string {
  return `year-${year}`;
}

export const yearWheelTestID = 'year-wheel';
export const yearWheelPillTestID = 'year-wheel-pill';

export const YEAR_ROW_HEIGHT = WHEEL_ROW_HEIGHT;
export const YEARS_EACH_SIDE = ROWS_EACH_SIDE;

interface Props {
  /** The years the wheel offers, newest first, which is the order she reads them in. */
  readonly years: readonly number[];
  readonly chosen: number | undefined;
  /**
   * Where the wheel opens when nothing is chosen. A list that opened on its oldest year, or on its
   * newest, would ask most women to travel a long way before they reached a year they could have
   * been born in.
   */
  readonly opensOn: number;
  readonly labelOf: (year: number) => string;
  readonly onChoose: (year: number) => void;
}

/** The years she picks one of, and the control both the question and the way back to it borrow. */
export function YearWheel({ years, chosen, opensOn, labelOf, onChoose }: Props): ReactNode {
  return (
    <NumberWheel
      chosen={chosen}
      labelOf={labelOf}
      onChoose={onChoose}
      opensOn={opensOn}
      pillTestID={yearWheelPillTestID}
      testID={yearWheelTestID}
      testIDOf={yearTestID}
      values={years}
    />
  );
}
