import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SecondaryButton } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { aDayOutOfReachLabel, herDayLabel } from '../cycle/copy';
import type { HerDay } from '../cycle/herWeek';
import { refusalFor } from '../log/editDay';
import { monthLabel } from '../onboarding/days';
import { CycleMonth, type MonthSquare } from './CycleMonth';
import { DaySheet } from './DaySheet';
import { calendarCopy, daySheetWords } from './copy';
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
/** The panel at the foot: the day she pressed, over the way to her whole period. */
export const calendarPanelTestID = 'calendar-screen-panel';

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
   *
   * Left out where the screen is stood up with no cycles behind it, and then no date carries a
   * phase, which is what a month holding none of her cycles draws anyway.
   */
  readonly phaseOn?: (day: string) => DayPhase | undefined;
  /**
   * The day she pressed, worked out, or nothing at all until she presses one. A sheet naming a
   * day she did not choose would be Emi choosing for her.
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
  /** The way to the day itself, which is the address the repository already answers on. */
  readonly onOpenDay: (day: string) => void;
  /** The way to the whole period, corrected in one action rather than a day at a time. */
  readonly onEditPeriod: () => void;
}

/**
 * Her own month, read back to her: the day of her cycle above every date, a day she bled filled, a
 * day her next period is expected on outlined, and today ringed.
 *
 * A press on a square puts a sheet at the foot naming that day, and a press on the sheet opens it.
 * Under both of them is the way to the whole period, for a correction that would otherwise be one
 * day at a time.
 * Nothing here counts a cycle day or picks a mark. The days arrive worked out from the cycle cache
 * and the day log, so the month and the ring cannot name different days.
 */
export function CalendarScreen({
  month,
  today,
  days,
  phaseOn,
  shePressed,
  onBack,
  onToday,
  onPressDay,
  onOpenDay,
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
    const saidAboutIt = {
      mark: hers.mark,
      role: 'button' as const,
      ...(hers.cycleDay === undefined ? {} : { cycleDay: hers.cycleDay }),
      ...(phase === undefined ? {} : { ovulating: phase.ovulating, phase: phase.phase }),
    };

    // One rule decides whether a day opens, and the address she could type it into reads the same
    // one, so the month never offers a day the day itself would refuse.
    if (refusalFor({ day, today }) !== undefined) {
      return { ...saidAboutIt, label: aDayOutOfReachLabel(hers, today), outOfReach: true };
    }

    return { ...saidAboutIt, label: herDayLabel(hers, today), onPress: () => onPressDay(day) };
  };

  return (
    <Screen drawsTheWash testID={calendarScreenTestID} washPhase={phaseOn?.(today)?.phase}>
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
          <Pressable
            accessibilityRole="button"
            onPress={onToday}
            style={styles.link}
            testID={calendarTodayTestID}
          >
            <Text style={styles.linkLabel}>{calendarCopy.today}</Text>
          </Pressable>
        </View>

        <CycleMonth
          heading={
            <View style={styles.heading} testID={calendarHeadingTestID}>
              <Pressable
                accessibilityLabel={calendarCopy.earlierMonth}
                accessibilityRole="button"
                onPress={onEarlierMonth}
                style={styles.page}
                testID={calendarEarlierTestID}
              >
                <Text style={styles.pageLabel}>{calendarCopy.earlier}</Text>
              </Pressable>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={styles.title}
                testID={calendarTitleTestID}
              >
                {monthLabel(month)}
              </Text>
              <Pressable
                accessibilityLabel={calendarCopy.laterMonth}
                accessibilityRole="button"
                onPress={onLaterMonth}
                style={styles.page}
                testID={calendarLaterTestID}
              >
                <Text style={styles.pageLabel}>{calendarCopy.later}</Text>
              </Pressable>
            </View>
          }
          legend
          month={month}
          squareOf={squareOf}
          testID={calendarMonthTestID}
        />

        <View style={styles.foot} testID={calendarPanelTestID}>
          {shePressed === undefined ? null : (
            <DaySheet {...daySheetWords(shePressed)} onPress={() => onOpenDay(shePressed.day)} />
          )}

          <SecondaryButton
            label={calendarCopy.editPeriod}
            onPress={onEditPeriod}
            testID={calendarEditPeriodTestID}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, paddingHorizontal: space.spaceLg, paddingVertical: space.spaceXl },
  // The panel at the foot. It carries the day she pressed over the way to her whole period, and it
  // runs to both edges of the glass, so it reads as a surface the month sits behind rather than as
  // two more rows of the month.
  //
  // The negative margin is the padding of the body given back. A panel inside that padding would
  // leave a strip of the ground down each side of a sheet the prototype draws edge to edge.
  foot: {
    backgroundColor: colour.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    gap: space.spaceMd,
    justifyContent: 'flex-end',
    marginBottom: -space.spaceXl,
    marginHorizontal: -space.spaceLg,
    marginTop: 'auto',
    paddingBottom: space.spaceXl,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceLg,
    shadowColor: colour.text,
    shadowOffset: { height: -2, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  // The two ways to another month and the title share one row, and the distance between them is
  // the one the first run's month keeps. Five boxes in the header above would need 406 points of
  // the 345 an iPhone 16 leaves, and the month name is what would be cut.
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceSm,
    justifyContent: 'space-between',
    marginBottom: space.spaceMd,
  },
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
    color: colour.accent,
    ...textStyle('body-lg'),
  },
  // A way to another month is a pill she can see rather than a word among words, because the two
  // of them stand either side of the title and a thumb has to find them without reading.
  page: {
    alignItems: 'center',
    backgroundColor: colour.accentSoft,
    borderColor: colour.accent,
    borderRadius: radius.md,
    borderWidth: stroke.hairline,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
  },
  pageLabel: {
    color: colour.accent,
    ...textStyle('body-sm'),
  },
  // The month name is the only box in its row that gives way. It is longer in Spanish than in
  // English, and longer again in a face the phone substitutes, and each way to another month has a
  // thumb to hold, so the width comes off the words.
  title: {
    color: colour.text,
    flexShrink: 1,
    ...textStyle('headline-md'),
  },
});
