import type { PhaseName } from '@emi/tokens';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { ReadCycle } from '../cycle/cyclesRead';

/**
 * One past cycle, drawn as a strip: the days it covers, how long it ran, and the four phase fills.
 */

export const homeCyclesTestID = 'home-cycles';

export function cycleStripTestID(startedOn: string): string {
  return `home-cycle-${startedOn}`;
}

export function cycleStripLengthTestID(startedOn: string): string {
  return `home-cycle-length-${startedOn}`;
}

export function cycleStripBarTestID(startedOn: string): string {
  return `home-cycle-bar-${startedOn}`;
}

export function cycleStripFillTestID(startedOn: string, phase: PhaseName): string {
  return `home-cycle-fill-${startedOn}-${phase}`;
}

interface Props {
  readonly cycles: readonly ReadCycle[];
  /** The way to that cycle on the Insights screen, named by the day the cycle began. */
  readonly onOpenCycle: (startedOn: string) => void;
}

export function CycleStrips({ cycles, onOpenCycle }: Props): ReactNode {
  return cycles.length === 0 || onOpenCycle === undefined ? null : <View />;
}
