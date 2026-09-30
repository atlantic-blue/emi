import { MINIMUM_TAP_TARGET, colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { herDayLabel } from '../cycle/copy';
import type { HerDay } from '../cycle/herWeek';
import { monthLabel } from '../onboarding/days';
import { CycleMonth, type MonthSquare } from './CycleMonth';
import { DaySheet } from './DaySheet';
import { calendarCopy, daySheetWords } from './copy';
import type { WhatTheSheetSays } from './theDaySheet';

export const calendarScreenTestID = 'calendar-screen';
export const calendarHeaderTestID = 'calendar-screen-header';
export const calendarTitleTestID = 'calendar-screen-title';
export const calendarBackTestID = 'calendar-screen-back';
export const calendarTodayTestID = 'calendar-screen-today';
export const calendarMonthTestID = 'calendar-screen-month';

interface Props {
  /** The month she is reading, named by any day in it. */
  readonly month: string;
  /** Her own day, which is the day the grid rings and the day a spoken label counts from. */
  readonly today: string;
  /** The days of that month, each one carrying its cycle day and what happened on it. */
  readonly days: readonly HerDay[];
  /**
   * The day she pressed, worked out, or nothing at all until she presses one. A sheet naming a
   * day she did not choose would be Emi choosing for her.
   */
  readonly shePressed?: WhatTheSheetSays;
  readonly onBack: () => void;
  /** The way to the screen she opens, which is where today is. */
  readonly onToday: () => void;
  readonly onPressDay: (day: string) => void;
  /** The way to the day itself, which is the address the repository already answers on. */
  readonly onOpenDay: (day: string) => void;
}

/**
 * Her own month, read back to her: the day of her cycle above every date, a day she bled filled, a
 * day her next period is expected on outlined, and today ringed.
 *
 * A press on a square puts a sheet at the foot naming that day, and a press on the sheet opens it.
 * Nothing here counts a cycle day or picks a mark. The days arrive worked out from the cycle cache
 * and the day log, so the month and the ring cannot name different days.
 */
export function CalendarScreen({
  month,
  today,
  days,
  shePressed,
  onBack,
  onToday,
  onPressDay,
  onOpenDay,
}: Props): ReactNode {
  const held = new Map(days.map((day) => [day.day, day]));

  const squareOf = (day: string): MonthSquare => {
    const hers = held.get(day);

    if (hers === undefined) {
      throw new Error(`the month drew ${day} and the cycle says nothing about it`);
    }

    return {
      label: herDayLabel(hers, today),
      mark: hers.mark,
      onPress: () => onPressDay(day),
      role: 'button',
      ...(hers.cycleDay === undefined ? {} : { cycleDay: hers.cycleDay }),
    };
  };

  return (
    <Screen testID={calendarScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header} testID={calendarHeaderTestID}>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={styles.link}
            testID={calendarBackTestID}
          >
            <Text style={styles.linkLabel}>{calendarCopy.back}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title} testID={calendarTitleTestID}>
            {monthLabel(month)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onToday}
            style={styles.link}
            testID={calendarTodayTestID}
          >
            <Text style={styles.linkLabel}>{calendarCopy.today}</Text>
          </Pressable>
        </View>

        <CycleMonth month={month} squareOf={squareOf} testID={calendarMonthTestID} />

        {shePressed === undefined ? null : (
          <DaySheet {...daySheetWords(shePressed)} onPress={() => onOpenDay(shePressed.day)} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, paddingHorizontal: space.spaceLg, paddingVertical: space.spaceXl },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  linkLabel: {
    color: colour.primary,
    ...textStyle('body-lg'),
  },
  // The month name gives way before the two links do, because a longer name in another language
  // may not take the room a thumb needs on either side of it.
  title: {
    color: colour.onSurface,
    flexShrink: 1,
    ...textStyle('headline-md'),
  },
});
