import {
  type Feeling,
  type Goal,
  type Regularity,
  feelingValues,
  goalValues,
  regularityValues,
} from '@emi/crypto';

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
    lines: [words('onboarding.birthYear.line.sealed')],
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
  regularity: {
    title: words('onboarding.regularity.title'),
    lines: [words('onboarding.regularity.line.explains')],
    action: words('onboarding.regularity.action'),
  },
  feeling: {
    title: words('onboarding.feeling.title'),
    lines: [words('onboarding.feeling.line.talks'), words('onboarding.feeling.line.encrypted')],
    action: words('onboarding.feeling.action'),
  },
  goals: {
    title: words('onboarding.goals.title'),
    lines: [words('onboarding.goals.line.chooseAll'), words('onboarding.goals.line.encrypted')],
    action: words('onboarding.goals.action'),
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
  'regularity',
  'feeling',
  'goals',
] as const;

export type FirstRunScreen = (typeof firstRunScreens)[number];

export const firstRunScreenCount = firstRunScreens.length;

/**
 * The words of the three answers. A map rather than a list, so a fourth value arriving in
 * `Regularity` leaves this file failing to compile instead of leaving her an answer she cannot
 * choose.
 */
export const regularityLabels: Readonly<Record<Regularity, string>> = {
  regular: words('onboarding.regularity.choice.regular'),
  moves: words('onboarding.regularity.choice.moves'),
  unknown: words('onboarding.regularity.choice.unknown'),
};

/** The order the screen offers them in, which the record above cannot carry. */
export const regularityChoices: readonly Regularity[] = regularityValues;

/**
 * The words of the three answers to how she feels about her cycle. A map for the same reason the
 * one above is a map: a fourth value arriving in `Feeling` leaves this file failing to compile
 * rather than leaving her an answer she cannot choose.
 */
export const feelingLabels: Readonly<Record<Feeling, string>> = {
  fine: words('onboarding.feeling.choice.fine'),
  hard: words('onboarding.feeling.choice.hard'),
  understand: words('onboarding.feeling.choice.understand'),
};

/** The order the screen offers them in, which the record above cannot carry. */
export const feelingChoices: readonly Feeling[] = feelingValues;

/**
 * The words of the four things she can come to Emi for. A map for the same reason the two above
 * are maps: a fifth value arriving in `Goal` leaves this file failing to compile rather than
 * leaving her a row she cannot choose.
 */
export const goalLabels: Readonly<Record<Goal, string>> = {
  forecast: words('onboarding.goals.choice.forecast'),
  symptoms: words('onboarding.goals.choice.symptoms'),
  fertileWindow: words('onboarding.goals.choice.fertileWindow'),
  doctorRecord: words('onboarding.goals.choice.doctorRecord'),
};

/** The order the screen offers them in, which the record above cannot carry. */
export const goalChoices: readonly Goal[] = goalValues;

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
