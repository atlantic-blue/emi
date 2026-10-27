import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { herDayLabel } from '../cycle/copy';
import type { HerDay } from '../cycle/herWeek';
import { monthLabel } from '../onboarding/days';
import { CycleMonth, MonthLegend, type MonthSquare } from './CycleMonth';
import { DaySheet } from './DaySheet';
import { calendarCopy, daySheetWords, monthLegendCopy } from './copy';
import type { DayPhase } from './herMonthPhases';
import type { WhatTheSheetSays } from './theDaySheet';

export const calendarScreenTestID = 'calendar-screen';
export const calendarHeaderTestID = 'calendar-screen-header';
export const calendarTitleTestID = 'calendar-screen-title';
export const calendarBackTestID = 'calendar-screen-back';
export const calendarTodayTestID = 'calendar-screen-today';
export const calendarMonthTestID = 'calendar-screen-month';
export const calendarHeadingTestID = 'calendar-screen-heading';
export const calendarEarlierTestID = 'calendar-screen-earlier';
export const calendarLaterTestID = 'calendar-screen-later';
export const calendarEditPeriodTestID = 'calendar-screen-edit-period';
/** The two sides of the header, the way back and Today, which keep the same width. */
export const calendarHeaderStartTestID = 'calendar-screen-header-start';
export const calendarHeaderEndTestID = 'calendar-screen-header-end';
/** The row under the header that carries the two ways to another month. */
export const calendarPagesTestID = 'calendar-screen-pages';
/** The panel at the foot, which holds the card of the day she pressed. */
export const calendarPanelTestID = 'calendar-screen-panel';

/** Points. Each side of the header, which holds the way back or the word for today. */
const THE_SIDE_OF_THE_HEADER = 88;

/** Points. The way back is read at the size every other way back is read at. */
const BACK_MARK_SIZE = 22;

/** The icon set holds one chevron, pointing the way on, so the way back is that drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

interface Props {
  /** The month she is reading, named by any day in it. */
  readonly month: string;
  /** Her own day, which is the day the grid rings and the day a spoken label counts from. */
  readonly today: string;
  /** The days of that month, each one carrying its cycle day and what happened on it. */
  readonly days: readonly HerDay[];
  /**
   * The phase one date of that month fell in, as the cycle layer already read it. The month colours
   * a date by what this answers and works none of it out itself.
   */
  readonly phaseOn?: (day: string) => DayPhase | undefined;
  /** Whether she recorded sex on one date of that month, which puts a heart on its disc. */
  readonly hadSexOn?: (day: string) => boolean;
  /**
   * The day she pressed, worked out. The route hands today until she presses another day, so the
   * card and the way to her whole period are always on the glass.
   */
  readonly shePressed?: WhatTheSheetSays;
  readonly onBack: () => void;
  /** The way to the screen she opens, which is where today is. */
  readonly onToday: () => void;
  readonly onPressDay: (day: string) => void;
  /** The way to the month before the one she is reading. */
  readonly onEarlierMonth: () => void;
  /** The way to the month after it, which reaches months she has not lived yet. */
  readonly onLaterMonth: () => void;
  /** The way to a day she has lived, which is the address the repository already answers on. */
  readonly onOpenDay: (day: string) => void;
  readonly onRecordSex: (day: string) => void;
  /** The way to the whole period of the day she pressed. */
  readonly onEditPeriod: (day: string) => void;
}

/**
 * Her own month, read back to her: the day of her cycle above every date, a day she bled filled, a
 * day a period is forecast on in a dashed ring, the fertile window tinted, and today ringed.
 *
 * Every day is a button. A press puts the card of that day at the foot: what she logged on a day
 * she lived, and when the period it waits for may start on a day ahead of her.
 * Nothing here counts a cycle day or picks a mark. The days arrive worked out from the cycle cache,
 * the day log and the forecast, so the month and the ring cannot name different days.
 */
export function CalendarScreen({
  month,
  today,
  days,
  phaseOn,
  hadSexOn,
  shePressed,
  onBack,
  onToday,
  onPressDay,
  onOpenDay,
  onRecordSex,
  onEarlierMonth,
  onLaterMonth,
  onEditPeriod,
}: Props): ReactNode {
  const held = new Map(days.map((day) => [day.day, day]));

  const squareOf = (day: string): MonthSquare => {
    const hers = held.get(day);

    if (hers === undefined) {
      throw new Error(`the month drew ${day} and the cycle says nothing about it`);
    }

    const phase = phaseOn?.(day);
    const hadSex = hadSexOn?.(day) === true;

    return {
      hadSex,
      label: hadSex
        ? `${herDayLabel(hers, today)}, ${monthLegendCopy.sex}`
        : herDayLabel(hers, today),
      mark: hers.mark,
      onPress: () => onPressDay(day),
      picked: shePressed?.day === day,
      role: 'button',
      ...(hers.cycleDay === undefined ? {} : { cycleDay: hers.cycleDay }),
      ...(phase === undefined
        ? {}
        : { fertile: phase.fertile, ovulating: phase.ovulating, phase: phase.phase }),
    };
  };

  return (
    <Screen drawsTheWash testID={calendarScreenTestID} washPhase={phaseOn?.(today)?.phase}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header} testID={calendarHeaderTestID}>
          <View style={styles.side} testID={calendarHeaderStartTestID}>
            <Pressable
              accessibilityLabel={calendarCopy.back}
              accessibilityRole="button"
              onPress={onBack}
              style={styles.back}
              testID={calendarBackTestID}
            >
              <View style={styles.backMark}>
                <Icon colour={colour.text} name="chevron" size={BACK_MARK_SIZE} />
              </View>
            </Pressable>
          </View>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={styles.title}
            testID={calendarTitleTestID}
          >
            {monthLabel(month)}
          </Text>
          <View style={[styles.side, styles.sideEnd]} testID={calendarHeaderEndTestID}>
            <Pressable
              accessibilityRole="button"
              onPress={onToday}
              style={styles.link}
              testID={calendarTodayTestID}
            >
              <Text style={styles.todayLabel}>{calendarCopy.today}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.pages} testID={calendarPagesTestID}>
          <Pressable
            accessibilityLabel={calendarCopy.earlierMonth}
            accessibilityRole="button"
            onPress={onEarlierMonth}
            style={styles.link}
            testID={calendarEarlierTestID}
          >
            <Text style={styles.pageLabel}>{calendarCopy.earlier}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={calendarCopy.laterMonth}
            accessibilityRole="button"
            onPress={onLaterMonth}
            style={styles.link}
            testID={calendarLaterTestID}
          >
            <Text style={styles.pageLabel}>{calendarCopy.later}</Text>
          </Pressable>
        </View>

        <MonthLegend namesSex />

        <CycleMonth month={month} squareOf={squareOf} testID={calendarMonthTestID} />

        <View style={styles.foot} testID={calendarPanelTestID}>
          {shePressed === undefined ? null : (
            <DaySheet
              {...daySheetWords(shePressed)}
              editPeriodLabel={calendarCopy.editPeriod}
              editPeriodTestID={calendarEditPeriodTestID}
              onEditPeriod={() => onEditPeriod(shePressed.day)}
              openLabel={calendarCopy.openTheDay}
              recordSexLabel={calendarCopy.recordSex}
              {...(shePressed.kind === 'lived'
                ? {
                    onOpen: () => onOpenDay(shePressed.day),
                    onRecordSex: () => onRecordSex(shePressed.day),
                  }
                : {})}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.full,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
  backMark: { transform: TURNED_AROUND },
  body: {
    flexGrow: 1,
    gap: space.spaceMd,
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceXl,
  },
  foot: { justifyContent: 'flex-end', marginTop: 'auto' },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceSm,
    justifyContent: 'space-between',
  },
  link: {
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  pageLabel: {
    color: colour.secondaryText,
    ...textStyle('choice-sm'),
  },
  pages: { flexDirection: 'row', justifyContent: 'space-between' },
  // The two sides of the header are the same width, so the month name stands in the middle of the
  // glass whatever the word for today is.
  side: { flexDirection: 'row', minWidth: THE_SIDE_OF_THE_HEADER, width: THE_SIDE_OF_THE_HEADER },
  sideEnd: { justifyContent: 'flex-end' },
  // The month name is the only box in its row that gives way. It is longer in Spanish than in
  // English, and longer again in a face the phone substitutes, so the width comes off the words.
  title: {
    color: colour.text,
    flexShrink: 1,
    textAlign: 'center',
    ...textStyle('headline-sm'),
  },
  todayLabel: {
    color: colour.accent,
    ...textStyle('button-md'),
  },
});
