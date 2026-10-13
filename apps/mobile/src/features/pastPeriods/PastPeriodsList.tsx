import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  pastPeriodDateSaid,
  pastPeriodLengthSaid,
  pastPeriodNumberSaid,
  pastPeriodsCopy,
} from './copy';
import { PAST_PERIODS_ASKED, type PastPeriod } from './pastPeriods';

export const pastPeriodsListTestID = 'past-periods';

/** One row of the list, named by its place, the newest period first. */
export function pastPeriodRowTestID(row: number): string {
  return `past-period-${row + 1}`;
}

/** The number in the circle at the start of a row. */
export function pastPeriodNumberTestID(row: number): string {
  return `past-period-number-${row + 1}`;
}

/** Points. The circle the number of a row stands in, at the size the board draws it. */
const NUMBER_CIRCLE = 36;
/** Points. The arrow at the end of a row. */
const ROW_MARK_SIZE = 18;
/** Points. The ring of a circle, solid for a period she gave and dashed for the next to give. */
const CIRCLE_RING = 2;
/** The rows she cannot open yet are drawn quieter. */
const NOT_YET = 0.45;

interface Props {
  /** The periods she gave, the newest first. */
  readonly periods: readonly PastPeriod[];
  /** Opens the picker on a row. */
  readonly onOpen: (row: number) => void;
}

/**
 * Her last three periods as the board draws them: one row each, the start date and the length of a
 * period she gave, and "Add the start date" on a row she has not. A row opens only once the row
 * above it is given, because each start is measured as one cycle before the start above it. Every
 * row after the first says she can skip it.
 */
export function PastPeriodsList({ periods, onOpen }: Props): ReactNode {
  return (
    <View style={styles.card} testID={pastPeriodsListTestID}>
      {Array.from({ length: PAST_PERIODS_ASKED }, (_unused, row) => (
        <PastPeriodRow
          canOpen={row <= periods.length}
          key={row}
          onOpen={() => onOpen(row)}
          row={row}
          {...(periods[row] === undefined ? {} : { period: periods[row] })}
        />
      ))}
    </View>
  );
}

interface RowProps {
  readonly row: number;
  readonly period?: PastPeriod;
  readonly canOpen: boolean;
  readonly onOpen: () => void;
}

function PastPeriodRow({ row, period, canOpen, onOpen }: RowProps): ReactNode {
  const lead =
    period === undefined ? pastPeriodsCopy.addStart : pastPeriodDateSaid(period.startedOn);
  const under =
    period === undefined
      ? row === 0
        ? undefined
        : pastPeriodsCopy.skipThisOne
      : pastPeriodLengthSaid(period.lengthDays);

  return (
    <Pressable
      accessibilityLabel={[pastPeriodNumberSaid(row), lead, under].filter(Boolean).join(', ')}
      accessibilityRole="button"
      accessibilityState={{ disabled: !canOpen }}
      disabled={!canOpen}
      onPress={onOpen}
      style={[
        styles.row,
        row === 0 ? null : styles.rowUnderAnother,
        canOpen ? null : styles.notYet,
      ]}
      testID={pastPeriodRowTestID(row)}
    >
      <View
        style={[styles.circle, period === undefined ? styles.circleToGive : styles.circleGiven]}
        testID={pastPeriodNumberTestID(row)}
      >
        <Text style={period === undefined ? styles.numberToGive : styles.numberGiven}>
          {row + 1}
        </Text>
      </View>
      <View style={styles.words}>
        <Text style={period === undefined ? styles.leadToGive : styles.lead}>{lead}</Text>
        {under === undefined ? null : <Text style={styles.under}>{under}</Text>}
      </View>
      <Icon colour={colour.secondaryText} name="chevron" size={ROW_MARK_SIZE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceXs,
  },
  circle: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: CIRCLE_RING,
    height: NUMBER_CIRCLE,
    justifyContent: 'center',
    width: NUMBER_CIRCLE,
  },
  circleGiven: { backgroundColor: colour.accent, borderColor: colour.accent },
  circleToGive: {
    backgroundColor: colour.card,
    borderColor: colour.accent,
    borderStyle: 'dashed',
  },
  lead: { color: colour.text, ...textStyle('choice-sm') },
  leadToGive: { color: colour.accent, ...textStyle('choice-sm') },
  notYet: { opacity: NOT_YET },
  numberGiven: { color: colour.onAccent, ...textStyle('label-md') },
  numberToGive: { color: colour.accent, ...textStyle('label-md') },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceMd,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingVertical: space.spaceMd,
  },
  rowUnderAnother: { borderTopColor: colour.line, borderTopWidth: StyleSheet.hairlineWidth },
  under: { color: colour.secondaryText, ...textStyle('body-sm') },
  words: { flex: 1, gap: 2 },
});
