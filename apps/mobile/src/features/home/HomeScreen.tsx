import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const logTodayTestID = 'home-log-today';
export const logTodayLabel = 'Log today';

interface Props {
  readonly onLogToday: () => void;
}

/**
 * The ring and the forecast land here with feature 3. Until then the home screen carries the
 * wordmark and the one way in to the thing she opens Emi to do, because a screen she cannot reach
 * is a feature she does not have.
 */
export function HomeScreen({ onLogToday }: Props): ReactNode {
  return (
    <View style={styles.screen} testID="home-screen">
      <Text accessibilityRole="header" style={styles.wordmark}>
        Emi
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onLogToday}
        style={styles.action}
        testID={logTodayTestID}
      >
        <Text style={styles.actionLabel}>{logTodayLabel}</Text>
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
    marginTop: space.roomy,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  actionLabel: {
    color: colour.surface,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
  },
  screen: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  wordmark: { fontSize: 34, letterSpacing: 1 },
});
