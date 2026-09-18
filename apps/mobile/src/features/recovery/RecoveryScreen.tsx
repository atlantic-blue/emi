import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale } from '@emi/tokens';
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
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
  },
  actionWaiting: { opacity: 0.4 },
  body: { padding: space.base, paddingTop: space.loose },
  line: {
    color: colour.body,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
    marginBottom: space.snug,
  },
  screen: { backgroundColor: colour.stone, flex: 1 },
  step: {
    color: colour.muted,
    fontSize: typeScale.label.size,
    letterSpacing: typeScale.label.letterSpacing,
    lineHeight: typeScale.label.lineHeight,
    marginBottom: space.snug,
  },
  title: {
    color: colour.ink,
    fontSize: typeScale.title.size,
    lineHeight: typeScale.title.lineHeight,
    marginBottom: space.base,
  },
});
