import type { PublishedMeasurement } from '@emi/cycle';
import type { ReactNode } from 'react';

/**
 * One measurement of hers, beside the figure a paper reports for the same measurement. The row
 * says which number is whose and says nothing about which one is right.
 */

export const homeNumbersTestID = 'home-numbers';

export function measuredRowTestID(measures: PublishedMeasurement): string {
  return `home-measured-${measures}`;
}

export function herNumberTestID(measures: PublishedMeasurement): string {
  return `${measuredRowTestID(measures)}-hers`;
}

export function publishedNumberTestID(measures: PublishedMeasurement): string {
  return `${measuredRowTestID(measures)}-published`;
}

export function MeasuredRows(): ReactNode {
  return null;
}
