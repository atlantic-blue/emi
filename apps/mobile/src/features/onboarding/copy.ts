import { words } from '../../language';
import { maximumCycleLengthDays, minimumCycleLengthDays } from './firstRun';

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
  name: {
    title: words('onboarding.name.title'),
    lines: [words('onboarding.name.line.greets'), words('onboarding.name.line.sealed')],
    label: words('onboarding.name.label'),
    hint: words('onboarding.name.hint'),
    action: words('onboarding.name.action'),
  },
  birthYear: {
    title: words('onboarding.birthYear.title'),
    lines: [words('onboarding.birthYear.line.noReader'), words('onboarding.birthYear.line.sealed')],
    action: words('onboarding.birthYear.action'),
  },
  lastPeriod: {
    title: words('onboarding.lastPeriod.title'),
    lines: [
      words('onboarding.lastPeriod.line.remember'),
      words('onboarding.lastPeriod.line.privacy'),
    ],
    action: words('onboarding.lastPeriod.action'),
  },
  periodBefore: {
    title: words('onboarding.periodBefore.title'),
    lines: [
      words('onboarding.periodBefore.line.remember'),
      words('onboarding.periodBefore.line.surer'),
    ],
    action: words('onboarding.periodBefore.action'),
    skip: words('onboarding.periodBefore.skip'),
    outOfRange: words('onboarding.periodBefore.outOfRange', undefined, {
      maximum: maximumCycleLengthDays,
      minimum: minimumCycleLengthDays,
    }),
  },
  cycleLength: {
    title: words('onboarding.cycleLength.title'),
    lines: [
      words('onboarding.cycleLength.line.count'),
      words('onboarding.cycleLength.line.corrects'),
    ],
    action: words('onboarding.cycleLength.action'),
  },
  periodLength: {
    title: words('onboarding.periodLength.title'),
    lines: [
      words('onboarding.periodLength.line.count'),
      words('onboarding.periodLength.line.logged'),
    ],
    action: words('onboarding.periodLength.action'),
    skip: words('onboarding.periodLength.skip'),
  },
  hold: {
    title: words('onboarding.hold.title'),
    instruction: words('onboarding.hold.instruction'),
    sealed: words('onboarding.hold.sealed'),
    action: words('onboarding.hold.action'),
    held: words('onboarding.hold.held'),
    refused: words('onboarding.hold.refused'),
  },
  back: words('onboarding.back'),
  skip: words('onboarding.skip'),
  shorter: words('onboarding.cycleLength.shorter'),
  longer: words('onboarding.cycleLength.longer'),
  fewerDays: words('onboarding.periodLength.shorter'),
  moreDays: words('onboarding.periodLength.longer'),
  earlier: words('onboarding.lastPeriod.earlier'),
  earlierMonth: words('onboarding.lastPeriod.earlierMonth'),
  later: words('onboarding.lastPeriod.later'),
  laterMonth: words('onboarding.lastPeriod.laterMonth'),
} as const;

/**
 * The screens that ask her something, which is what the bar counts. The hold is not one of them:
 * it asks nothing, it is the moment her answers are written, and screen 19 of the prototype
 * carries no position for that reason.
 */
export const firstRunScreens = [
  'welcome',
  'name',
  'birthYear',
  'lastPeriod',
  'periodBefore',
  'cycleLength',
  'periodLength',
] as const;

export type FirstRunScreen = (typeof firstRunScreens)[number];

export const firstRunScreenCount = firstRunScreens.length;

/**
 * How far along she is, said in words. Nothing draws it: the bar carries the position on the
 * screen and this is what it says to a screen reader, because a fraction of a line reads as
 * nothing and a counter beside it reads as a form to fill in.
 */
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

/** How she reads the period length she is setting, which reaches one day and so takes both forms. */
export function periodLengthDaysLabel(days: number): string {
  return words('onboarding.periodLength.days', days);
}

/** Why the name she typed is refused, which names the bound rather than repeating the number. */
export function nameTooLongLine(characters: number): string {
  return words('onboarding.name.tooLong', characters);
}

/** The cycle she lived, counted between the two starts she gave. */
export function daysBetweenSentence(days: number): string {
  return words('onboarding.periodBefore.between', days);
}

/** What a screen reader says for one year of the wheel, because a bare number says nothing. */
export function birthYearLabel(year: number): string {
  return words('onboarding.birthYear.year', undefined, { year });
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
