import type { ReactNode } from 'react';

import type { ReadPattern } from '../cycle/patternsRead';

/**
 * Where a symptom that came back is named. Nothing is drawn yet, so the section holds no card, no
 * sentence and no count, and every case that reads one fails.
 */

export const homePatternsTestID = 'home-patterns';

export function patternCardTestID(slug: string): string {
  return `home-pattern-${slug}`;
}

/** The lead of one card: the symptom, and where in her cycle it keeps landing. */
export function patternCardWhenTestID(slug: string): string {
  return `home-pattern-when-${slug}`;
}

/** The evidence under it: how many of her cycles carried it, out of how many Emi read. */
export function patternCardEvidenceTestID(slug: string): string {
  return `home-pattern-evidence-${slug}`;
}

export function PatternCards(_props: {
  readonly patterns: readonly ReadPattern[];
  readonly onOpenPattern: (slug: string) => void;
}): ReactNode {
  return null;
}
