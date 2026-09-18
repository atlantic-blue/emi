/**
 * A day is stored in Celsius and in kilograms, whatever she reads it in. The unit she chose is a
 * setting on the phone and it never reaches a record, so the morning she changes it is not the
 * morning six cycles of readings move.
 */

/** Degrees, in the two scales a thermometer sold to her is marked in. */
export type TemperatureUnit = 'celsius' | 'fahrenheit';

/** The two a scale sold to her reads in. A stone is a pound count and is not offered yet. */
export type WeightUnit = 'kilograms' | 'pounds';

/** Everything a field may offer her for a temperature, in the order it offers them. */
export const temperatureUnits: readonly TemperatureUnit[] = ['celsius', 'fahrenheit'];

/** What a day carries, from section 6.2 of the design, whichever scale she reads. */
export const storedTemperatureUnit: TemperatureUnit = 'celsius';

/** Everything a field may offer her for a body weight, in the order it offers them. */
export const weightUnits: readonly WeightUnit[] = ['kilograms', 'pounds'];

/** What a day carries for a body weight, again from section 6.2 and again whatever she reads. */
export const storedWeightUnit: WeightUnit = 'kilograms';

/** Degrees. Below this a reading is a thermometer that was not held against anybody. */
export const lowestTemperatureCelsius = 34;
/** Degrees. Above this the number came from the keypad and not from a body. */
export const highestTemperatureCelsius = 42;
/**
 * Kilograms. The range is wide on purpose: the field catches a stray digit and it never judges
 * her.
 */
export const lowestWeightKilograms = 20;
/** Kilograms, and wide for the same reason. A refusal here would lose what she typed. */
export const highestWeightKilograms = 400;

/** The international pound, which is this many kilograms by definition rather than by measurement. */
export const POUND_IN_KILOGRAMS = 0.45359237;

/** Which unit she reads each measurement in. Both default to the unit a record is written in. */
export interface ChosenUnits {
  readonly temperature: TemperatureUnit;
  readonly weight: WeightUnit;
}

/** Where she starts, and where a record stays: one scale for reading, one for writing. */
export const storedUnits: ChosenUnits = {
  temperature: storedTemperatureUnit,
  weight: storedWeightUnit,
};

/**
 * A record carries one decimal place, so every value that reaches one passes through here. The
 * result is the nearest double to a number of tenths, which is the shortest text that reads back
 * as itself.
 */
export function toOneDecimalPlace(value: number): number {
  return Math.round(value * 10) / 10;
}

/** The lowest and the highest a measurement may be, in the unit it is read in. */
export interface MeasurementRange {
  readonly lowest: number;
  readonly highest: number;
}

/**
 * What she typed, what will be stored, and why it was refused. All three travel together because
 * a field that dropped the text and kept the number would rewrite her keystrokes as she made them.
 */
export interface MeasurementReading<Unit extends string = string> {
  readonly typed: string;
  /** The unit she typed it in, so a reading knows whether it is still the one on screen. */
  readonly readIn: Unit;
  /** Absent while the day holds no measurement, and absent while the text is refused. */
  readonly stored?: number;
  /** Absent while the text is a measurement she can save, or while she has typed nothing. */
  readonly refusal?: string;
}

/**
 * Everything that differs between a temperature and a weight, so the two behave the same way
 * without the behaviour being written twice.
 */
export interface Measurement<Unit extends string> {
  /** How a refusal names it, in the wording a record uses. */
  readonly field: string;
  readonly units: readonly Unit[];
  readonly storedUnit: Unit;
  readonly range: MeasurementRange;
  readonly symbols: Readonly<Record<Unit, string>>;
  readonly names: Readonly<Record<Unit, string>>;
  readonly shownIn: (stored: number, unit: Unit) => number;
  readonly storedFrom: (shown: number, unit: Unit) => number;
}

/** Basal body temperature, in the two scales, with the range a body can produce. */
export const temperature: Measurement<TemperatureUnit> = {
  field: 'a temperature',
  units: temperatureUnits,
  storedUnit: storedTemperatureUnit,
  range: { lowest: lowestTemperatureCelsius, highest: highestTemperatureCelsius },
  symbols: { celsius: '°C', fahrenheit: '°F' },
  names: { celsius: 'Celsius', fahrenheit: 'Fahrenheit' },
  shownIn: (celsius, unit) =>
    toOneDecimalPlace(unit === 'fahrenheit' ? celsius * 1.8 + 32 : celsius),
  storedFrom: (shown, unit) =>
    toOneDecimalPlace(unit === 'fahrenheit' ? (shown - 32) / 1.8 : shown),
};

/** Body weight, in the two scales, with a range wide enough to catch only a stray digit. */
export const weight: Measurement<WeightUnit> = {
  field: 'a weight',
  units: weightUnits,
  storedUnit: storedWeightUnit,
  range: { lowest: lowestWeightKilograms, highest: highestWeightKilograms },
  symbols: { kilograms: 'kg', pounds: 'lb' },
  names: { kilograms: 'kilograms', pounds: 'pounds' },
  shownIn: (kilograms, unit) =>
    toOneDecimalPlace(unit === 'pounds' ? kilograms / POUND_IN_KILOGRAMS : kilograms),
  storedFrom: (shown, unit) =>
    toOneDecimalPlace(unit === 'pounds' ? shown * POUND_IN_KILOGRAMS : shown),
};

/**
 * The range as a number she can type. Each end is the nearest value at one decimal place that the
 * record still accepts, so every number the refusal names is a number she can enter. The cost is
 * that a fraction beyond each end is accepted without being named, and a range that refused what
 * it offered would be worse.
 */
export function rangeIn<Unit extends string>(
  measurement: Measurement<Unit>,
  unit: Unit,
): MeasurementRange {
  const lowest = measurement.shownIn(measurement.range.lowest, unit);
  const highest = measurement.shownIn(measurement.range.highest, unit);

  return {
    lowest:
      measurement.storedFrom(lowest, unit) < measurement.range.lowest
        ? toOneDecimalPlace(lowest + 0.1)
        : lowest,
    highest:
      measurement.storedFrom(highest, unit) > measurement.range.highest
        ? toOneDecimalPlace(highest - 0.1)
        : highest,
  };
}

/** The text a field starts with: her own measurement in her own unit, or nothing at all. */
export function typedFor<Unit extends string>(
  measurement: Measurement<Unit>,
  stored: number | undefined,
  unit: Unit,
): string {
  return stored === undefined ? '' : measurement.shownIn(stored, unit).toFixed(1);
}

const aNumber = /^-?\d+([.,]\d+)?$/;

/**
 * What one field makes of what she typed. Nothing typed is nothing logged rather than a refusal,
 * because a day without a temperature is an ordinary day.
 */
export function readingOf<Unit extends string>(
  measurement: Measurement<Unit>,
  typed: string,
  unit: Unit,
): MeasurementReading<Unit> {
  const trimmed = typed.trim();
  if (trimmed.length === 0) {
    return { typed, readIn: unit };
  }
  if (!aNumber.test(trimmed)) {
    return {
      typed,
      readIn: unit,
      refusal: `${measurement.field} is a number, this one is ${trimmed}`,
    };
  }

  const stored = measurement.storedFrom(Number(trimmed.replace(',', '.')), unit);
  if (stored < measurement.range.lowest || stored > measurement.range.highest) {
    const shown = rangeIn(measurement, unit);
    return {
      typed,
      readIn: unit,
      refusal:
        `${measurement.field} runs from ${shown.lowest.toFixed(1)} to ` +
        `${shown.highest.toFixed(1)} ${measurement.symbols[unit]}, this one is ${trimmed}`,
    };
  }

  return { typed, readIn: unit, stored };
}

/** What the temperature field makes of what she typed, in the scale she is reading. */
export function temperatureReading(
  typed: string,
  unit: TemperatureUnit,
): MeasurementReading<TemperatureUnit> {
  return readingOf(temperature, typed, unit);
}

/** The same for the weight field, so both behave alike on the same keystrokes. */
export function weightReading(typed: string, unit: WeightUnit): MeasurementReading<WeightUnit> {
  return readingOf(weight, typed, unit);
}

/**
 * The same reading, as it stands in the unit she is reading now. Her stored number travels and the
 * text is drawn again from it, so switching the unit converts what she sees without a keystroke of
 * hers being converted underneath her. A refusal belongs to the text that earned it, so it does
 * not travel.
 */
export function readingIn<Unit extends string>(
  measurement: Measurement<Unit>,
  reading: MeasurementReading<Unit>,
  unit: Unit,
): MeasurementReading<Unit> {
  return reading.readIn === unit
    ? reading
    : { typed: typedFor(measurement, reading.stored, unit), readIn: unit, stored: reading.stored };
}
