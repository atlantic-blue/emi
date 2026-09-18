import { type Measurement, type MeasurementReading, readingIn, readingOf } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale } from '@emi/tokens';
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
          placeholderTextColor={colour.body}
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
  section: { gap: space.snug },
  headings: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: space.tight },
  heading: {
    color: colour.ink,
    fontSize: typeScale.heading.size,
    lineHeight: typeScale.heading.lineHeight,
  },
  hint: {
    color: colour.body,
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineHeight,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: space.tight },
  field: {
    backgroundColor: colour.sunk,
    borderRadius: radius.chip,
    color: colour.ink,
    flex: 1,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.snug,
    paddingVertical: space.tight,
  },
  units: { flexDirection: 'row', gap: space.tight },
  unit: {
    alignItems: 'center',
    borderRadius: radius.chip,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.tight,
  },
  unitPlain: { backgroundColor: colour.sunk, borderColor: colour.sunk },
  unitChosen: { backgroundColor: colour.emberTint, borderColor: colour.ember },
  unitLabel: {
    color: colour.body,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
  },
  unitLabelChosen: { color: colour.ink },
  refusal: {
    color: colour.ember,
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineHeight,
  },
});
