import { type PatternsReadFrom, type ReadPattern, patternsNeedCycles } from '../cycle/patternsRead';

/**
 * What the cards on the screen she opens are read through. Nothing reads her days yet, so the
 * screen draws no card at all and every case that reads one fails.
 */

/** How many of her cycles must carry a symptom before a card names it. */
export const cyclesBeforeAPattern = patternsNeedCycles;

export function herPatterns(_from: PatternsReadFrom): readonly ReadPattern[] | undefined {
  return undefined;
}
