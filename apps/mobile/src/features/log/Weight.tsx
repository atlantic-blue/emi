import { type MeasurementReading, type WeightUnit, weight } from '@emi/cycle';

import { MeasurementField } from './MeasurementField';

/**
 * One number a day, and the only thing it is ever compared against is her own record of it. The
 * range is wide enough to catch a stray digit and nothing narrower, because a field that argued
 * with her would be a field she stopped filling in.
 */
export const weightHeading = 'Weight';
export const weightHint = 'One number a day';

export interface WeightProps {
  readonly reading: MeasurementReading<WeightUnit>;
  readonly unit: WeightUnit;
  readonly onRead: (reading: MeasurementReading<WeightUnit>) => void;
  readonly onChooseUnit: (unit: WeightUnit) => void;
}

export function Weight({ reading, unit, onRead, onChooseUnit }: WeightProps) {
  return (
    <MeasurementField
      heading={weightHeading}
      hint={weightHint}
      measurement={weight}
      onChooseUnit={onChooseUnit}
      onRead={onRead}
      placeholder="64.2"
      reading={reading}
      testID="weight"
      unit={unit}
    />
  );
}
