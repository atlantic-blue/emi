import {
  type ChosenUnits,
  type TemperatureUnit,
  type WeightUnit,
  storedUnits,
  temperatureUnits,
  weightUnits,
} from '@emi/cycle';

import type { Database } from '../../data/database';
import { readSetting, writeSetting } from '../../data/settingRepository';

/**
 * Which unit she reads a measurement in, held beside the cycle length she stated rather than
 * inside a day. A record is written in one unit for as long as she owns the phone, so nothing here
 * ever reaches one.
 */
export function chosenUnits(database: Database): ChosenUnits {
  return {
    temperature:
      oneOf(temperatureUnits, readSetting(database, 'temperatureUnit')) ?? storedUnits.temperature,
    weight: oneOf(weightUnits, readSetting(database, 'weightUnit')) ?? storedUnits.weight,
  };
}

export function chooseUnits(database: Database, units: ChosenUnits): void {
  writeSetting(database, 'temperatureUnit', units.temperature);
  writeSetting(database, 'weightUnit', units.weight);
}

/**
 * A setting written by a version that offered more units than this one reads as nothing, so she
 * sees the unit a record is written in rather than an empty field.
 */
function oneOf<Unit extends TemperatureUnit | WeightUnit>(
  units: readonly Unit[],
  held: string | undefined,
): Unit | undefined {
  return units.find((unit) => unit === held);
}
