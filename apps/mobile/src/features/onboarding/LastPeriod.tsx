import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
            </Pressable>
          );
        })}
      </View>

      <View style={styles.heading}>
        <Pressable
          accessibilityLabel="Earlier month"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGoEarlier }}
          disabled={!canGoEarlier}
          onPress={() => setMonth(addMonths(month, -1))}
          style={canGoEarlier ? styles.page : [styles.page, styles.pageSpent]}
          testID={earlierMonthTestID}
        >
          <Text style={styles.pageLabel}>Earlier</Text>
        </Pressable>
        <Text style={styles.month} testID={monthTestID}>
          {monthLabel(month)}
        </Text>
        <Pressable
          accessibilityLabel="Later month"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGoLater }}
          disabled={!canGoLater}
          onPress={() => setMonth(addMonths(month, 1))}
          style={canGoLater ? styles.page : [styles.page, styles.pageSpent]}
          testID={laterMonthTestID}
        >
          <Text style={styles.pageLabel}>Later</Text>
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
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  day: {
    alignItems: 'center',
    backgroundColor: colour.sunk,
    borderRadius: radius.chip,
    flex: 1,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  dayChosen: { backgroundColor: colour.ember },
  dayNumber: {
    color: colour.body,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
  },
  dayNumberChosen: { color: colour.surface },
  dayOutOfReach: { backgroundColor: colour.stone, opacity: 0.4 },
  empty: { flex: 1, minHeight: MINIMUM_TAP_TARGET, minWidth: MINIMUM_TAP_TARGET },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.tight,
    marginTop: space.snug,
  },
  month: {
    color: colour.ink,
    fontSize: typeScale.heading.size,
    lineHeight: typeScale.heading.lineHeight,
  },
  name: {
    alignItems: 'center',
    backgroundColor: colour.sunk,
    borderRadius: radius.round,
    flex: 1,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.snug,
  },
  nameChosen: { backgroundColor: colour.ember },
  nameChosenLabel: { color: colour.surface },
  nameLabel: {
    color: colour.body,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
  },
  named: { flexDirection: 'row', gap: space.tight, marginTop: space.tight },
  page: {
    alignItems: 'center',
    borderRadius: radius.chip,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.snug,
  },
  pageLabel: {
    color: colour.ember,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
  },
  pageSpent: { opacity: 0.4 },
  week: { flexDirection: 'row', gap: space.hair, marginBottom: space.hair },
  weekday: {
    color: colour.muted,
    flex: 1,
    fontSize: typeScale.label.size,
    letterSpacing: typeScale.label.letterSpacing,
    lineHeight: typeScale.label.lineHeight,
    textAlign: 'center',
  },
});
