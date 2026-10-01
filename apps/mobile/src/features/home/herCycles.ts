import { type CyclesReadFrom, type ReadCycle, cyclesRead } from '../cycle/cyclesRead';

/**
 * The cycles the screen she opens draws as strips: the one she is in, then the three before it.
 *
 * They are read out of the cycle cache through the reader the Insights screen reads, so a cycle
 * cannot be one length on one screen and another length on the other.
 */

/** How many cycles she reads without leaving the screen she opens. */
export const stripsSheReads = 4;

/**
 * Her recent cycles, most recent first, or nothing at all where the cache holds no cycle. Emi
 * holds no sample data, so a section it cannot fill is absent rather than drawn empty.
 */
export function herCycles(from: CyclesReadFrom): readonly ReadCycle[] | undefined {
  const read = cyclesRead(from).slice(0, stripsSheReads);

  return read.length === 0 ? undefined : read;
}
