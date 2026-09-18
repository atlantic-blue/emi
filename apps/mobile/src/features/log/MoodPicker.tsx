import { type Symptom, loggableMoods } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale } from '@emi/tokens';
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
  section: { gap: space.snug },
  heading: {
    color: colour.ink,
    fontSize: typeScale.heading.size,
    lineHeight: typeScale.heading.lineHeight,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight },
  chip: {
    alignItems: 'center',
    borderRadius: radius.chip,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: '100%',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.snug,
    paddingVertical: space.tight,
  },
  chipPlain: { backgroundColor: colour.sunk, borderColor: colour.sunk },
  chipPicked: { backgroundColor: colour.emberTint, borderColor: colour.ember },
  chipLabel: {
    color: colour.body,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
    textAlign: 'center',
  },
  chipLabelPicked: { color: colour.ink },
});
