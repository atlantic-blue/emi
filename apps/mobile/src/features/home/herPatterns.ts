import {
  type PatternsReadFrom,
  type ReadPattern,
  patternsNeedCycles,
  patternsRead,
} from '../cycle/patternsRead';

/**
 * The symptoms the screen she opens names on a card: every one that came back often enough for Emi
 * to name it, most repeated first.
 *
 * They come out of the reader the Insights screen reads, so a symptom cannot land on one day of her
 * cycle on a card and on another day in the list the card opens.
 */

/** How many of her cycles must carry a symptom before a card names it. */
export const cyclesBeforeAPattern = patternsNeedCycles;

/**
 * What came back, or nothing at all where nothing did. Emi holds no sample data, so a section it
 * cannot fill is absent rather than drawn empty, and a coincidence is refused rather than drawn.
 */
export function herPatterns(from: PatternsReadFrom): readonly ReadPattern[] | undefined {
  const read = patternsRead(from);

  return read.length === 0 ? undefined : read;
}
