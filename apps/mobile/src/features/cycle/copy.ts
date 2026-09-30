import type { PhaseName, RingGeometry } from '@emi/tokens';

import { type WordKey, words } from '../../language';
import type { HerDay } from './herWeek';

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

/** The two things the line under her week says: her cycle day, and the phase she is in. */
export interface PhaseLineWords {
  /** The day of her cycle, which is the part drawn large enough to read across a room. */
  readonly day: string;
  /** The phase in words, held under 14 points because a stranger walking past reads it too. */
  readonly phase: string;
}

/**
 * Which sentence names each phase. A period day names the day of the period, because that is the
 * number she is counting while she is bleeding. Every other day names the phase and the length of
 * the cycle it sits in, which is what the drawings of this screen carry.
 */
const thePhaseOfHerCycle: Readonly<Record<Exclude<PhaseName, 'period'>, WordKey>> = {
  follicular: 'cycle.phaseLine.follicular',
  ovulation: 'cycle.phaseLine.ovulation',
  luteal: 'cycle.phaseLine.luteal',
};

/**
 * The words of the line, from the geometry the ring is drawn from. One reading of one cycle, so the
 * line and the ring can never name two phases or two days.
 */
export function phaseLineWords(geometry: RingGeometry): PhaseLineWords {
  return {
    day: words('cycle.phaseLine.day', undefined, { day: geometry.day }),
    phase: thePhaseSaid(geometry),
  };
}

/**
 * How long her period is running, as the line says it. The arc is the length she gave until she
 * bleeds past it, and a period cannot be shorter than the day of it she is standing on, so the
 * sentence names whichever of the two is longer and stays true either way.
 */
function theDaysOfHerPeriod(geometry: RingGeometry): number {
  const arc = geometry.arcs.find((each) => each.phase === 'period');

  return Math.max(arc?.days ?? 0, geometry.day);
}

function thePhaseSaid(geometry: RingGeometry): string {
  if (geometry.phase === 'period') {
    return words('cycle.phaseLine.period', undefined, {
      day: geometry.day,
      days: theDaysOfHerPeriod(geometry),
    });
  }

  return words(thePhaseOfHerCycle[geometry.phase], geometry.cycleLengthDays);
}

/** What a screen reader says about one day of her week or her month. */
export function herDayLabel(_day: HerDay, _today: string): string {
  return '';
}
