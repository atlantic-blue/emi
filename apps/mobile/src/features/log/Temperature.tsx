import { type MeasurementReading, type TemperatureUnit, temperature } from '@emi/cycle';

import { MeasurementField } from './MeasurementField';

/**
 * Basal body temperature, which later measures the luteal length from her own rise rather than
 * from the 13 days the forecast assumes until then. She takes it before she gets up, so the field
 * asks for one number and asks for nothing else.
 */
export const temperatureHeading = 'Waking temperature';
export const temperatureHint = 'Before you get up';

export interface TemperatureProps {
  readonly reading: MeasurementReading<TemperatureUnit>;
  readonly unit: TemperatureUnit;
  readonly onRead: (reading: MeasurementReading<TemperatureUnit>) => void;
  readonly onChooseUnit: (unit: TemperatureUnit) => void;
}

export function Temperature({ reading, unit, onRead, onChooseUnit }: TemperatureProps) {
  return (
    <MeasurementField
      heading={temperatureHeading}
      hint={temperatureHint}
      measurement={temperature}
      onChooseUnit={onChooseUnit}
      onRead={onRead}
      placeholder="36.5"
      reading={reading}
      testID="temperature"
      unit={unit}
    />
  );
}
