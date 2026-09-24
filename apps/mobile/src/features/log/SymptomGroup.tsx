import type { Symptom, SymptomGroup as GroupName } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { words } from '../../language';

/**
 * The heading a woman reads. The catalogue holds the slug, which never changes, and this is the
 * only place the group is given words, so renaming one touches nothing she has already recorded.
 */
export const groupHeadings: Readonly<Record<GroupName, string>> = {
  mood: words('log.group.mood'),
  energy: words('log.group.energy'),
  pain: words('log.group.pain'),
  digestion: words('log.group.digestion'),
  skin: words('log.group.skin'),
  sleep: words('log.group.sleep'),
  head: words('log.group.head'),
  libido: words('log.group.libido'),
};

/** The section one group is drawn in, named after the group so a test reads the group it means. */
export function symptomGroupTestID(group: GroupName | 'found'): string {
  return `symptom-group-${group}`;
}

export interface SymptomChipProps {
  readonly symptom: Symptom;
  readonly isPicked: boolean;
  readonly onToggle: (slug: string) => void;
}

export function SymptomChip({ symptom, isPicked, onToggle }: SymptomChipProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isPicked }}
      onPress={() => onToggle(symptom.slug)}
      style={[styles.chip, isPicked ? styles.chipPicked : styles.chipPlain]}
      testID={`symptom-chip-${symptom.slug}`}
    >
      <Text numberOfLines={2} style={[styles.chipLabel, isPicked && styles.chipLabelPicked]}>
        {symptom.name}
      </Text>
    </Pressable>
  );
}

export interface SymptomGroupProps {
  readonly heading: string;
  readonly symptoms: readonly Symptom[];
  readonly picked: readonly string[];
  readonly onToggle: (slug: string) => void;
  readonly testID: string;
}

export function SymptomGroupSection({
  heading,
  symptoms,
  picked,
  onToggle,
  testID,
}: SymptomGroupProps) {
  return (
    <View style={styles.section} testID={testID}>
      <Text accessibilityRole="header" style={styles.heading}>
        {heading}
      </Text>
      <View style={styles.chips} testID={`${testID}-chips`}>
        {symptoms.map((symptom) => (
          <SymptomChip
            key={symptom.slug}
            isPicked={picked.includes(symptom.slug)}
            onToggle={onToggle}
            symptom={symptom}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.spaceMd, marginBottom: space.spaceLg },
  heading: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
  chip: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    // SEE-3. The chip itself is the tap target, with no hit slop behind it, so the floor decides
    // its size and the padding only ever pushes a longer name past that.
    maxWidth: '100%',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceSm,
  },
  chipPlain: { backgroundColor: colour.surfaceContainer, borderColor: colour.surfaceContainer },
  chipPicked: { backgroundColor: colour.primaryFixed, borderColor: colour.primary },
  chipLabel: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  chipLabelPicked: { color: colour.onSurface },
});
