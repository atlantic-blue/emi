import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy } from './copy';
import {
  addMonths,
  dayLabel,
  daysBackFrom,
  localDay,
  monthLabel,
  monthWeeks,
  startOfMonth,
  weekdayColumnNames,
} from './days';
import { oldestPeriodStart, periodStartIsInRange } from './firstRun';

export function dayTestID(day: string): string {
  return `day-${day}`;
}

/** The named answers sit beside the grid, so pressing today is not a search through the squares. */
export function namedDayTestID(day: string): string {
  return `named-day-${day}`;
}

export const monthTestID = 'calendar-month';
export const earlierMonthTestID = 'calendar-earlier-month';
export const laterMonthTestID = 'calendar-later-month';

/** The tick the chosen day carries. It is the cue that survives a screen read in grey. */
export const chosenDayMarkTestID = 'calendar-chosen-mark';
export const chosenNameMarkTestID = 'named-day-chosen-mark';

/** The tick sits under a number in a square, and beside a word in a pill, so it takes two sizes. */
const SQUARE_MARK_SIZE = 12;
const NAME_MARK_SIZE = 16;

interface Props {
  readonly now: Date;
  readonly chosen: string | undefined;
  readonly onChoose: (day: string) => void;
  readonly onContinue: () => void;
}

interface DayProps {
  readonly day: string;
  readonly today: string;
  readonly chosen: string | undefined;
  readonly onChoose: (day: string) => void;
}

/**
 * One square of the grid. A day the first run would refuse stays on the screen and takes no press,
 * because a month drawn with holes in it cannot be read as a month.
 *
 * The day she picked is marked three ways: the ground fills, a line is drawn around it, and a tick
 * is added under the number. Colour is never the only cue, which is design section 3.
 */
function Day({ day, today, chosen, onChoose }: DayProps): ReactNode {
  const isChosen = day === chosen;
  const canBeChosen = periodStartIsInRange(day, today);

  return (
    <Pressable
      accessibilityLabel={dayLabel(day, today)}
      accessibilityRole="radio"
      accessibilityState={{ disabled: !canBeChosen, selected: isChosen }}
      disabled={!canBeChosen}
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
 * Screen two of three. She picks a day from a calendar rather than typing one, so the first run
 * holds to its own promise that she is never asked to fill a field in.
 */
export function LastPeriod({ now, chosen, onChoose, onContinue }: Props): ReactNode {
  const today = localDay(now);
  const earliestMonth = startOfMonth(oldestPeriodStart(today));
  const latestMonth = startOfMonth(today);
  const [month, setMonth] = useState(latestMonth);
  const canGoEarlier = month > earliestMonth;
  const canGoLater = month < latestMonth;

  return (
    <OnboardingScreen
      actionIsReady={chosen !== undefined}
      actionLabel={firstRunCopy.lastPeriod.action}
      lines={firstRunCopy.lastPeriod.lines}
      onAction={onContinue}
      screen="lastPeriod"
      title={firstRunCopy.lastPeriod.title}
    >
      <View style={styles.named}>
        {daysBackFrom(today, 2).map((day) => {
          const isChosen = day === chosen;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isChosen }}
              key={day}
              onPress={() => onChoose(day)}
              style={isChosen ? [styles.name, styles.nameChosen] : styles.name}
              testID={namedDayTestID(day)}
            >
              <Text
                style={isChosen ? [styles.nameLabel, styles.nameChosenLabel] : styles.nameLabel}
              >
                {dayLabel(day, today)}
              </Text>
              {isChosen ? (
                <View testID={chosenNameMarkTestID}>
                  <Icon colour={colour.surfaceContainerLowest} name="check" size={NAME_MARK_SIZE} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.calendar}>
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
            <Text
              style={canGoEarlier ? styles.pageLabel : [styles.pageLabel, styles.pageSpentLabel]}
            >
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

        <View style={styles.week}>
          {weekdayColumnNames.map((weekday) => (
            <Text accessibilityLabel={weekday} key={weekday} style={styles.weekday}>
              {weekday.slice(0, 1)}
            </Text>
          ))}
        </View>

        {monthWeeks(month).map((week) => (
          <View key={week.join()} style={styles.week}>
            {week.map((day, column) =>
              day === undefined ? (
                <View key={`${month} ${column}`} style={styles.empty} />
              ) : (
                <Day chosen={chosen} day={day} key={day} onChoose={onChoose} today={today} />
              ),
            )}
          </View>
        ))}
      </View>
    </OnboardingScreen>
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
    minWidth: MINIMUM_TAP_TARGET,
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
  empty: { flex: 1, minHeight: MINIMUM_TAP_TARGET, minWidth: MINIMUM_TAP_TARGET },
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
  name: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outlineVariant,
    borderRadius: radius.full,
    borderWidth: stroke.icon,
    flex: 1,
    flexDirection: 'row',
    gap: space.spaceSm,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
  },
  nameChosen: { backgroundColor: colour.surfaceTint, borderColor: colour.onPrimaryFixedVariant },
  nameChosenLabel: { color: colour.surfaceContainerLowest },
  nameLabel: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  named: { flexDirection: 'row', gap: space.spaceSm, marginTop: space.spaceSm },
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
