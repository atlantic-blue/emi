import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@emi/ui';
import { firstRunCopy } from './copy';
import {
  addMonths,
  dayLabel,
  monthLabel,
  monthWeeks,
  startOfMonth,
  weekdayColumnNames,
} from './days';

export function dayTestID(day: string): string {
  return `day-${day}`;
}

export const calendarTestID = 'calendar';
export const weekTestID = 'calendar-week';
export const emptyCellTestID = 'calendar-empty';
export const monthTestID = 'calendar-month';
export const earlierMonthTestID = 'calendar-earlier-month';
export const laterMonthTestID = 'calendar-later-month';

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

interface Props {
  /** Her own day, which is what the weekday names in a square's spoken label are measured from. */
  readonly today: string;
  readonly chosen: string | undefined;
  readonly onChoose: (day: string) => void;
  /** The oldest day the handles reach. */
  readonly earliest: string;
  /** The newest day the handles reach. */
  readonly latest: string;
  /** The month the grid opens on, which is the month the answer is most likely to be in. */
  readonly opensOn: string;
  /** Whether a square takes a press at all. A square that takes none is still drawn. */
  readonly canChoose: (day: string) => boolean;
}

interface DayProps {
  readonly day: string;
  readonly today: string;
  readonly chosen: string | undefined;
  readonly onChoose: (day: string) => void;
  readonly canBeChosen: boolean;
}

/**
 * One square of the grid. A day the screen would refuse stays on the screen and takes no press,
 * because a month drawn with holes in it cannot be read as a month.
 *
 * The day she picked is marked three ways: the ground fills, a line is drawn around it, and a tick
 * is added under the number. Colour is never the only cue, which is design section 3.
 */
function Day({ day, today, chosen, onChoose, canBeChosen }: DayProps): ReactNode {
  const isChosen = day === chosen;

  return (
    <Pressable
      accessibilityLabel={dayLabel(day, today)}
      accessibilityRole="radio"
      accessibilityState={{ disabled: !canBeChosen, selected: isChosen }}
      disabled={!canBeChosen}
      hitSlop={SQUARE_TOUCH}
      onPress={() => onChoose(day)}
      style={[styles.day, isChosen && styles.dayChosen, !canBeChosen && styles.dayOutOfReach]}
      testID={dayTestID(day)}
    >
      <Text style={isChosen ? [styles.dayNumber, styles.dayNumberChosen] : styles.dayNumber}>
        {Number(day.slice(8, 10))}
      </Text>
      {isChosen ? (
        <View testID={chosenDayMarkTestID}>
          <Icon colour={colour.surfaceContainerLowest} name="check" size={SQUARE_MARK_SIZE} />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * The month grid every question that asks for a day is answered on. She picks a day rather than
 * typing one, so the first run holds to its own promise that she is never asked to fill a field in.
 *
 * Which days it accepts is the question's answer and not this component's, so a screen hands in
 * both the span the handles reach and the rule one square is held to.
 */
export function Calendar({
  today,
  chosen,
  onChoose,
  earliest,
  latest,
  opensOn,
  canChoose,
}: Props): ReactNode {
  const earliestMonth = startOfMonth(earliest);
  const latestMonth = startOfMonth(latest);
  const [month, setMonth] = useState(startOfMonth(opensOn));
  const canGoEarlier = month > earliestMonth;
  const canGoLater = month < latestMonth;

  return (
    <View style={styles.calendar} testID={calendarTestID}>
      <View style={styles.heading}>
        <Pressable
          accessibilityLabel={firstRunCopy.earlierMonth}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGoEarlier }}
          disabled={!canGoEarlier}
          onPress={() => setMonth(addMonths(month, -1))}
          style={canGoEarlier ? styles.page : [styles.page, styles.pageSpent]}
          testID={earlierMonthTestID}
        >
          <Text style={canGoEarlier ? styles.pageLabel : [styles.pageLabel, styles.pageSpentLabel]}>
            {firstRunCopy.earlier}
          </Text>
        </Pressable>
        <Text style={styles.month} testID={monthTestID}>
          {monthLabel(month)}
        </Text>
        <Pressable
          accessibilityLabel={firstRunCopy.laterMonth}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGoLater }}
          disabled={!canGoLater}
          onPress={() => setMonth(addMonths(month, 1))}
          style={canGoLater ? styles.page : [styles.page, styles.pageSpent]}
          testID={laterMonthTestID}
        >
          <Text style={canGoLater ? styles.pageLabel : [styles.pageLabel, styles.pageSpentLabel]}>
            {firstRunCopy.later}
          </Text>
        </Pressable>
      </View>

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
              <Day
                canBeChosen={canChoose(day)}
                chosen={chosen}
                day={day}
                key={day}
                onChoose={onChoose}
                today={today}
              />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    marginTop: space.spaceMd,
    padding: space.spaceMd,
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
  dayOutOfReach: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.surfaceContainerLowest,
    opacity: 0.4,
  },
  empty: { flex: 1, minHeight: MINIMUM_TAP_TARGET },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.spaceMd,
  },
  month: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
  },
  // A handle she can still press is a pill she can see. A spent one keeps its words and loses the
  // pill, so the difference is a shape and not only a strength of colour.
  page: {
    alignItems: 'center',
    backgroundColor: colour.primaryFixed,
    borderColor: colour.primary,
    borderRadius: radius.md,
    borderWidth: stroke.hairline,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
  },
  pageLabel: {
    color: colour.primary,
    ...textStyle('body-sm'),
  },
  pageSpent: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.surfaceContainerLowest,
    opacity: 0.4,
  },
  pageSpentLabel: { color: colour.onSurfaceVariant },
  week: { flexDirection: 'row', gap: space.spaceXs, marginBottom: space.spaceXs },
  weekday: {
    color: colour.onSurfaceVariant,
    flex: 1,
    ...textStyle('label-sm'),
    textAlign: 'center',
  },
});
