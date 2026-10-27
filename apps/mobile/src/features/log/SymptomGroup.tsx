import type { Symptom, SymptomGroup as GroupName } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Pressable, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { words } from '../../language';
import { symptomName } from './symptomName';

/**
 * The heading a woman reads. The catalogue holds the slug, which never changes, and this is the
 * only place the group is given words, so renaming one touches nothing she has already recorded.
 */
export const groupHeadings: Readonly<Record<GroupName, string>> = {
  mood: words('log.group.mood'),
  energy: words('log.group.energy'),
  pain: words('log.group.pain'),
  appetite: words('log.group.appetite'),
  digestive: words('log.group.digestive'),
  skin: words('log.group.skin'),
  sleep: words('log.group.sleep'),
  head: words('log.group.head'),
  libido: words('log.group.libido'),
};

/** The chip one symptom is drawn under, named after the slug her record carries and never the name. */
export function symptomChipTestID(slug: string): string {
  return `symptom-chip-${slug}`;
}

/** The section one group is drawn in, named after the group so a test reads the group it means. */
export function symptomGroupTestID(group: GroupName | 'found'): string {
  return `symptom-group-${group}`;
}

/**
 * The heading over one set of chips, which every drawing of the log names above its group.
 *
 * It is named outside the group's own identifier on purpose. A screen reads its groups by the
 * names beginning `symptom-group`, so a heading named under one of them would be read back as a
 * group of its own.
 */
export function symptomGroupHeadingTestID(group: GroupName | 'found'): string {
  return `symptom-heading-${group}`;
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
      testID={symptomChipTestID(symptom.slug)}
    >
      <Text numberOfLines={2} style={[styles.chipLabel, isPicked && styles.chipLabelPicked]}>
        {symptomName(symptom.slug)}
      </Text>
    </Pressable>
  );
}

export interface SymptomGroupProps {
  readonly heading: string;
  /** What the heading is named on the glass, where the screen holds its headings to a drawing. */
  readonly headingTestID?: string;
  readonly symptoms: readonly Symptom[];
  readonly picked: readonly string[];
  readonly onToggle: (slug: string) => void;
  readonly testID: string;
}

export function SymptomGroupSection({
  heading,
  headingTestID,
  symptoms,
  picked,
  onToggle,
  testID,
}: SymptomGroupProps) {
  return (
    <View style={styles.section} testID={testID}>
      <Text accessibilityRole="header" style={styles.heading} testID={headingTestID}>
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

/** Points. The outline of a chip, as the log board draws it. */
const CHIP_BORDER = 1.5;

const styles = StyleSheet.create({
  section: { gap: space.spaceMd },
  heading: {
    color: colour.text,
    ...textStyle('headline-sm'),
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
  chip: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: CHIP_BORDER,
    justifyContent: 'center',
    // SEE-3. The chip itself is the tap target, with no hit slop behind it, so the floor decides
    // its size and the padding only ever pushes a longer name past that.
    maxWidth: '100%',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceSm,
  },
  chipPlain: { backgroundColor: colour.card, borderColor: colour.line },
  chipPicked: { backgroundColor: colour.accent, borderColor: colour.accent },
  chipLabel: {
    color: colour.text,
    ...textStyle('choice-lg'),
    textAlign: 'center',
  },
  chipLabelPicked: { color: colour.onAccent },
});
