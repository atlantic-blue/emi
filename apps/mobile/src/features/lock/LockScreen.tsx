import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { lockCopy } from './copy';

export const lockScreenTestID = 'lock-screen';
export const unlockTestID = 'lock-unlock';

interface Props {
  /** Shown once she has refused or cancelled the platform prompt, and not before. */
  readonly wasRefused: boolean;
  readonly onUnlock: () => void;
}

/**
 * What she sees on her way back in. It carries the wordmark, one line of what to do, and the
 * button that asks the platform again, because a prompt she cancelled leaves a screen that can do
 * nothing at all unless something on it asks a second time.
 */
export function LockScreen({ wasRefused, onUnlock }: Props): ReactNode {
  return (
    <Screen testID={lockScreenTestID}>
      <View style={styles.middle}>
        <Text style={styles.wordmark}>{lockCopy.locked.wordmark}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {lockCopy.locked.title}
        </Text>
        <Text style={styles.line}>
          {wasRefused ? lockCopy.locked.refused : lockCopy.locked.line}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onUnlock}
          style={styles.action}
          testID={unlockTestID}
        >
          <Text style={styles.actionLabel}>{lockCopy.locked.action}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colour.surfaceTint,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: space.spaceLg,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  actionLabel: {
    color: colour.surfaceContainerLowest,
    ...textStyle('body-lg'),
  },
  line: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  middle: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: space.spaceLg,
  },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceMd,
    marginTop: space.spaceLg,
  },
  wordmark: {
    color: colour.primary,
    ...textStyle('display-lg-mobile'),
  },
});
