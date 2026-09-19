import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Screen } from '../../components/Screen';
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
    <Screen testID={`recovery-${screen}`}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colour.surfaceTint,
    borderRadius: radius.md,
    justifyContent: 'center',
    margin: space.spaceLg,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  actionLabel: {
    color: colour.surfaceContainerLowest,
    ...textStyle('body-lg'),
  },
  actionWaiting: { opacity: 0.4 },
  body: { padding: space.spaceLg, paddingTop: space.spaceXl },
  line: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
    marginBottom: space.spaceMd,
  },
  step: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-sm'),
    marginBottom: space.spaceMd,
  },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceLg,
  },
});
