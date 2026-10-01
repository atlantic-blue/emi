import type { CyclesReadFrom, ReadCycle } from '../cycle/cyclesRead';

/**
 * The cycles the screen she opens draws as strips: the one she is in, then the three before it.
 */

export const stripsSheReads = 4;

export function herCycles(_from: CyclesReadFrom): readonly ReadCycle[] | undefined {
  return undefined;
}
