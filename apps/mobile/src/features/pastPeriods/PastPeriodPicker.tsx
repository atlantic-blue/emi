import { addDays } from '@emi/cycle';
import { colour, radius, space, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextLink } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { NumberWheel } from '../../components/NumberWheel';
import { Calendar } from '../onboarding/Calendar';
import { pastPeriodLengthSaid, pastPeriodNumberSaid, pastPeriodsCopy } from './copy';
import {
  type PastPeriod,
  longestCycleBetweenDays,
  pastPeriodLengthOpensOn,
  pastPeriodLengthsOffered,
  startIsInRangeAt,
  stillGoingCanStartOn,
} from './pastPeriods';

export const pastPeriodPickerTestID = 'past-period-picker';
export const pastPeriodPickerTitleTestID = 'past-period-picker-title';
export const pastPeriodPickerDoneTestID = 'past-period-picker-done';
export const pastPeriodPickerRemoveTestID = 'past-period-picker-remove';
export const pastPeriodPickerCancelTestID = 'past-period-picker-cancel';
export const pastPeriodPickerRefusedTestID = 'past-period-picker-refused';
export const pastPeriodLengthWheelTestID = 'past-period-length-wheel';
export const pastPeriodLengthPillTestID = 'past-period-length-pill';
export const pastPeriodStillGoingTestID = 'past-period-still-going';
export const pastPeriodStillGoingRefusedTestID = 'past-period-still-going-refused';

/** The row for one length, named so a test presses the length rather than a place on the wheel. */
export function pastPeriodLengthTestID(days: number): string {
  return `past-period-length-${days}`;
}

/** Days. Where the month of a row under another opens: one usual cycle before the row above. */
const USUAL_CYCLE_DAYS = 28;

/** How long a period ran: a number of days, or still going, which only the newest one can be. */
type PeriodRun = number | 'still-going';

function theRunOf(period: PastPeriod | undefined): PeriodRun | undefined {
  if (period === undefined) {
    return undefined;
  }

  return period.lengthDays ?? 'still-going';
}

/** The page under the sheet is dimmed with the ink of the text, at this much of its strength. */
const SHADE = 0.42;

interface Props {
  readonly row: number;
  /** Every period she gave, the newest first, which is what a row's range is measured from. */
  readonly periods: readonly PastPeriod[];
  readonly today: string;
  /** The oldest start the newest row takes. */
  readonly oldest: string;
  readonly onDone: (period: PastPeriod) => void;
  /** Takes the row off. Offered only on a row she already gave. */
  readonly onRemove: () => void;
  readonly onCancel: () => void;
  /** Offers "Still going" on the newest row. The first run offers it, for a period that has begun. */
  readonly newestCanBeStillGoing?: boolean;
}

/**
 * One period: the day it started on a month grid, and how many days it ran on a wheel. A sheet over
 * the list, so the list she is building stays where she left it.
 *
 * Nothing is chosen until she presses a day and turns or taps a length, so Done waits for both, and
 * for a start one cycle before the period above. A row she gave opens on her own answer.
 *
 * Where the newest period can be still going, "Still going" stands under the wheel as the other
 * answer to how long it lasted. It holds no length, so Emi writes the days up to today and no more,
 * and only for a start recent enough to be one period.
 */
export function PastPeriodPicker({
  row,
  periods,
  today,
  oldest,
  onDone,
  onRemove,
  onCancel,
  newestCanBeStillGoing = false,
}: Props): ReactNode {
  const insets = useSafeAreaInsets();
  const given = periods[row];
  const above = periods[row - 1];
  const [startedOn, setStartedOn] = useState<string | undefined>(given?.startedOn);
  const [run, setRun] = useState<PeriodRun | undefined>(theRunOf(given));
  const startIsInRange =
    startedOn !== undefined && startIsInRangeAt(row, startedOn, periods, { today, oldest });
  const offersStillGoing = newestCanBeStillGoing && row === 0;
  const stillGoingIsRefused =
    run === 'still-going' &&
    startedOn !== undefined &&
    startIsInRange &&
    !stillGoingCanStartOn(startedOn, today);
  const isReady = startIsInRange && run !== undefined && !stillGoingIsRefused;

  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent visible>
      <View style={styles.scrim}>
        <View pointerEvents="none" style={styles.shade} />
        <Pressable
          accessibilityLabel={pastPeriodsCopy.cancel}
          onPress={onCancel}
          style={styles.above}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + space.spaceLg }]}
          testID={pastPeriodPickerTestID}
        >
          <ScrollView contentContainerStyle={styles.body} nestedScrollEnabled>
            <Text
              accessibilityRole="header"
              style={styles.title}
              testID={pastPeriodPickerTitleTestID}
            >
              {pastPeriodNumberSaid(row)}
            </Text>

            <Text style={styles.question}>{pastPeriodsCopy.start}</Text>
            {above === undefined ? (
              <Calendar
                canChoose={(day) => startIsInRangeAt(0, day, periods, { today, oldest })}
                chosen={startedOn}
                earliest={oldest}
                latest={today}
                onChoose={setStartedOn}
                opensOn={startedOn ?? today}
                today={today}
              />
            ) : (
              <Calendar
                canChoose={() => true}
                chosen={startedOn}
                earliest={addDays(above.startedOn, -longestCycleBetweenDays)}
                latest={above.startedOn}
                onChoose={setStartedOn}
                opensOn={startedOn ?? addDays(above.startedOn, -USUAL_CYCLE_DAYS)}
                today={today}
              />
            )}
            {startedOn !== undefined && !startIsInRange ? (
              <Text style={styles.refused} testID={pastPeriodPickerRefusedTestID}>
                {pastPeriodsCopy.outOfRange}
              </Text>
            ) : null}

            <Text style={styles.question}>{pastPeriodsCopy.length}</Text>
            <NumberWheel
              chosen={typeof run === 'number' ? run : undefined}
              labelOf={pastPeriodLengthSaid}
              onChoose={setRun}
              opensOn={pastPeriodLengthOpensOn}
              pillTestID={pastPeriodLengthPillTestID}
              testID={pastPeriodLengthWheelTestID}
              testIDOf={pastPeriodLengthTestID}
              values={pastPeriodLengthsOffered}
            />
            {offersStillGoing ? (
              <View style={styles.stillGoing}>
                <Chip
                  isChosen={run === 'still-going'}
                  label={pastPeriodsCopy.stillGoing}
                  onPress={() => setRun(run === 'still-going' ? undefined : 'still-going')}
                  testID={pastPeriodStillGoingTestID}
                />
              </View>
            ) : null}
            {stillGoingIsRefused ? (
              <Text style={styles.refused} testID={pastPeriodStillGoingRefusedTestID}>
                {pastPeriodsCopy.stillGoingTooLongAgo}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.foot}>
            <PrimaryButton
              isReady={isReady}
              label={pastPeriodsCopy.done}
              onPress={() => {
                if (!isReady || startedOn === undefined || run === undefined) {
                  return;
                }
                onDone(run === 'still-going' ? { startedOn } : { lengthDays: run, startedOn });
              }}
              testID={pastPeriodPickerDoneTestID}
            />
            {given === undefined ? null : (
              <TextLink
                label={pastPeriodsCopy.remove}
                onPress={onRemove}
                testID={pastPeriodPickerRemoveTestID}
              />
            )}
            <TextLink
              label={pastPeriodsCopy.cancel}
              onPress={onCancel}
              testID={pastPeriodPickerCancelTestID}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  above: { flex: 1, minHeight: space.marginLg },
  body: { gap: space.spaceMd, paddingBottom: space.spaceMd },
  foot: { gap: space.spaceXs, paddingTop: space.spaceSm },
  question: { color: colour.text, ...textStyle('headline-sm') },
  refused: { color: colour.accent, textAlign: 'center', ...textStyle('body-sm') },
  scrim: { flex: 1 },
  stillGoing: { alignItems: 'center' },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: colour.text, opacity: SHADE },
  sheet: {
    backgroundColor: colour.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '92%',
    // The calendar keeps the first run gutter, so each square still clears the tap target.
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceLg,
  },
  title: { color: colour.text, ...textStyle('headline-md') },
});
