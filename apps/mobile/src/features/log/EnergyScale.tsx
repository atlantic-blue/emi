import { highestEnergy, lowestEnergy } from '@emi/crypto';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { words } from '../../language';

/**
 * One number a day, from one to five. The ends of the range come from the record format rather
 * than from a number typed here, so a scale that offers a level the envelope refuses cannot exist.
 */
export const energyLevels: readonly number[] = Array.from(
  { length: highestEnergy - lowestEnergy + 1 },
  (_, step) => lowestEnergy + step,
);

/** A number on its own tells her nothing, so each level carries the word she would use for it. */
export const energyNames: Readonly<Record<number, string>> = {
  1: words('log.energy.name.1'),
  2: words('log.energy.name.2'),
  3: words('log.energy.name.3'),
  4: words('log.energy.name.4'),
  5: words('log.energy.name.5'),
};

export const energyHeading = words('log.energy.heading');
export const nothingChosen = words('log.energy.nothingChosen');

export function energyName(level: number): string {
  return energyNames[level] ?? words('log.energy.level', undefined, { level });
}

export interface EnergyScaleProps {
  /** Absent while she has logged no energy for the day, because none is not the same as one. */
  readonly level?: number;
  /** Called with the level she pressed, or with nothing when she pressed the one already set. */
  readonly onChoose: (level?: number) => void;
}

export function EnergyScale({ level, onChoose }: EnergyScaleProps) {
  return (
    <View style={styles.section} testID="energy-scale">
      <View style={styles.headings}>
        <Text accessibilityRole="header" style={styles.heading}>
          {energyHeading}
        </Text>
        <Text style={styles.chosen} testID="energy-chosen">
          {level === undefined ? nothingChosen : energyName(level)}
        </Text>
      </View>
      <View style={styles.steps} testID="energy-scale-steps">
        {energyLevels.map((step) => {
          const isChosen = step === level;
          return (
            <Pressable
              accessibilityHint={words('log.energy.hint')}
              accessibilityLabel={`${step} of ${highestEnergy}, ${energyName(step)}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: isChosen, selected: isChosen }}
              key={step}
              onPress={() => onChoose(isChosen ? undefined : step)}
              style={[styles.step, isChosen ? styles.stepChosen : styles.stepPlain]}
              testID={`energy-step-${step}`}
            >
              <Text style={[styles.stepLabel, isChosen && styles.stepLabelChosen]}>{step}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.snug },
  headings: { alignItems: 'baseline', flexDirection: 'row', gap: space.tight },
  heading: {
    color: colour.ink,
    ...textStyle('headline-md'),
  },
  chosen: {
    color: colour.body,
    ...textStyle('body-sm'),
  },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight },
  step: {
    alignItems: 'center',
    borderRadius: radius.chip,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.snug,
  },
  stepPlain: { backgroundColor: colour.sunk, borderColor: colour.sunk },
  stepChosen: { backgroundColor: colour.emberTint, borderColor: colour.ember },
  stepLabel: {
    color: colour.body,
    ...textStyle('body-lg'),
  },
  stepLabelChosen: { color: colour.ink },
});
