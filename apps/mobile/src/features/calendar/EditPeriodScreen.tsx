import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { aPeriodRowSaid, editPeriodCopy, whatEmiHoldsSaid, whatSheChangedSaid } from './copy';
import { sheCanSave, whatSheChanged } from './savePeriod';

export const editPeriodScreenTestID = 'edit-period';
export const editPeriodHeaderTestID = 'edit-period-header';
export const editPeriodTitleTestID = 'edit-period-title';
export const editPeriodCancelTestID = 'edit-period-cancel';
export const editPeriodLeadTestID = 'edit-period-lead';
export const editPeriodListTestID = 'edit-period-list';
export const editPeriodChangeTestID = 'edit-period-change';
export const editPeriodSaveTestID = 'edit-period-save';
export const editPeriodAddBeforeTestID = 'edit-period-add-before';
export const editPeriodAddAfterTestID = 'edit-period-add-after';

/** The two kinds of change she can make to the period Emi holds. */
export const periodChanges = ['added', 'takenOff'] as const;

export type PeriodChange = (typeof periodChanges)[number];

/** One row of the list, which is one day she turns on or off. */
export function editPeriodRowTestID(day: string): string {
  return `edit-period-row-${day}`;
}

/** The tag at the end of a row she changed. */
export function editPeriodTagTestID(day: string): string {
  return `edit-period-tag-${day}`;
}

/** The tick circle at the start of a row. */
export function editPeriodTickTestID(day: string): string {
  return `edit-period-tick-${day}`;
}

/** Points. The tick circle, at the size the board draws it. */
const TICK_CIRCLE = 28;
/** Points. The tick inside the circle. */
const TICK_MARK = 16;

interface Props {
  /** The days Emi held when she opened the screen, which is what the sentences count from. */
  readonly held: readonly string[];
  /** The days the list shows, in order. */
  readonly listed: readonly string[];
  /** The days she is holding as her period right now, which is what a tick says. */
  readonly ticked: readonly string[];
  readonly onToggle: (day: string) => void;
  /** Adds the day before the first listed day, which is how she reaches a day outside the list. */
  readonly onAddBefore: () => void;
  /** Adds the day after the last listed day. Nothing where that day is ahead of her. */
  readonly onAddAfter?: () => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

function changeOf(
  day: string,
  changed: { readonly added: readonly string[]; readonly removed: readonly string[] },
): PeriodChange | undefined {
  if (changed.added.includes(day)) {
    return 'added';
  }

  return changed.removed.includes(day) ? 'takenOff' : undefined;
}

/**
 * Her whole period, corrected in one action: one row for each day, a tick for each day she bled,
 * and a tag on each day she changed.
 *
 * Nothing is written until she presses Save, so Cancel leaves her period as it was. Save is offered
 * only once something has changed, and it is taken away again if she takes every day off, because
 * a period holds at least one day.
 */
export function EditPeriodScreen({
  held,
  listed,
  ticked,
  onToggle,
  onAddBefore,
  onAddAfter,
  onSave,
  onCancel,
}: Props): ReactNode {
  const changed = whatSheChanged({ held, ticked });
  const hers = new Set(ticked);

  return (
    <Screen drawsTheWash testID={editPeriodScreenTestID}>
      <View style={styles.header} testID={editPeriodHeaderTestID}>
        <View style={styles.side}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.cancel}
            testID={editPeriodCancelTestID}
          >
            <Text style={styles.cancelLabel}>{editPeriodCopy.cancel}</Text>
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={styles.title} testID={editPeriodTitleTestID}>
          {editPeriodCopy.title}
        </Text>
        <View style={styles.side} />
      </View>

      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <Text style={styles.lead} testID={editPeriodLeadTestID}>
          {whatEmiHoldsSaid(held)}
        </Text>

        <View style={styles.list} testID={editPeriodListTestID}>
          <AddRow
            label={editPeriodCopy.addBefore}
            onPress={onAddBefore}
            testID={editPeriodAddBeforeTestID}
          />
          {listed.map((day) => {
            const isTicked = hers.has(day);
            const change = changeOf(day, changed);

            return (
              <Pressable
                accessibilityLabel={aPeriodRowSaid(day)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isTicked }}
                key={day}
                onPress={() => onToggle(day)}
                style={styles.row}
                testID={editPeriodRowTestID(day)}
              >
                <View
                  style={[styles.tick, isTicked ? styles.tickOn : styles.tickOff]}
                  testID={editPeriodTickTestID(day)}
                >
                  {isTicked ? (
                    <Icon colour={colour.onAccent} name="check" size={TICK_MARK} />
                  ) : null}
                </View>
                <Text style={styles.rowWord}>{aPeriodRowSaid(day)}</Text>
                {change === undefined ? null : (
                  <Text style={styles.tag} testID={editPeriodTagTestID(day)}>
                    {change === 'added' ? editPeriodCopy.added : editPeriodCopy.takenOff}
                  </Text>
                )}
              </Pressable>
            );
          })}
          {onAddAfter === undefined ? null : (
            <AddRow
              label={editPeriodCopy.addAfter}
              onPress={onAddAfter}
              testID={editPeriodAddAfterTestID}
            />
          )}
        </View>

        <View style={styles.change}>
          <Text style={styles.changeWords} testID={editPeriodChangeTestID}>
            {ticked.length === 0 ? editPeriodCopy.noDayLeft : whatSheChangedSaid(changed)}
          </Text>
        </View>
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

interface AddRowProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly testID: string;
}

/**
 * A way to a day outside the list. The board lists the days of her period and nothing else, and a
 * period that started a day earlier than Emi holds would have no row to press without this.
 */
function AddRow({ label, onPress, testID }: AddRowProps): ReactNode {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.addRow} testID={testID}>
      <Text style={styles.addWord}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addRow: { justifyContent: 'center', minHeight: MINIMUM_TAP_TARGET },
  addWord: { color: colour.accent, ...textStyle('choice-sm') },
  body: {
    flexGrow: 1,
    gap: space.spaceMd,
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceMd,
  },
  cancel: { justifyContent: 'center', minHeight: MINIMUM_TAP_TARGET, minWidth: MINIMUM_TAP_TARGET },
  cancelLabel: { color: colour.secondaryText, ...textStyle('choice-sm') },
  change: {
    backgroundColor: colour.accentSoft,
    borderRadius: radius.xl,
    padding: space.spaceMd,
  },
  changeWords: { color: colour.text, ...textStyle('body-sm') },
  footer: { padding: space.spaceLg },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceSm,
  },
  lead: { color: colour.text, ...textStyle('body-lg') },
  list: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    paddingHorizontal: space.spaceMd,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colour.line,
    borderBottomWidth: stroke.hairline,
    flexDirection: 'row',
    gap: space.spaceMd,
    minHeight: 56,
    minWidth: MINIMUM_TAP_TARGET,
  },
  rowWord: { color: colour.text, flex: 1, ...textStyle('choice-lg') },
  scroll: { flex: 1 },
  side: { width: 88 },
  tag: { color: colour.accent, ...textStyle('label-md') },
  tick: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: TICK_CIRCLE,
    justifyContent: 'center',
    width: TICK_CIRCLE,
  },
  tickOff: { borderColor: colour.line, borderStyle: 'solid', borderWidth: stroke.icon },
  tickOn: { backgroundColor: colour.accent },
  title: { color: colour.text, textAlign: 'center', ...textStyle('headline-sm') },
});
