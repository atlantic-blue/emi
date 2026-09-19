import {
  type ChosenUnits,
  type MeasurementReading,
  type Symptom,
  type TemperatureUnit,
  type WeightUnit,
  readingIn,
  storedUnits,
  symptomsOutsideTheMoodPicker,
  temperature,
  typedFor,
  weight,
} from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EnergyScale } from './EnergyScale';
import { MoodPicker } from './MoodPicker';
import { SymptomGroupSection, groupHeadings } from './SymptomGroup';
import { Temperature } from './Temperature';
import { Weight } from './Weight';
import { sectionsFor } from './search';

/**
 * What one press of save writes. The sheet never reaches the database itself: the screen that
 * hosts it owns the write, so the same sheet serves today and a day she reopens.
 */
export interface LogSheetEntry {
  readonly day: string;
  readonly symptoms: readonly string[];
  readonly moods: readonly string[];
  /** Absent when she logged no energy, because none is not the same as one. */
  readonly energy?: number;
  /** Both in the unit a record is written in, whatever unit she read them in. */
  readonly temperatureCelsius?: number;
  readonly weightKilograms?: number;
}

export interface LogSheetProps {
  readonly day: string;
  /** What the day already holds. A day with nothing logged opens empty rather than failing. */
  readonly symptoms?: readonly string[];
  readonly moods?: readonly string[];
  readonly energy?: number;
  readonly temperatureCelsius?: number;
  readonly weightKilograms?: number;
  /** The units she reads her measurements in. Both default to the unit a record carries. */
  readonly units?: ChosenUnits;
  readonly onChooseUnits?: (units: ChosenUnits) => void;
  readonly onSave: (entry: LogSheetEntry) => void | Promise<void>;
  /** The catalogue, so a test can drive a retired symptom without editing the real one. */
  readonly catalogue?: readonly Symptom[];
}

export function LogSheet({
  day,
  symptoms = [],
  moods = [],
  energy,
  temperatureCelsius,
  weightKilograms,
  units = storedUnits,
  onChooseUnits,
  onSave,
  catalogue,
}: LogSheetProps) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<readonly string[]>(symptoms);
  const [pickedMoods, setPickedMoods] = useState<readonly string[]>(moods);
  const [chosenEnergy, setChosenEnergy] = useState<number | undefined>(energy);
  const [temperatureRead, setTemperatureRead] = useState<MeasurementReading<TemperatureUnit>>(
    () => ({
      typed: typedFor(temperature, temperatureCelsius, units.temperature),
      readIn: units.temperature,
      stored: temperatureCelsius,
    }),
  );
  const [weightRead, setWeightRead] = useState<MeasurementReading<WeightUnit>>(() => ({
    typed: typedFor(weight, weightKilograms, units.weight),
    readIn: units.weight,
    stored: weightKilograms,
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // The mood group is drawn by the picker above, so the list below offers the other seven.
  const sections = useMemo(
    () => sectionsFor(query, symptomsOutsideTheMoodPicker(catalogue)),
    [query, catalogue],
  );

  function toggle(slug: string): void {
    setIsSaved(false);
    setPicked((held) =>
      held.includes(slug) ? held.filter((each) => each !== slug) : [...held, slug],
    );
  }

  function toggleMood(slug: string): void {
    setIsSaved(false);
    setPickedMoods((held) =>
      held.includes(slug) ? held.filter((each) => each !== slug) : [...held, slug],
    );
  }

  function readTemperature(reading: MeasurementReading<TemperatureUnit>): void {
    setIsSaved(false);
    setTemperatureRead(reading);
  }

  function readWeight(reading: MeasurementReading<WeightUnit>): void {
    setIsSaved(false);
    setWeightRead(reading);
  }

  function chooseEnergy(level?: number): void {
    setIsSaved(false);
    setChosenEnergy(level);
  }

  // The unit is a setting and it can move under the sheet, so what she is looking at is worked
  // out from her reading and the unit now, never stored in the shape it was typed in.
  const temperatureShown = readingIn(temperature, temperatureRead, units.temperature);
  const weightShown = readingIn(weight, weightRead, units.weight);

  // One save writes the whole day, so a measurement she cannot save stops the whole sheet rather
  // than being dropped out of the write without her seeing it go.
  const refusal = temperatureShown.refusal ?? weightShown.refusal;

  async function save(): Promise<void> {
    setIsSaving(true);
    try {
      await onSave({
        day,
        symptoms: picked,
        moods: pickedMoods,
        energy: chosenEnergy,
        temperatureCelsius: temperatureShown.stored,
        weightKilograms: weightShown.stored,
      });
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.sheet} testID="log-sheet">
      <ScrollView
        contentContainerStyle={styles.scrolled}
        keyboardShouldPersistTaps="handled"
        testID="log-sheet-scroll"
      >
        <MoodPicker catalogue={catalogue} onToggle={toggleMood} picked={pickedMoods} />

        <EnergyScale level={chosenEnergy} onChoose={chooseEnergy} />

        <Temperature
          onChooseUnit={(chosen) => onChooseUnits?.({ ...units, temperature: chosen })}
          onRead={readTemperature}
          reading={temperatureShown}
          unit={units.temperature}
        />

        <Weight
          onChooseUnit={(chosen) => onChooseUnits?.({ ...units, weight: chosen })}
          onRead={readWeight}
          reading={weightShown}
          unit={units.weight}
        />

        <TextInput
          accessibilityLabel="Search symptoms"
          autoCorrect={false}
          onChangeText={(typed) => {
            setIsSaved(false);
            setQuery(typed);
          }}
          placeholder="Search symptoms"
          placeholderTextColor={colour.body}
          style={styles.search}
          testID="symptom-search"
          value={query}
        />

        {sections.length === 0 ? (
          <Text style={styles.nothing} testID="no-symptom-found">
            No symptom matches {query.trim()}
          </Text>
        ) : (
          sections.map((section) => (
            <SymptomGroupSection
              key={section.group ?? 'found'}
              heading={
                section.group === null
                  ? found(section.symptoms.length)
                  : groupHeadings[section.group]
              }
              onToggle={toggle}
              picked={picked}
              symptoms={section.symptoms}
              testID={`symptom-group-${section.group ?? 'found'}`}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.foot}>
        <Text style={styles.count} testID="log-sheet-count">
          {refusal ?? countOf(picked.length + pickedMoods.length)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaving || refusal !== undefined }}
          disabled={isSaving || refusal !== undefined}
          onPress={save}
          style={styles.save}
          testID="log-sheet-save"
        >
          <Text style={styles.saveLabel}>{isSaved ? 'Saved' : 'Save'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function found(count: number): string {
  return count === 1 ? '1 found' : `${count} found`;
}

function countOf(count: number): string {
  return count === 1 ? '1 picked' : `${count} picked`;
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colour.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    flex: 1,
  },
  scrolled: { gap: space.base, padding: space.base },
  search: {
    backgroundColor: colour.sunk,
    borderRadius: radius.chip,
    color: colour.ink,
    ...textStyle('body-lg'),
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.snug,
    paddingVertical: space.tight,
  },
  nothing: {
    color: colour.body,
    ...textStyle('body-lg'),
  },
  foot: {
    alignItems: 'center',
    borderTopColor: colour.hairline,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space.snug,
    justifyContent: 'space-between',
    paddingHorizontal: space.base,
    paddingVertical: space.snug,
  },
  count: {
    color: colour.muted,
    ...textStyle('body-sm'),
  },
  save: {
    alignItems: 'center',
    backgroundColor: colour.ember,
    borderRadius: radius.chip,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: 120,
    paddingHorizontal: space.base,
  },
  saveLabel: {
    color: colour.surface,
    ...textStyle('body-lg'),
  },
});
