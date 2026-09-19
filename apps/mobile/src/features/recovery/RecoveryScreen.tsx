import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type RecoveryScreen as Which, recoveryStepLabel } from './copy';

/**
 * The frame the three recovery screens share. It is the onboarding frame in everything but its
 * step labels, and it is a second component rather than a prop on the first one because the first
 * run is three screens by contract SCREEN-1 and this flow is not part of it.
 */
interface Props {
  readonly screen: Which;
  readonly title: string;
  readonly lines: readonly string[];
  readonly actionLabel: string;
  readonly actionIsReady?: boolean;
  readonly onAction: () => void;
  readonly children?: ReactNode;
}

export const recoveryActionTestID = 'recovery-action';

export function RecoveryScreen({
  screen,
  title,
  lines,
  actionLabel,
  actionIsReady = true,
  onAction,
  children,
}: Props): ReactNode {
  return (
    <View style={styles.screen} testID={`recovery-${screen}`}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.step}>{recoveryStepLabel(screen)}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {lines.map((line) => (
          <Text key={line} style={styles.line}>
            {line}
          </Text>
        ))}
        {children}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !actionIsReady }}
        disabled={!actionIsReady}
        onPress={onAction}
        style={actionIsReady ? styles.action : [styles.action, styles.actionWaiting]}
        testID={recoveryActionTestID}
      >
        <Text style={styles.actionLabel}>{actionLabel}</Text>
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
    margin: space.base,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  actionLabel: {
    color: colour.surface,
    ...textStyle('body-lg'),
  },
  actionWaiting: { opacity: 0.4 },
  body: { padding: space.base, paddingTop: space.loose },
  line: {
    color: colour.body,
    ...textStyle('body-lg'),
    marginBottom: space.snug,
  },
  screen: { backgroundColor: colour.stone, flex: 1 },
  step: {
    color: colour.muted,
    ...textStyle('label-sm'),
    marginBottom: space.snug,
  },
  title: {
    color: colour.ink,
    ...textStyle('headline-lg'),
    marginBottom: space.base,
  },
});
