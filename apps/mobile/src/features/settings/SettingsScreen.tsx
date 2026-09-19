import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Screen } from '../../components/Screen';
import { settingsCopy } from './copy';

export const settingsScreenTestID = 'settings-screen';
export const settingsDeleteTestID = 'settings-delete';
export const settingsBackTestID = 'settings-back';

interface Props {
  readonly onDelete: () => void;
  readonly onBack: () => void;
}

/** The way to the one thing in here, and the way back out of it. */
export function SettingsScreen({ onDelete, onBack }: Props): ReactNode {
  return (
    <Screen testID={settingsScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {settingsCopy.settings.title}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={styles.row}
          testID={settingsDeleteTestID}
        >
          <Text style={styles.rowLabel}>{settingsCopy.settings.delete}</Text>
        </Pressable>

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
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  body: { flexGrow: 1, paddingHorizontal: space.spaceLg, paddingVertical: space.spaceXl },
  row: {
    backgroundColor: colour.surfaceContainerLowest,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: space.spaceLg,
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
  },
  rowLabel: {
    color: colour.onSurface,
    ...textStyle('body-lg'),
  },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
  },
});
