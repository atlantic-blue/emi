import { MINIMUM_TAP_TARGET, colour, space, stroke, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { aDayOutOfReachLabel, herDayLabel } from '../cycle/copy';
import type { HerDay } from '../cycle/herWeek';
import { refusalFor } from '../log/editDay';
import { CycleMonth, type MonthSquare } from './CycleMonth';
import { editPeriodCopy, whatEmiHoldsSaid, whatSheChangedSaid } from './copy';
import { sheCanSave, whatSheChanged } from './savePeriod';

export const editPeriodScreenTestID = 'edit-period';
export const editPeriodHeaderTestID = 'edit-period-header';
export const editPeriodTitleTestID = 'edit-period-title';
export const editPeriodBackTestID = 'edit-period-back';
export const editPeriodCancelTestID = 'edit-period-cancel';
export const editPeriodLeadTestID = 'edit-period-lead';
export const editPeriodChangeTestID = 'edit-period-change';
export const editPeriodSaveTestID = 'edit-period-save';
export const periodRangePickerTestID = 'period-range-picker';

/** The two kinds of change she can make to the period Emi holds. */
export const periodChanges = ['added', 'takenOff'] as const;

export type PeriodChange = (typeof periodChanges)[number];

/** The key under the grid, which names the changes she has made since the screen opened. */
export const editPeriodKeyTestID = 'edit-period-key';

/** One entry of that key: the cue a changed square carries, and the word for that change. */
export function editPeriodKeyEntryTestID(change: PeriodChange): string {
  return `${editPeriodKeyTestID}-${change}`;
}

/** Points. The arrow is read at the size every other way back is read at. */
const BACK_MARK_SIZE = 22;

/** The icon set holds one chevron, pointing the way on, so the way back is that drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

interface PickerProps {
  /** The month she is correcting, named by any day in it. */
  readonly month: string;
  /** Her own day, which is the last day she may say she bled on. */
  readonly today: string;
  /** The days of that month, each one carrying its cycle day and what happened on it. */
  readonly days: readonly HerDay[];
  /** The days she is holding as her period right now, which is what a tick says. */
  readonly ticked: readonly string[];
  readonly onToggle: (day: string) => void;
}

/**
 * The month in its range mode: every day she bled on carries a tick, and a press turns one on or
 * off. The grid is the one the first run and the calendar draw, because a woman who has learnt to
 * read one month has learnt to read all three.
 */
export function PeriodRangePicker({
  month,
  today,
  days,
  ticked,
  onToggle,
}: PickerProps): ReactNode {
  const held = new Map(days.map((day) => [day.day, day]));
  const hers = new Set(ticked);

  const squareOf = (day: string): MonthSquare => {
    const mine = held.get(day);

    if (mine === undefined) {
      throw new Error(`the month drew ${day} and the cycle says nothing about it`);
    }

    // The tick is the whole answer on this screen, so a day is not filled as well for having been
    // recorded as a bleeding day: a day she just took off would stay filled and say the opposite of
    // its own tick. Today's ring and the days her next period is expected on are kept, because
    // neither of those answers the question this screen asks.
    const square = {
      mark: mine.mark === 'bled' ? ('plain' as const) : mine.mark,
      ...(mine.cycleDay === undefined ? {} : { cycleDay: mine.cycleDay }),
    };

    // The same rule the day itself reads, so the picker never offers a day the day would refuse. A
    // range she could drag into next week would let her record a forecast as a fact.
    if (refusalFor({ day, today }) !== undefined) {
      return {
        ...square,
        label: aDayOutOfReachLabel(mine, today),
        outOfReach: true,
        role: 'button',
      };
    }

    return {
      ...square,
      chosen: hers.has(day),
      label: herDayLabel(mine, today),
      onPress: () => onToggle(day),
      role: 'checkbox',
    };
  };

  return <CycleMonth month={month} squareOf={squareOf} testID={periodRangePickerTestID} />;
}

interface Props extends PickerProps {
  /** The days Emi held when she opened the screen, which is what the line under the grid counts from. */
  readonly held: readonly string[];
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

/**
 * Her whole period, corrected in one action.
 *
 * Nothing is written until she presses Save, so both ways out of the header leave her period as it
 * was. Save is offered only once something has changed: a save of the days Emi already holds would
 * raise a revision on every one of them and send the server records it already has. It is taken
 * away again if she clears the grid, and the line under it says why.
 */
export function EditPeriodScreen({
  month,
  today,
  days,
  held,
  ticked,
  onToggle,
  onSave,
  onCancel,
}: Props): ReactNode {
  const changed = whatSheChanged({ held, ticked });

  return (
    <Screen testID={editPeriodScreenTestID}>
      <View style={styles.header} testID={editPeriodHeaderTestID}>
        <Pressable
          accessibilityLabel={editPeriodCopy.back}
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.back}
          testID={editPeriodBackTestID}
        >
          <View style={styles.backMark}>
            <Icon colour={colour.text} name="chevron" size={BACK_MARK_SIZE} />
          </View>
        </Pressable>

        <Text accessibilityRole="header" style={styles.title} testID={editPeriodTitleTestID}>
          {editPeriodCopy.title}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.cancel}
          testID={editPeriodCancelTestID}
        >
          <Text style={styles.cancelLabel}>{editPeriodCopy.cancel}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <Text style={styles.lead} testID={editPeriodLeadTestID}>
          {whatEmiHoldsSaid(held)}
        </Text>

        <PeriodRangePicker
          days={days}
          month={month}
          onToggle={onToggle}
          ticked={ticked}
          today={today}
        />

        <Text style={styles.change} testID={editPeriodChangeTestID}>
          {ticked.length === 0 ? editPeriodCopy.noDayLeft : whatSheChangedSaid(changed)}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          isReady={sheCanSave({ held, ticked })}
          label={editPeriodCopy.save}
          onPress={onSave}
          testID={editPeriodSaveTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  backMark: { transform: TURNED_AROUND },
  body: {
    flexGrow: 1,
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceMd,
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceSm,
  },
  cancelLabel: {
    color: colour.accent,
    ...textStyle('label-md'),
  },
  // What she changed sits under the grid rather than over it, because the grid is the answer and
  // this line is what Emi read back off it.
  change: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
    marginTop: space.spaceMd,
  },
  footer: {
    borderTopColor: colour.line,
    borderTopWidth: stroke.hairline,
    padding: space.spaceLg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.spaceSm,
    paddingTop: space.spaceSm,
  },
  lead: {
    color: colour.text,
    ...textStyle('body-lg'),
  },
  scroll: { flex: 1 },
  title: {
    color: colour.text,
    ...textStyle('label-md'),
  },
});
