import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
    <View style={styles.screen} testID={settingsScreenTestID}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.base,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  backLabel: {
    color: colour.body,
    ...textStyle('body-lg'),
  },
  body: { flexGrow: 1, paddingHorizontal: space.base, paddingVertical: space.roomy },
  row: {
    backgroundColor: colour.surface,
    borderRadius: radius.chip,
    justifyContent: 'center',
    marginTop: space.base,
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.snug,
  },
  rowLabel: {
    color: colour.ink,
    ...textStyle('body-lg'),
  },
  screen: { backgroundColor: colour.stone, flex: 1 },
  title: {
    color: colour.ink,
    ...textStyle('headline-lg'),
  },
});
