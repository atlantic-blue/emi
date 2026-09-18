import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
    <View style={styles.screen} testID={lockScreenTestID}>
      <Text style={styles.wordmark}>{lockCopy.locked.wordmark}</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {lockCopy.locked.title}
      </Text>
      <Text style={styles.line}>{wasRefused ? lockCopy.locked.refused : lockCopy.locked.line}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onUnlock}
        style={styles.action}
        testID={unlockTestID}
      >
        <Text style={styles.actionLabel}>{lockCopy.locked.action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colour.ember,
    borderRadius: radius.chip,
    justifyContent: 'center',
    marginTop: space.base,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  actionLabel: {
    color: colour.surface,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
  },
  line: {
    color: colour.body,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
    textAlign: 'center',
  },
  screen: {
    alignItems: 'center',
    backgroundColor: colour.stone,
    flex: 1,
    justifyContent: 'center',
    padding: space.base,
  },
  title: {
    color: colour.ink,
    fontSize: typeScale.title.size,
    lineHeight: typeScale.title.lineHeight,
    marginBottom: space.snug,
    marginTop: space.base,
  },
  wordmark: {
    color: colour.ember,
    fontSize: typeScale.display.size,
    lineHeight: typeScale.display.lineHeight,
  },
});
