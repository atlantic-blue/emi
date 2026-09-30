import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import type { HerDay } from '../cycle/herWeek';
import { monthLabel } from '../onboarding/days';

/**
 * Her own month, read back to her. The header is here and the month under it is the step that
 * builds the grid.
 */

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
  readonly onBack: () => void;
  /** The way to the screen she opens, which is where today is. */
  readonly onToday: () => void;
}

export function CalendarScreen({ month }: Props): ReactNode {
  return (
    <Screen testID={calendarScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header} testID={calendarHeaderTestID}>
          <Text accessibilityRole="header" style={styles.title} testID={calendarTitleTestID}>
            {monthLabel(month)}
          </Text>
        </View>
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
  title: {
    color: colour.onSurface,
    flexShrink: 1,
    ...textStyle('headline-md'),
  },
});
