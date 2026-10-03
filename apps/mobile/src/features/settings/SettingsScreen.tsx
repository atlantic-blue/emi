import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { settingsCopy } from './copy';

export const settingsScreenTestID = 'settings-screen';
export const settingsTitleTestID = 'settings-title';
export const settingsBackTestID = 'settings-back';
/** The dark card over the rows, which says who can read her days. */
export const settingsAssuranceTestID = 'settings-assurance';

/** The one card the rows stand on, which is what carries the hairline between two of them. */
export const settingsRowsTestID = 'settings-rows';

/**
 * The rows of Privacy, in the order she reads them, and the whole of the screen.
 *
 * A row is an answer she already gave, the lock, or one of the two ways out. Nothing else is a
 * row, so the screen cannot grow into a menu without this list growing first, where somebody has
 * to decide about it. The drawing carries a fifth row for the reminder. The reminder is not built,
 * so the row it will take is not drawn and the drawing is the record of where it goes.
 */
export const settingsRows = ['answers', 'lock', 'export', 'delete'] as const;

export type SettingsRow = (typeof settingsRows)[number];

export function settingsRowTestID(row: SettingsRow): string {
  return `settings-row-${row}`;
}

export const settingsAnswersTestID = settingsRowTestID('answers');
export const settingsLockTestID = settingsRowTestID('lock');
export const settingsExportTestID = settingsRowTestID('export');
export const settingsDeleteTestID = settingsRowTestID('delete');

interface RowProps {
  readonly row: SettingsRow;
  readonly lead: string;
  /** What the row does, under its name. Left out where there is nothing true to say yet. */
  readonly line?: string;
  /** Left out by a row that opens nothing, which is the lock. */
  readonly onPress?: () => void;
}

function Row({ row, lead, line, onPress }: RowProps): ReactNode {
  const testID = settingsRowTestID(row);
  const words = (
    <>
      <Text style={styles.rowLead}>{lead}</Text>
      {line === undefined ? null : <Text style={styles.rowLine}>{line}</Text>}
    </>
  );

  if (onPress === undefined) {
    return (
      <View style={styles.row} testID={testID}>
        {words}
      </View>
    );
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row} testID={testID}>
      {words}
    </Pressable>
  );
}

/**
 * Privacy: what she already told Emi, the lock she relies on, and the two ways her data leaves.
 *
 * Delete everything is one row among four rather than the only thing here, because the one action
 * that cannot be undone should not be the only thing she can reach from this screen.
 */
export function SettingsScreen({
  onAnswers,
  onExport,
  onDelete,
  onBack,
}: {
  readonly onAnswers: () => void;
  readonly onExport: () => void;
  readonly onDelete: () => void;
  readonly onBack: () => void;
}): ReactNode {
  return (
    <Screen testID={settingsScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text accessibilityRole="header" style={styles.title} testID={settingsTitleTestID}>
          {settingsCopy.settings.title}
        </Text>

        <Row
          lead={settingsCopy.settings.rows.answers.lead}
          line={settingsCopy.settings.rows.answers.line}
          onPress={onAnswers}
          row="answers"
        />
        <Row
          lead={settingsCopy.settings.rows.lock.lead}
          line={settingsCopy.settings.rows.lock.line}
          row="lock"
        />
        <Row
          lead={settingsCopy.settings.rows.export.lead}
          line={settingsCopy.settings.rows.export.line}
          onPress={onExport}
          row="export"
        />
        <Row
          lead={settingsCopy.settings.rows.delete.lead}
          line={settingsCopy.settings.rows.delete.line}
          onPress={onDelete}
          row="delete"
        />

        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.back}
          testID={settingsBackTestID}
        >
          <Text style={styles.backLabel}>{settingsCopy.settings.back}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.spaceLg,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  backLabel: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
  },
  body: { flexGrow: 1, paddingHorizontal: space.spaceLg, paddingVertical: space.spaceXl },
  row: {
    backgroundColor: colour.card,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: space.spaceMd,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceSm,
    rowGap: space.spaceXs,
  },
  rowLead: {
    color: colour.text,
    ...textStyle('body-lg'),
  },
  rowLine: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  title: {
    color: colour.text,
    ...textStyle('headline-lg'),
  },
});
