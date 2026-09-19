import { type Measurement, type MeasurementReading, readingIn, readingOf } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

/**
 * One number a day, typed in the unit she chose and handed up in the unit a record is written in.
 * The field holds nothing itself: the unit is a setting that can move while she is looking at the
 * sheet, so the text is drawn from her stored reading every time rather than being converted where
 * she is typing.
 */
export interface MeasurementFieldProps<Unit extends string> {
  readonly measurement: Measurement<Unit>;
  readonly heading: string;
  readonly hint: string;
  readonly placeholder: string;
  readonly reading: MeasurementReading<Unit>;
  readonly unit: Unit;
  readonly onRead: (reading: MeasurementReading<Unit>) => void;
  readonly onChooseUnit: (unit: Unit) => void;
  readonly testID: string;
}

export function MeasurementField<Unit extends string>({
  measurement,
  heading,
  hint,
  placeholder,
  reading,
  unit,
  onRead,
  onChooseUnit,
  testID,
}: MeasurementFieldProps<Unit>) {
  const shown = readingIn(measurement, reading, unit);

  return (
    <View style={styles.section} testID={testID}>
      <View style={styles.headings}>
        <Text accessibilityRole="header" style={styles.heading}>
          {heading}
        </Text>
        <Text style={styles.hint} testID={`${testID}-hint`}>
          {hint}
        </Text>
      </View>

      <View style={styles.row}>
        <TextInput
          accessibilityLabel={`${heading} in ${measurement.names[unit]}`}
          autoCorrect={false}
          keyboardType="decimal-pad"
          onChangeText={(text) => onRead(readingOf(measurement, text, unit))}
          placeholder={placeholder}
          placeholderTextColor={colour.onSurfaceVariant}
          style={styles.field}
          testID={`${testID}-value`}
          value={shown.typed}
        />
        <View style={styles.units} testID={`${testID}-units`}>
          {measurement.units.map((offered) => {
            const isChosen = offered === unit;
            return (
              <Pressable
                accessibilityLabel={measurement.names[offered]}
                accessibilityRole="radio"
                accessibilityState={{ checked: isChosen, selected: isChosen }}
                key={offered}
                onPress={() => onChooseUnit(offered)}
                style={[styles.unit, isChosen ? styles.unitChosen : styles.unitPlain]}
                testID={`${testID}-unit-${offered}`}
              >
                <Text style={[styles.unitLabel, isChosen && styles.unitLabelChosen]}>
                  {measurement.symbols[offered]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {shown.refusal === undefined ? null : (
        <Text style={styles.refusal} testID={`${testID}-refusal`}>
          {shown.refusal}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.spaceMd },
  headings: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
  heading: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
  },
  hint: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: space.spaceSm },
  field: {
    backgroundColor: colour.surfaceContainer,
    borderRadius: radius.md,
    color: colour.onSurface,
    flex: 1,
    ...textStyle('body-lg'),
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceSm,
  },
  units: { flexDirection: 'row', gap: space.spaceSm },
  unit: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceSm,
  },
  unitPlain: { backgroundColor: colour.surfaceContainer, borderColor: colour.surfaceContainer },
  unitChosen: { backgroundColor: colour.primaryFixed, borderColor: colour.primary },
  unitLabel: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  unitLabelChosen: { color: colour.onSurface },
  refusal: {
    color: colour.primary,
    ...textStyle('body-sm'),
  },
});
