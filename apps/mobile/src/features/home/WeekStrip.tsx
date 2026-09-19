import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, typeScale } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayLabel } from '../onboarding/days';
import type { StripDay } from './weekStrip';

/**
 * Her week, seven columns ending on today. Each column says which day of her cycle it was and what
 * she recorded on it, so what she opens Emi to see is answered before the ring is read.
 *
 * No column carries its meaning in colour alone, which is design section 3. A recorded period day
 * holds its own number, a day her period may start on is drawn as a dotted outline, and today is
 * the one column with a line around its disc at all.
 */

export const weekStripTestID = 'home-week-strip';

export function weekDayTestID(day: string): string {
  return `week-day-${day}`;
}

/** The disc under the letter, which carries the period day number where she recorded one. */
export function weekDiscTestID(day: string): string {
  return `week-disc-${day}`;
}

const DISC_SIZE = 32;

/**
 * The cycle day, the letter, and the disc, with the gaps between them. The height is fixed so that
 * a day with no cycle number above it leaves the discs on one line rather than lifting its own.
 */
const COLUMN_HEIGHT = typeScale.label.lineHeight * 2 + DISC_SIZE + space.hair * 2;

interface Props {
  readonly week: readonly StripDay[];
  readonly today: string;
  readonly onOpenDay: (day: string) => void;
}

/**
 * What a screen reader is told, because the letter at the top of a column says Tuesday and Thursday
 * with the same character.
 */
export function columnLabel(column: StripDay, today: string): string {
  const said = [dayLabel(column.day, today)];

  if (column.cycleDay !== undefined) {
    said.push(`cycle day ${column.cycleDay}`);
  }

  if (column.periodDay !== undefined) {
    said.push(`period day ${column.periodDay}`);
  }

  if (column.forecastPeriod) {
    said.push('period expected');
  }

  return said.join(', ');
}

interface ColumnProps {
  readonly column: StripDay;
  readonly today: string;
  readonly onOpenDay: (day: string) => void;
}

function Column({ column, today, onOpenDay }: ColumnProps): ReactNode {
  const isPeriod = column.periodDay !== undefined;
  // A day she has not reached takes no press, whatever week the screen is handed. The past day
  // screen refuses such a day at the write, and a control that leads nowhere should not be live.
  const lived = column.day <= today;

  return (
    <Pressable
      accessibilityLabel={columnLabel(column, today)}
      accessibilityRole="button"
      accessibilityState={{ disabled: !lived }}
      disabled={!lived}
      onPress={() => onOpenDay(column.day)}
      style={styles.column}
      testID={weekDayTestID(column.day)}
    >
      {column.cycleDay === undefined ? null : (
        <Text style={styles.cycleDay}>{String(column.cycleDay)}</Text>
      )}
      <Text style={styles.letter}>{column.letter}</Text>

      <View
        style={[
          styles.disc,
          isPeriod && styles.period,
          column.forecastPeriod && styles.forecast,
          column.isToday && styles.today,
        ]}
        testID={weekDiscTestID(column.day)}
      >
        <Text style={isPeriod ? [styles.date, styles.periodInk] : styles.date}>
          {String(column.periodDay ?? column.dateNumber)}
        </Text>
      </View>
    </Pressable>
  );
}

export function WeekStrip({ week, today, onOpenDay }: Props): ReactNode {
  return (
    <View style={styles.strip} testID={weekStripTestID}>
      {week.map((column) => (
        <Column column={column} key={column.day} onOpenDay={onOpenDay} today={today} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    gap: space.hair,
    height: COLUMN_HEIGHT,
    justifyContent: 'flex-end',
    minWidth: MINIMUM_TAP_TARGET,
  },
  cycleDay: {
    color: colour.muted,
    fontSize: typeScale.label.size,
    letterSpacing: typeScale.label.letterSpacing,
    lineHeight: typeScale.label.lineHeight,
  },
  date: {
    color: colour.body,
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineHeight,
  },
  // The border takes the ground's own colour, so a day with nothing on it draws no line and today
  // is the one column carrying a visible ring.
  disc: {
    alignItems: 'center',
    borderColor: colour.stone,
    borderRadius: radius.round,
    borderStyle: 'solid',
    borderWidth: stroke.icon,
    height: DISC_SIZE,
    justifyContent: 'center',
    width: DISC_SIZE,
  },
  forecast: { borderColor: colour.ember, borderStyle: 'dotted' },
  letter: {
    color: colour.muted,
    fontSize: typeScale.label.size,
    letterSpacing: typeScale.label.letterSpacing,
    lineHeight: typeScale.label.lineHeight,
  },
  period: { backgroundColor: colour.emberTint, borderColor: colour.emberTint },
  periodInk: { color: colour.periodInk },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.base,
    paddingHorizontal: space.snug,
    width: '100%',
  },
  today: { borderColor: colour.ember },
});
