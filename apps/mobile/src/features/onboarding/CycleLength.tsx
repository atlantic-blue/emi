import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen } from './OnboardingScreen';
import { cycleLengthDaysLabel, firstRunCopy } from './copy';
import { maximumCycleLengthDays, minimumCycleLengthDays } from './firstRun';

export const shorterTestID = 'cycle-length-shorter';
export const longerTestID = 'cycle-length-longer';
export const cycleLengthTestID = 'cycle-length-days';

interface Props {
  readonly days: number;
  readonly onChange: (days: number) => void;
  readonly onDone: () => void;
}

/**
 * Screen three of three. The last answer she gives, and the one the first forecast is made from.
 *
 * The number is the largest thing on the screen because it is the answer, and it is set in the
 * monospaced face so a digit does not shift sideways as she presses.
 *
 * Done is the one control of the first run that writes, so it takes one press. It goes out as
 * she presses it and stays out. The home screen takes a moment to arrive, and her thumb is
 * already on the glass.
 */
export function CycleLength({ days, onChange, onDone }: Props): ReactNode {
  const [pressed, setPressed] = useState(false);
  const canShorten = days > minimumCycleLengthDays;
  const canLengthen = days < maximumCycleLengthDays;

  return (
    <OnboardingScreen
      actionIsReady={!pressed}
      actionLabel={firstRunCopy.cycleLength.action}
      lines={firstRunCopy.cycleLength.lines}
      onAction={() => {
        setPressed(true);
        onDone();
      }}
      screen="cycleLength"
      title={firstRunCopy.cycleLength.title}
    >
      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel={firstRunCopy.shorter}
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
          {cycleLengthDaysLabel(days)}
        </Text>
        <Pressable
          accessibilityLabel={firstRunCopy.longer}
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
    ...textStyle('headline-xl'),
  },
  step: {
    alignItems: 'center',
    backgroundColor: colour.emberTint,
    borderColor: colour.ember,
    borderRadius: radius.round,
    borderWidth: stroke.hairline,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  stepMark: {
    color: colour.ember,
    ...textStyle('headline-md'),
  },
  stepSpent: { opacity: 0.4 },
  stepper: {
    alignItems: 'center',
    backgroundColor: colour.surface,
    borderColor: colour.hairline,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    flexDirection: 'row',
    gap: space.base,
    justifyContent: 'center',
    paddingHorizontal: space.base,
    paddingVertical: space.roomy,
  },
});
