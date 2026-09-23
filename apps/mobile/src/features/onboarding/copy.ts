import { words } from '../../language';

/**
 * The words of the first run. Section 9.7 of the design sets the rules they follow: say what
 * happens, never congratulate, no exclamation mark, write the number.
 */
export const firstRunCopy = {
  welcome: {
    title: words('onboarding.welcome.title'),
    lines: [
      words('onboarding.welcome.line.nothingSent'),
      words('onboarding.welcome.line.noAccount'),
      words('onboarding.welcome.line.showsYou'),
    ],
    action: words('onboarding.welcome.action'),
  },
  lastPeriod: {
    title: words('onboarding.lastPeriod.title'),
    lines: [words('onboarding.lastPeriod.line')],
    action: words('onboarding.lastPeriod.action'),
  },
  cycleLength: {
    title: words('onboarding.cycleLength.title'),
    lines: [
      words('onboarding.cycleLength.line.count'),
      words('onboarding.cycleLength.line.corrects'),
    ],
    action: words('onboarding.cycleLength.action'),
  },
  shorter: words('onboarding.cycleLength.shorter'),
  longer: words('onboarding.cycleLength.longer'),
  earlier: words('onboarding.lastPeriod.earlier'),
  earlierMonth: words('onboarding.lastPeriod.earlierMonth'),
  later: words('onboarding.lastPeriod.later'),
  laterMonth: words('onboarding.lastPeriod.laterMonth'),
} as const;

export const firstRunScreens = ['welcome', 'lastPeriod', 'cycleLength'] as const;

export type FirstRunScreen = (typeof firstRunScreens)[number];

export const firstRunScreenCount = firstRunScreens.length;

export function stepLabel(screen: FirstRunScreen): string {
  return words('onboarding.step', undefined, {
    step: firstRunScreens.indexOf(screen) + 1,
    of: firstRunScreenCount,
  });
}

/** How she reads the cycle length she is setting, which is a count and takes the form to match. */
export function cycleLengthDaysLabel(days: number): string {
  return words('onboarding.cycleLength.days', days);
}

/**
 * The four cards she reads before Emi asks her anything. Each one carries one promise the feature
 * map already makes, and the card that claims a forecast carries the two denials with it.
 *
 * The words live here rather than in a screen, so a test reads them without rendering anything and
 * the wording gate reads them in one place.
 */
export const tourCards = ['ring', 'range', 'records', 'yours'] as const;

export type TourCard = (typeof tourCards)[number];

export const tourCardCount = tourCards.length;

export const tourCopy = {
  ring: {
    title: words('onboarding.tour.ring.title'),
    lines: [words('onboarding.tour.ring.line.ring'), words('onboarding.tour.ring.line.arcs')],
    action: words('onboarding.tour.ring.action'),
  },
  range: {
    title: words('onboarding.tour.range.title'),
    lines: [
      words('onboarding.tour.range.line.range'),
      words('onboarding.tour.range.line.confidence'),
      words('onboarding.tour.range.line.learning'),
      words('onboarding.tour.range.line.arithmetic'),
    ],
    action: words('onboarding.tour.range.action'),
  },
  records: {
    title: words('onboarding.tour.records.title'),
    lines: [
      words('onboarding.tour.records.line.log'),
      words('onboarding.tour.records.line.patterns'),
    ],
    action: words('onboarding.tour.records.action'),
  },
  yours: {
    title: words('onboarding.tour.yours.title'),
    lines: [
      words('onboarding.tour.yours.line.encrypted'),
      words('onboarding.tour.yours.line.recovery'),
      words('onboarding.tour.yours.line.price'),
    ],
    action: words('onboarding.tour.yours.action'),
  },
  skip: words('onboarding.tour.skip'),
  back: words('onboarding.tour.back'),
} as const;

/** How far through she is, said as a count and never as a step, because a card asks her nothing. */
export function tourCountLabel(card: TourCard): string {
  return words('onboarding.tour.count', undefined, {
    step: tourCards.indexOf(card) + 1,
    of: tourCardCount,
  });
}
