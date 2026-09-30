import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CycleMonth, type MonthSquare } from '../calendar/CycleMonth';
import { firstRunCopy } from './copy';
import { addMonths, dayLabel, monthLabel, startOfMonth } from './days';

export {
  chosenDayMarkTestID,
  dateTestID,
  dayTestID,
  emptyCellTestID,
  weekCellTestIDs,
  weekTestID,
} from '../calendar/CycleMonth';

export const calendarTestID = 'calendar';
export const monthHeadingTestID = 'calendar-heading';
export const monthTestID = 'calendar-month';
export const earlierMonthTestID = 'calendar-earlier-month';
export const laterMonthTestID = 'calendar-later-month';

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

/**
 * The month grid every question that asks for a day is answered on. She picks a day rather than
 * typing one, so the first run holds to its own promise that she is never asked to fill a field in.
 *
 * Which days it accepts is the question's answer and not this component's, so a screen hands in
 * both the span the handles reach and the rule one square is held to.
 *
 * The grid itself is `CycleMonth`, which the calendar screen draws too. This screen adds the way to
 * another month above it and the rule for one square below.
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

  const squareOf = (day: string): MonthSquare => ({
    chosen: day === chosen,
    label: dayLabel(day, today),
    mark: 'plain',
    outOfReach: !canChoose(day),
    onPress: () => onChoose(day),
  });

  return (
    <CycleMonth
      heading={
        <View style={styles.heading} testID={monthHeadingTestID}>
          <Pressable
            accessibilityLabel={firstRunCopy.earlierMonth}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canGoEarlier }}
            disabled={!canGoEarlier}
            onPress={() => setMonth(addMonths(month, -1))}
            style={canGoEarlier ? styles.page : [styles.page, styles.pageSpent]}
            testID={earlierMonthTestID}
          >
            <Text
              style={canGoEarlier ? styles.pageLabel : [styles.pageLabel, styles.pageSpentLabel]}
            >
              {firstRunCopy.earlier}
            </Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.month} testID={monthTestID}>
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
      }
      month={month}
      squareOf={squareOf}
      testID={calendarTestID}
    />
  );
}

const styles = StyleSheet.create({
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceSm,
    justifyContent: 'space-between',
    marginBottom: space.spaceMd,
  },
  // The title is the only box in the row that gives way. A month name is longer in Spanish than
  // in English and longer again in a face the phone substitutes, and the two pills have a thumb to
  // hold, so the width comes off the words and never off the way to another month.
  month: {
    color: colour.onSurface,
    flexShrink: 1,
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
});
