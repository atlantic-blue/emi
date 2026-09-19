import { words } from '../../language';

/**
 * The words of the ring. Two screens draw the ring, so the sentence about an empty one lives here
 * rather than in either of them, and a woman reads the same thing wherever she meets it.
 */
export const cycleCopy = {
  noRing: {
    title: words('cycle.noRing.title'),
    line: words('cycle.noRing.line'),
  },
} as const;

/** What a screen reader says about the ring: the day, the length, and the phase the bead sits in. */
export function ringSpokenLabel(day: number, cycleLengthDays: number, phase: string): string {
  return words('cycle.ring.spoken', undefined, {
    day,
    length: cycleLengthDays,
    phase: phase.toLowerCase(),
  });
}
