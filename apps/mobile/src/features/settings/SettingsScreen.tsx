import { type IconName, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TextLink } from '../../components/Button';
import { RowGroup } from '../../components/RowGroup';
import { Screen } from '../../components/Screen';
import { SettingsRow } from '../../components/SettingsRow';
import { promiseCopy } from '../onboarding/copy';
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

export type SettingsRowName = (typeof settingsRows)[number];

export function settingsRowTestID(row: SettingsRowName): string {
  return `settings-row-${row}`;
}

export const settingsAnswersTestID = settingsRowTestID('answers');
export const settingsLockTestID = settingsRowTestID('lock');
export const settingsExportTestID = settingsRowTestID('export');
export const settingsDeleteTestID = settingsRowTestID('delete');

/** The symbol each row carries, so a column of rows reads as symbols before it reads as words. */
const theSymbolOf: Readonly<Record<SettingsRowName, IconName>> = {
  answers: 'note',
  lock: 'lock',
  export: 'export',
  delete: 'delete',
};

/** Points. The square the shield stands in on the dark card, which holds one drawing and no word. */
const ASSURANCE_TILE = 48;

/** Points. The shield inside that square. */
const ASSURANCE_ICON = 26;

/**
 * Privacy: what she already told Emi, the lock she relies on, and the two ways her data leaves.
 *
 * The promise stands at the top in the one colour that reverses, because the rows underneath only
 * make sense to somebody who already knows that nobody else can read any of it. The words are the
 * promise's own, said at the first run and repeated here rather than written again.
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
    <Screen drawsTheWash testID={settingsScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text accessibilityRole="header" style={styles.title} testID={settingsTitleTestID}>
          {settingsCopy.settings.title}
        </Text>

        <View style={styles.assurance} testID={settingsAssuranceTestID}>
          <View style={styles.assuranceTile}>
            <Icon colour={colour.washAmber} name="shield" size={ASSURANCE_ICON} />
          </View>
          <View style={styles.assuranceWords}>
            <Text style={styles.assuranceLead}>{promiseCopy.title}</Text>
            <Text style={styles.assuranceLine}>{promiseCopy.lines.encrypted.title}</Text>
          </View>
        </View>

        <RowGroup testID={settingsRowsTestID}>
          <SettingsRow
            icon={theSymbolOf.answers}
            label={settingsCopy.settings.rows.answers.lead}
            line={settingsCopy.settings.rows.answers.line}
            onPress={onAnswers}
            testID={settingsAnswersTestID}
          />
          <SettingsRow
            icon={theSymbolOf.lock}
            label={settingsCopy.settings.rows.lock.lead}
            line={settingsCopy.settings.rows.lock.line}
            testID={settingsLockTestID}
          />
          <SettingsRow
            icon={theSymbolOf.export}
            label={settingsCopy.settings.rows.export.lead}
            line={settingsCopy.settings.rows.export.line}
            onPress={onExport}
            testID={settingsExportTestID}
          />
          <SettingsRow
            icon={theSymbolOf.delete}
            label={settingsCopy.settings.rows.delete.lead}
            line={settingsCopy.settings.rows.delete.line}
            onPress={onDelete}
            testID={settingsDeleteTestID}
          />
        </RowGroup>

        <View style={styles.away}>
          <TextLink
            label={settingsCopy.settings.back}
            onPress={onBack}
            testID={settingsBackTestID}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The one surface that reverses, so the white on it is the white the palette measured there.
  assurance: {
    alignItems: 'center',
    backgroundColor: colour.darkCard,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: space.spaceLg,
    marginBottom: space.spaceLg,
    padding: space.spaceLg,
  },
  assuranceLead: {
    color: colour.onAccent,
    ...textStyle('choice-lg'),
  },
  assuranceLine: {
    color: colour.onAccent,
    ...textStyle('body-sm'),
  },
  assuranceTile: {
    alignItems: 'center',
    backgroundColor: colour.accentPressed,
    borderRadius: radius.lg,
    height: ASSURANCE_TILE,
    justifyContent: 'center',
    width: ASSURANCE_TILE,
  },
  assuranceWords: { flexShrink: 1, rowGap: space.spaceXs },
  away: { alignItems: 'center', marginTop: space.spaceLg },
  body: { flexGrow: 1, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  title: {
    color: colour.text,
    marginBottom: space.spaceLg,
    ...textStyle('headline-lg'),
  },
});
