import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy } from './copy';
import { maximumCycleLengthDays, minimumCycleLengthDays } from './firstRun';

export const shorterTestID = 'cycle-length-shorter';
export const longerTestID = 'cycle-length-longer';
export const cycleLengthTestID = 'cycle-length-days';

interface Props {
  readonly days: number;
  readonly onChange: (days: number) => void;
  readonly onDone: () => void;
}

/** Screen three of three. The last answer she gives, and the one the first forecast is made from. */
export function CycleLength({ days, onChange, onDone }: Props): ReactNode {
  const canShorten = days > minimumCycleLengthDays;
  const canLengthen = days < maximumCycleLengthDays;

  return (
    <OnboardingScreen
      actionLabel={firstRunCopy.cycleLength.action}
      lines={firstRunCopy.cycleLength.lines}
      onAction={onDone}
      screen="cycleLength"
      title={firstRunCopy.cycleLength.title}
    >
      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel="One day shorter"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canShorten }}
          disabled={!canShorten}
          onPress={() => onChange(days - 1)}
          style={canShorten ? styles.step : [styles.step, styles.stepSpent]}
          testID={shorterTestID}
        >
          <Text style={styles.stepMark}>-</Text>
        </Pressable>
        <Text style={styles.days} testID={cycleLengthTestID}>
          {days} days
        </Text>
        <Pressable
          accessibilityLabel="One day longer"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canLengthen }}
          disabled={!canLengthen}
          onPress={() => onChange(days + 1)}
          style={canLengthen ? styles.step : [styles.step, styles.stepSpent]}
          testID={longerTestID}
        >
          <Text style={styles.stepMark}>+</Text>
        </Pressable>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  days: {
    color: colour.ink,
    fontSize: typeScale.display.size,
    letterSpacing: typeScale.label.letterSpacing,
    lineHeight: typeScale.display.lineHeight,
  },
  step: {
    alignItems: 'center',
    backgroundColor: colour.sunk,
    borderRadius: radius.round,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  stepMark: {
    color: colour.ink,
    fontSize: typeScale.heading.size,
    lineHeight: typeScale.heading.lineHeight,
  },
  stepSpent: { opacity: 0.4 },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.base,
    marginBottom: space.base,
    marginTop: space.snug,
  },
});
