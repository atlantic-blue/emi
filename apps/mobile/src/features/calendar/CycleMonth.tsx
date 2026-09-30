import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import type { DayMark } from '../cycle/herWeek';
import { monthWeeks, weekdayColumnNames } from '../onboarding/days';

/**
 * The month grid, drawn once for every screen that shows a month.
 *
 * Two screens stand on it. The first run asks which day her last period started on, so its squares
 * take a press and the one she picked is marked. The calendar screen reads her own month back to
 * her, so its squares carry the day of her cycle and what happened on that date. What a square
 * draws and what it does when she presses it arrive from the screen; the columns, the rows and the
 * size of a square are the grid's own.
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

/** Points. The tick sits under a number in a square, so it is drawn smaller than the number. */
const SQUARE_MARK_SIZE = 12;

/**
 * Seven squares of 44 points, a gutter each side and the padding of the calendar want 414 points
 * across, and an iPhone 16 has 393. So a square takes the width the row leaves it rather than a
 * width of its own, and keeps the height a thumb needs.
 *
 * What it takes a touch on is widened by half the gap on each side, so every point between two
 * squares belongs to the nearer one and no part of the row is dead.
 */
const HALF_THE_GAP_BETWEEN_SQUARES = space.spaceXs / 2;
const SQUARE_TOUCH = {
  bottom: 0,
  left: HALF_THE_GAP_BETWEEN_SQUARES,
  right: HALF_THE_GAP_BETWEEN_SQUARES,
  top: 0,
} as const;

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
  /**
   * What the square is to somebody listening. A screen asking her to pick one day of the month
   * offers a set of options, and a screen where a day opens something offers a button.
   */
  readonly role?: 'radio' | 'button';
}

interface SquareProps {
  readonly day: string;
  readonly square: MonthSquare;
}

/**
 * One square. A day the screen would refuse stays on the grid and takes no press, because a month
 * drawn with holes in it cannot be read as a month.
 *
 * Every cue is a shape as well as a colour, which is design section 3. A day she bled is filled, a
 * day her period is expected on is a broken line, today is a solid ring, and the day she picked
 * fills and carries a tick under the number.
 */
function Square({ day, square }: SquareProps): ReactNode {
  const chosen = square.chosen === true;
  const inside = (
    <>
      {square.cycleDay === undefined ? null : (
        <Text style={styles.cycleDay} testID={cycleDayTestID(day)}>
          {square.cycleDay}
        </Text>
      )}
      <Text style={theNumber(square, chosen)} testID={dateTestID(day)}>
        {Number(day.slice(8, 10))}
      </Text>
      {chosen ? (
        <View testID={chosenDayMarkTestID}>
          <Icon colour={colour.surfaceContainerLowest} name="check" size={SQUARE_MARK_SIZE} />
        </View>
      ) : null}
    </>
  );
  const style = [
    styles.day,
    theMark[square.mark],
    chosen && styles.dayChosen,
    square.outOfReach === true && styles.dayOutOfReach,
  ];

  if (square.onPress === undefined) {
    return (
      <View accessibilityLabel={square.label} style={style} testID={dayTestID(day)}>
        {inside}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={square.label}
      accessibilityRole={square.role ?? 'radio'}
      accessibilityState={{ disabled: square.outOfReach === true, selected: chosen }}
      disabled={square.outOfReach === true}
      hitSlop={SQUARE_TOUCH}
      onPress={square.onPress}
      style={style}
      testID={dayTestID(day)}
    >
      {inside}
    </Pressable>
  );
}

/**
 * The ink the date is drawn in. A number on a fill takes the ground colour rather than the ink of
 * the phase, because SEE-2 keeps a word off a fill and a figure on one is held to the same floor.
 */
function theNumber(square: MonthSquare, chosen: boolean): TextStyle[] | TextStyle {
  if (chosen) {
    return [styles.dayNumber, styles.dayNumberChosen];
  }

  return square.mark === 'bled' ? [styles.dayNumber, styles.dayNumberOnFill] : styles.dayNumber;
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

/**
 * The month, seven columns wide. A cell is empty where the week runs outside the month, so one
 * weekday holds one column all the way down the grid.
 */
export function CycleMonth({ testID, month, heading, squareOf }: Props): ReactNode {
  return (
    <View style={styles.calendar} testID={testID}>
      {heading}

      <View style={styles.week} testID={weekTestID}>
        {weekdayColumnNames.map((weekday) => (
          <Text accessibilityLabel={weekday} key={weekday} style={styles.weekday}>
            {weekday.slice(0, 1)}
          </Text>
        ))}
      </View>

      {monthWeeks(month).map((week) => (
        <View key={week.join()} style={styles.week} testID={weekTestID}>
          {week.map((day, column) =>
            day === undefined ? (
              <View key={`${month} ${column}`} style={styles.empty} testID={emptyCellTestID} />
            ) : (
              <Square day={day} key={day} square={squareOf(day)} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * What each of the four states adds to a square. A filled day and a ringed day are told apart by a
 * fill against a line, and an expected day by the line being broken, so none of the three needs
 * colour to be read.
 */
const theMark: Readonly<Record<DayMark, ViewStyle>> = StyleSheet.create({
  bled: { backgroundColor: colour.period, borderColor: colour.period },
  forecast: { borderColor: colour.period, borderStyle: 'dotted' },
  plain: {},
  today: { borderColor: colour.primary, borderStyle: 'solid' },
});

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    marginTop: space.spaceMd,
    padding: space.spaceMd,
  },
  // The cycle day is the smallest thing in a square, because it is the number she checks rather
  // than the number she looks for, and the date under it is what she scans the row by.
  cycleDay: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-sm'),
  },
  // Every square carries the line the chosen one carries, drawn in its own ground where it is not
  // chosen, so nothing moves by a point and a half when she presses one.
  day: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainer,
    borderColor: colour.surfaceContainer,
    borderRadius: radius.md,
    borderWidth: stroke.icon,
    flex: 1,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
  },
  dayChosen: { backgroundColor: colour.surfaceTint, borderColor: colour.onPrimaryFixedVariant },
  dayNumber: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  dayNumberChosen: { color: colour.surfaceContainerLowest },
  dayNumberOnFill: { color: colour.surfaceContainerLowest },
  dayOutOfReach: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.surfaceContainerLowest,
    opacity: 0.4,
  },
  empty: { flex: 1, minHeight: MINIMUM_TAP_TARGET },
  week: { flexDirection: 'row', gap: space.spaceXs, marginBottom: space.spaceXs },
  weekday: {
    color: colour.onSurfaceVariant,
    flex: 1,
    ...textStyle('label-sm'),
    textAlign: 'center',
  },
});
