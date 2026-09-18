import {
  type TemperatureUnit,
  type WeightUnit,
  POUND_IN_KILOGRAMS,
  highestTemperatureCelsius,
  highestWeightKilograms,
  lowestTemperatureCelsius,
  lowestWeightKilograms,
  rangeIn,
  readingIn,
  storedTemperatureUnit,
  storedUnits,
  storedWeightUnit,
  temperature,
  temperatureReading,
  temperatureUnits,
  toOneDecimalPlace,
  typedFor,
  weight,
  weightReading,
  weightUnits,
} from '../src/units';

/** Every tenth of a degree a body can produce, which is what a round trip has to survive. */
function everyTemperature(): number[] {
  const held: number[] = [];
  for (let tenths = lowestTemperatureCelsius * 10; tenths <= highestTemperatureCelsius * 10;) {
    held.push(tenths / 10);
    tenths += 1;
  }
  return held;
}

function everyWeight(): number[] {
  const held: number[] = [];
  for (let tenths = lowestWeightKilograms * 10; tenths <= highestWeightKilograms * 10;) {
    held.push(tenths / 10);
    tenths += 1;
  }
  return held;
}

describe('the unit a measurement is stored in', () => {
  it('is Celsius and kilograms, and it is not the unit she reads', () => {
    expect(storedTemperatureUnit).toBe('celsius');
    expect(storedWeightUnit).toBe('kilograms');
    expect(storedUnits).toEqual({ temperature: 'celsius', weight: 'kilograms' });
  });

  it('offers her the other unit for each measurement', () => {
    expect(temperatureUnits).toEqual(['celsius', 'fahrenheit']);
    expect(weightUnits).toEqual(['kilograms', 'pounds']);
  });

  it('holds the ranges the record format checks a day against', () => {
    expect([lowestTemperatureCelsius, highestTemperatureCelsius]).toEqual([34, 42]);
    expect([lowestWeightKilograms, highestWeightKilograms]).toEqual([20, 400]);
    expect(temperature.range).toEqual({ lowest: 34, highest: 42 });
    expect(weight.range).toEqual({ lowest: 20, highest: 400 });
  });

  it('converts a pound by the definition rather than by a measurement', () => {
    expect(POUND_IN_KILOGRAMS).toBe(0.45359237);
  });
});

describe('a reading shown in the unit she chose', () => {
  it('leaves a stored reading alone when she reads it in the unit it is stored in', () => {
    expect(temperature.shownIn(36.6, 'celsius')).toBe(36.6);
    expect(weight.shownIn(64.2, 'kilograms')).toBe(64.2);
  });

  it('converts a temperature to Fahrenheit and back', () => {
    expect(temperature.shownIn(37, 'fahrenheit')).toBe(98.6);
    expect(temperature.storedFrom(98.6, 'fahrenheit')).toBe(37);
  });

  it('converts a weight to pounds and back', () => {
    expect(weight.shownIn(64.2, 'pounds')).toBe(141.5);
    expect(weight.storedFrom(141.5, 'pounds')).toBe(64.2);
  });

  it('carries one decimal place, because a record carries one', () => {
    expect(temperature.shownIn(36.65, 'celsius')).toBe(36.7);
    expect(temperature.storedFrom(97.88, 'fahrenheit')).toBe(36.6);
    expect(toOneDecimalPlace(36.64)).toBe(36.6);
  });
});

describe('a stored reading she reads in another unit and stores again', () => {
  it('comes back as the reading she stored, for every tenth of a degree', () => {
    const moved = everyTemperature().filter(
      (celsius) =>
        temperature.storedFrom(temperature.shownIn(celsius, 'fahrenheit'), 'fahrenheit') !==
        celsius,
    );

    expect(everyTemperature()).toHaveLength(81);
    expect(moved).toEqual([]);
  });

  it('comes back as the weight she stored, for every tenth of a kilogram', () => {
    const moved = everyWeight().filter(
      (kilograms) => weight.storedFrom(weight.shownIn(kilograms, 'pounds'), 'pounds') !== kilograms,
    );

    expect(everyWeight()).toHaveLength(3801);
    expect(moved).toEqual([]);
  });
});

describe('the range named in the unit she reads', () => {
  it('is the stored range converted, for a temperature', () => {
    expect(rangeIn(temperature, 'celsius')).toEqual({ lowest: 34, highest: 42 });
    expect(rangeIn(temperature, 'fahrenheit')).toEqual({ lowest: 93.2, highest: 107.6 });
  });

  it('is the stored range converted, for a weight', () => {
    expect(rangeIn(weight, 'kilograms')).toEqual({ lowest: 20, highest: 400 });
    expect(rangeIn(weight, 'pounds')).toEqual({ lowest: 44.1, highest: 881.8 });
  });

  it('names only numbers the record accepts, so the message cannot offer a refusal', () => {
    for (const unit of temperatureUnits) {
      const named = rangeIn(temperature, unit);
      expect(temperatureReading(named.lowest.toFixed(1), unit).stored).toBeDefined();
      expect(temperatureReading(named.highest.toFixed(1), unit).stored).toBeDefined();
    }
    for (const unit of weightUnits) {
      const named = rangeIn(weight, unit);
      expect(weightReading(named.lowest.toFixed(1), unit).stored).toBeDefined();
      expect(weightReading(named.highest.toFixed(1), unit).stored).toBeDefined();
    }
  });
});

describe('what she typed into a field', () => {
  it('is stored in Celsius whatever she typed it in', () => {
    expect(temperatureReading('36.6', 'celsius').stored).toBe(36.6);
    expect(temperatureReading('97.9', 'fahrenheit').stored).toBe(36.6);
  });

  it('is stored in kilograms whatever she typed it in', () => {
    expect(weightReading('64.2', 'kilograms').stored).toBe(64.2);
    expect(weightReading('141.5', 'pounds').stored).toBe(64.2);
  });

  it('is nothing logged when she typed nothing, rather than a refusal', () => {
    for (const typed of ['', '   ']) {
      expect(temperatureReading(typed, 'celsius')).toEqual({ typed, readIn: 'celsius' });
      expect(weightReading(typed, 'kilograms')).toEqual({ typed, readIn: 'kilograms' });
    }
  });

  it('reads a comma as the decimal separator she meant', () => {
    expect(temperatureReading('36,6', 'celsius').stored).toBe(36.6);
    expect(weightReading('64,2', 'kilograms').stored).toBe(64.2);
  });

  it('is refused when it is not a number, and the refusal repeats what she typed', () => {
    expect(temperatureReading('thirty six', 'celsius')).toEqual({
      typed: 'thirty six',
      readIn: 'celsius',
      refusal: 'a temperature is a number, this one is thirty six',
    });
    expect(weightReading('64.2kg', 'kilograms').refusal).toBe(
      'a weight is a number, this one is 64.2kg',
    );
  });

  it('is refused outside the range, and the refusal names the range in her own unit', () => {
    expect(temperatureReading('43.0', 'celsius').refusal).toBe(
      'a temperature runs from 34.0 to 42.0 °C, this one is 43.0',
    );
    expect(temperatureReading('110.0', 'fahrenheit').refusal).toBe(
      'a temperature runs from 93.2 to 107.6 °F, this one is 110.0',
    );
    expect(weightReading('900.0', 'pounds').refusal).toBe(
      'a weight runs from 44.1 to 881.8 lb, this one is 900.0',
    );
  });

  it('is refused at the tenth beyond each end and accepted at each end', () => {
    expect(temperatureReading('34.0', 'celsius').stored).toBe(34);
    expect(temperatureReading('33.9', 'celsius').stored).toBeUndefined();
    expect(temperatureReading('42.0', 'celsius').stored).toBe(42);
    expect(temperatureReading('42.1', 'celsius').stored).toBeUndefined();
    expect(weightReading('20.0', 'kilograms').stored).toBe(20);
    expect(weightReading('19.9', 'kilograms').stored).toBeUndefined();
    expect(weightReading('400.0', 'kilograms').stored).toBe(400);
    expect(weightReading('400.1', 'kilograms').stored).toBeUndefined();
  });

  it('is refused rather than stored when a minus sign reaches the field', () => {
    expect(temperatureReading('-36.6', 'celsius').stored).toBeUndefined();
    expect(weightReading('-64.2', 'kilograms').stored).toBeUndefined();
  });
});

describe('the text a field opens with', () => {
  it('is her own reading, at one decimal place, in the unit she chose', () => {
    expect(typedFor(temperature, 37, 'celsius')).toBe('37.0');
    expect(typedFor(temperature, 37, 'fahrenheit')).toBe('98.6');
    expect(typedFor(weight, 64.2, 'kilograms')).toBe('64.2');
    expect(typedFor(weight, 64.2, 'pounds')).toBe('141.5');
  });

  it('is empty on a day that holds no reading at all', () => {
    for (const unit of temperatureUnits as readonly TemperatureUnit[]) {
      expect(typedFor(temperature, undefined, unit)).toBe('');
    }
    for (const unit of weightUnits as readonly WeightUnit[]) {
      expect(typedFor(weight, undefined, unit)).toBe('');
    }
  });
});

describe('a reading read again in the other unit', () => {
  it('keeps the number she stored and draws the text from it', () => {
    const typedInFahrenheit = temperatureReading('97.9', 'fahrenheit');

    expect(readingIn(temperature, typedInFahrenheit, 'celsius')).toEqual({
      typed: '36.6',
      readIn: 'celsius',
      stored: 36.6,
    });
  });

  it('hands back the same reading when the unit did not move', () => {
    const held = weightReading('64.2', 'kilograms');

    expect(readingIn(weight, held, 'kilograms')).toBe(held);
  });

  it('leaves a refusal behind with the text that earned it', () => {
    const refused = temperatureReading('110.0', 'fahrenheit');

    expect(refused.refusal).toBeDefined();
    expect(readingIn(temperature, refused, 'celsius')).toEqual({
      typed: '',
      readIn: 'celsius',
      stored: undefined,
    });
  });
});
