import { colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { DayMark, HerDay } from '../cycle/herWeek';
import { weekDayLabel } from './copy';

/**
 * Her week, under the header of the screen she opens. Seven days, each carrying the letter of its
 * weekday, the day of her cycle, and the date under that.
 *
 * She reads where she is without pressing anything, so every day states itself. A day she bled is
 * filled, today is ringed, and a day her period is expected to run into is a dotted outline: three
 * different shapes rather than three strengths of one colour, which design section 3 holds every
 * cue to.
 */

export const weekStripTestID = 'home-week-strip';

export function weekDayTestID(day: string): string {
  return `home-week-day-${day}`;
}

export function weekLetterTestID(day: string): string {
  return `home-week-letter-${day}`;
}

export function weekCycleDayTestID(day: string): string {
  return `home-week-cycle-day-${day}`;
}

export function weekDateTestID(day: string): string {
  return `home-week-date-${day}`;
}

/** How wide and how tall the disc around a date is drawn, in points. */
const THE_DATE_IS_A_DISC_OF = 32;

interface Props {
  readonly days: readonly HerDay[];
  /** Her own day, which is what a day of the strip is named against for a screen reader. */
  readonly today: string;
}

export function WeekStrip({ days, today }: Props): ReactNode {
  return (
    <View style={styles.strip} testID={weekStripTestID}>
      {days.map((day) => (
        <View
          accessibilityLabel={weekDayLabel(day, today)}
          key={day.day}
          style={styles.day}
          testID={weekDayTestID(day.day)}
        >
          <Text style={styles.letter} testID={weekLetterTestID(day.day)}>
            {day.letter}
          </Text>

          {day.cycleDay === undefined ? null : (
            <Text style={styles.cycleDay} testID={weekCycleDayTestID(day.day)}>
              {day.cycleDay}
            </Text>
          )}

          <View style={[styles.date, theMark[day.mark]]} testID={weekDateTestID(day.day)}>
            <Text style={day.mark === 'bled' ? styles.dateOnFill : styles.dateNumber}>
              {day.date}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * What each of the four states adds to the disc around a date. A filled day and a ringed day are
 * told apart by a fill against a line, and an expected day by the line being broken, so none of
 * the three needs colour to be read.
 */
const theMark: Readonly<Record<DayMark, ViewStyle>> = StyleSheet.create({
  bled: { backgroundColor: colour.period },
  forecast: {
    borderColor: colour.period,
    borderStyle: 'dotted',
    borderWidth: stroke.icon,
  },
  plain: {},
  today: {
    borderColor: colour.primary,
    borderStyle: 'solid',
    borderWidth: stroke.icon,
  },
});

const styles = StyleSheet.create({
  // The cycle day is the smallest thing on the strip, because it is the number she checks rather
  // than the number she looks for, and the date underneath is what she scans the row by.
  cycleDay: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-sm'),
  },
  date: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: THE_DATE_IS_A_DISC_OF,
    justifyContent: 'center',
    width: THE_DATE_IS_A_DISC_OF,
  },
  dateNumber: {
    color: colour.onSurface,
    ...textStyle('body-sm'),
  },
  // A number on the period fill takes the ground colour rather than the ink of the phase, because
  // SEE-2 keeps a word off a fill and a figure on one is held to the same floor.
  dateOnFill: {
    color: colour.surfaceContainerLowest,
    ...textStyle('body-sm'),
  },
  day: { alignItems: 'center', gap: space.spaceXs },
  letter: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-sm'),
  },
  // The row is stretched because the body it sits in centres what it holds, and a strip narrower
  // than the glass would put her Monday somewhere other than the margin.
  strip: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.margin,
  },
});
