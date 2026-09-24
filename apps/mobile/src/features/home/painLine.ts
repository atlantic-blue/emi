import type { Feeling } from '@emi/crypto';

import type { RingInput } from '../cycle/ringInput';

/**
 * Whether the home screen offers her the pain log.
 *
 * Two things have to hold: she answered that her period is hard, and the day she is looking at is
 * inside it. The second is asked of the ring rather than of the day log, so the line and the arc
 * she is looking at can never disagree: the period arc is the first span the ring draws, it covers
 * the cycle days from the first, and the ring counts her day from one.
 *
 * Everything else shows nothing new. A woman who said she is fine with it, or who wants to
 * understand it, or who passed the question by, reads the screen she read yesterday.
 */
export function thePainLineIsOffered(
  feeling: Feeling | undefined,
  ring: RingInput | undefined,
): boolean {
  if (feeling !== 'hard' || ring === undefined) {
    return false;
  }

  const period = ring.phases.find((span) => span.phase === 'period');

  return period !== undefined && ring.day <= period.days;
}
