import { type Symptom, loggableMoods } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { groupHeadings } from './SymptomGroup';

/**
 * The mood group of the catalogue, lifted out of the symptom list and given the top of the sheet.
 * She picks as many as she wants, or none, and what she picks is written into `moods` rather than
 * into `symptoms`, so a screen reading her history counts a mood once.
 */
export interface MoodPickerProps {
  readonly picked: readonly string[];
  readonly onToggle: (slug: string) => void;
  /** The catalogue, so a test can drive a retired mood without editing the real one. */
  readonly catalogue?: readonly Symptom[];
}

export const moodHeading = groupHeadings.mood;

export function MoodPicker({ picked, onToggle, catalogue }: MoodPickerProps) {
  return (
    <View style={styles.section} testID="mood-picker">
      <Text accessibilityRole="header" style={styles.heading}>
        {moodHeading}
      </Text>
      <View style={styles.chips} testID="mood-picker-chips">
        {loggableMoods(catalogue).map((mood) => (
          <MoodChip
            key={mood.slug}
            isPicked={picked.includes(mood.slug)}
            mood={mood}
            onToggle={onToggle}
          />
        ))}
      </View>
    </View>
  );
}

interface MoodChipProps {
  readonly mood: Symptom;
  readonly isPicked: boolean;
  readonly onToggle: (slug: string) => void;
}

function MoodChip({ mood, isPicked, onToggle }: MoodChipProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isPicked }}
      onPress={() => onToggle(mood.slug)}
      style={[styles.chip, isPicked ? styles.chipPicked : styles.chipPlain]}
      testID={`mood-chip-${mood.slug}`}
    >
      <Text numberOfLines={2} style={[styles.chipLabel, isPicked && styles.chipLabelPicked]}>
        {mood.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.spaceMd },
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
