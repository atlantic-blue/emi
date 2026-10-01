import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { herDayLabel } from '../cycle/copy';
import type { DayMark, HerDay } from '../cycle/herWeek';

/**
 * Her week, under the header of the screen she opens. Seven days, each carrying the letter of its
 * weekday, the day of her cycle, and the date under that.
 *
 * She reads where she is without pressing anything, so every day states itself. A day she bled is
 * filled, today is ringed, and a day her period is expected to run into is a dotted outline: three
 * different shapes rather than three strengths of one colour, which design section 3 holds every
 * cue to.
 *
 * Every day is also the way into her month, so the row she already reads is the way in and nothing
 * new goes in the header or in the dock.
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
  /** The way into her month, which every day of the row takes her by, naming the day she pressed. */
  readonly onOpenMonth?: (day: string) => void;
}

export function WeekStrip({ days, today, onOpenMonth }: Props): ReactNode {
  return (
    <View style={styles.strip} testID={weekStripTestID}>
      {days.map((day) => (
        <Pressable
          accessibilityLabel={herDayLabel(day, today)}
          accessibilityRole="button"
          key={day.day}
          onPress={() => onOpenMonth?.(day.day)}
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
        </Pressable>
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
    borderColor: colour.accent,
    borderStyle: 'solid',
    borderWidth: stroke.icon,
  },
});

const styles = StyleSheet.create({
  // The cycle day is the smallest thing on the strip, because it is the number she checks rather
  // than the number she looks for, and the date underneath is what she scans the row by.
  cycleDay: {
    color: colour.secondaryText,
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
    color: colour.text,
    ...textStyle('body-sm'),
  },
  // A number on the period fill takes the ground colour rather than the ink of the phase, because
  // SEE-2 keeps a word off a fill and a figure on one is held to the same floor.
  dateOnFill: {
    color: colour.card,
    ...textStyle('body-sm'),
  },
  // A day of the row is what she presses to reach her month, so it carries the floor SEE-3 sets
  // rather than the width of the disc inside it. Seven of them need 308 points and the row has 327
  // inside its margins on the narrowest phone Emi is built for.
  day: {
    alignItems: 'center',
    gap: space.spaceXs,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  letter: {
    color: colour.secondaryText,
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
