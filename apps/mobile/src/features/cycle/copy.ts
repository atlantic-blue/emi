import type { PublishedMeasurement } from '@emi/cycle';
import type { PhaseName } from '@emi/tokens';

import { type WordKey, words } from '../../language';
import { dayLabel } from '../onboarding/days';
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

/** The word over the day in the middle of a ring that names the day rather than the phase. */
export function ringDayWord(): string {
  return words('cycle.ring.day');
}

/**
 * The line under the day in the middle of the ring: how long the cycle it counts in runs. The
 * day above it is a figure alone, and this is what says what that figure is counted out of.
 */
export function ringCycleLengthWords(cycleLengthDays: number): string {
  return words('cycle.ring.of', undefined, { length: cycleLengthDays });
}

/** The name of a phase in her language, which the ring of Today writes along its arc. */
const theNameOf: Readonly<Record<PhaseName, WordKey>> = {
  period: 'cycle.phaseName.period',
  follicular: 'cycle.phaseName.follicular',
  ovulation: 'cycle.phaseName.ovulation',
  luteal: 'cycle.phaseName.luteal',
};

export function phaseName(phase: PhaseName): string {
  return words(theNameOf[phase]);
}

/** The full name of a phase, which the middle of the ring of Today writes over the day. */
const theFullNameOf: Readonly<Record<PhaseName, WordKey>> = {
  period: 'phase.name.period',
  follicular: 'phase.name.follicular',
  ovulation: 'phase.name.ovulation',
  luteal: 'phase.name.luteal',
};

export function phaseFullName(phase: PhaseName): string {
  return words(theFullNameOf[phase]);
}

/** The large line in the middle of the ring of Today: the day of her cycle. */
export function ringDayNumberWords(day: number): string {
  return words('cycle.ring.dayNumber', undefined, { day });
}

/**
 * The line under that day. The length is a forecast or her own answer, never a count she lived,
 * so the ring of Today says about.
 */
export function ringAboutLengthWords(cycleLengthDays: number): string {
  return words('cycle.ring.ofAbout', undefined, { length: cycleLengthDays });
}

/**
 * What a screen reader says about one day of her week or her month. The three cues a day is drawn
 * with are a fill, a ring and a broken line, and none of the three reaches a woman who is
 * listening, so each one is said in words here.
 */
export function herDayLabel(day: HerDay, today: string): string {
  const said = [dayLabel(day.day, today)];

  if (day.cycleDay !== undefined) {
    said.push(words('cycle.day.cycleDay', undefined, { cycle: day.cycleDay }));
  }
  if (day.mark === 'bled') {
    said.push(words('cycle.day.bled'));
  }
  if (day.mark === 'forecast') {
    said.push(words('cycle.day.expected'));
  }

  return said.join(', ');
}

/**
 * What a screen reader says about a day the month draws and will not open. The square is drawn
 * faint, and faint is nothing to somebody listening, so the reason it takes no press is said.
 */
export function aDayOutOfReachLabel(day: HerDay, today: string): string {
  return [herDayLabel(day, today), words('cycle.day.notYet')].join(', ');
}

/**
 * The words of the page that says where each published figure comes from.
 *
 * The figure itself is worded by the same function the section on the screen she opens uses, so
 * the two places she meets a published number say it in one voice. Nothing here holds a number.
 */
export const figuresCopy = {
  title: words('cycle.figures.title'),
  back: words('cycle.figures.back'),
  quoted: words('cycle.figures.quoted'),
  printed: words('cycle.figures.printed'),
} as const;

/** What each published figure measures, named on the row that quotes it. */
export const publishedMeasurementName: Readonly<Record<PublishedMeasurement, string>> = {
  'cycle-length': words('cycle.figures.cycleLength'),
  'cycle-length-variation': words('cycle.figures.cycleLengthVariation'),
  'period-duration': words('cycle.figures.periodDuration'),
};
