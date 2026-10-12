import {
  type Feeling,
  type Focus,
  type Goal,
  type Regularity,
  feelingValues,
  focusValues,
  goalValues,
  regularityValues,
} from '@emi/crypto';
import type { SymptomGroup } from '@emi/cycle';

import { words } from '../../language';
import { groupHeadings } from '../log/SymptomGroup';
import { theGroupsSheSeesFirst } from '../log/herOrder';
import { type ReminderLead, reminderLeads } from '../reminder/reminder';
import {
  type TodaySymptom,
  maximumCycleLengthDays,
  minimumCycleLengthDays,
  todaySymptoms,
} from './firstRun';

/**
 * The words of the first run, as the approved redesign writes them: talk to her as "you", name Emi
 * by name rather than as "we", and give her a way out of every question.
 */
export const firstRunCopy = {
  welcome: {
    title: words('onboarding.welcome.title'),
    lines: [
      words('onboarding.welcome.line.onThisPhone'),
      words('onboarding.welcome.line.noAccount'),
      words('onboarding.welcome.line.whatEmiIs'),
    ],
    action: words('onboarding.welcome.action'),
  },
  name: {
    title: words('onboarding.name.title'),
    lines: [words('onboarding.name.line.greets'), words('onboarding.encrypts')],
    label: words('onboarding.name.label'),
    hint: words('onboarding.name.hint'),
    action: words('onboarding.name.action'),
  },
  birthYear: {
    title: words('onboarding.birthYear.title'),
    lines: [words('onboarding.encrypts')],
    action: words('onboarding.birthYear.action'),
  },
  lastPeriod: {
    title: words('onboarding.lastPeriod.title'),
    lines: [words('onboarding.lastPeriod.line.remember'), words('onboarding.encrypts')],
    action: words('onboarding.lastPeriod.action'),
    /**
     * The sentence the question about the period before already offers, under the same key. Two
     * questions a woman may be unable to answer, and one sentence for both of them, because a
     * second key is a second sentence in three languages the moment somebody edits one of them.
     */
    wayPast: words('onboarding.periodBefore.skip'),
  },
  periodBefore: {
    title: words('onboarding.periodBefore.title'),
    question: words('onboarding.periodBefore.question'),
    lines: [words('onboarding.periodBefore.line.remember')],
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
      words('onboarding.cycleLength.line.held', undefined, {
        maximum: maximumCycleLengthDays,
        minimum: minimumCycleLengthDays,
      }),
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
    lines: [words('onboarding.feeling.line.talks'), words('onboarding.encryptedHere')],
    action: words('onboarding.feeling.action'),
  },
  goals: {
    title: words('onboarding.goals.title'),
    question: words('onboarding.goals.line.chooseAll'),
    lines: [words('onboarding.encryptsYourAnswers')],
    action: words('onboarding.goals.action'),
  },
  focus: {
    title: words('onboarding.focus.title'),
    lines: [words('onboarding.focus.line.first')],
    action: words('onboarding.focus.action'),
  },
  today: {
    title: words('onboarding.today.title'),
    /**
     * The word in the middle of its header, which names the day she is logging. The catalogue
     * already holds that word for the calendar in all three languages, and a second key for it
     * would be a second sentence the moment somebody edited one of them.
     */
    header: words('calendar.today'),
    question: words('onboarding.today.question'),
    lines: [words('onboarding.encryptsIt')],
    action: words('onboarding.today.action'),
    nothingToAdd: words('onboarding.today.nothingToAdd'),
  },
  reminder: {
    title: words('onboarding.reminder.title'),
    action: words('onboarding.reminder.action'),
    notNow: words('onboarding.reminder.notNow'),
    /**
     * The two names the sample banner carries: the word in the square, as the lock cover writes it,
     * and the name of the application over the line, as the home screen writes it. Both are held in
     * the catalogue already, and Emi is never translated.
     */
    tile: words('lock.cover.wordmark'),
    name: words('home.wordmark'),
  },
  firstForecast: {
    title: words('onboarding.firstForecast.title'),
    stillLearning: words('onboarding.firstForecast.stillLearning'),
    why: {
      title: words('onboarding.firstForecast.why.title'),
    },
    onThisPhone: {
      title: words('onboarding.firstForecast.onThisPhone.title'),
      line: words('onboarding.firstForecast.onThisPhone.line'),
    },
    noDate: {
      title: words('onboarding.firstForecast.noDate.title'),
      first: words('onboarding.firstForecast.noDate.first'),
      guess: words('onboarding.firstForecast.noDate.guess'),
    },
    action: words('onboarding.firstForecast.action'),
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
  encrypts: words('onboarding.encrypts'),
  encryptedHere: words('onboarding.encryptedHere'),
  encryptsYourAnswers: words('onboarding.encryptsYourAnswers'),
  encryptsIt: words('onboarding.encryptsIt'),
  /**
   * The promise the reminder makes, which is about the reminder and nothing else. The redesign's
   * own sentence says nothing is sent anywhere, and the delete sends one request, so the sentence
   * names the reminder.
   */
  remindsOnThisPhone: words('onboarding.reminder.promise'),
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
  'focus',
  'today',
  'reminder',
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
 * The words of the six things she can say change with her cycle. Each tile is a group of the log
 * sheet, so it carries the word that group is headed with there. She presses Sleep here and reads
 * Sleep at the top of her log, and one thing is called one name.
 *
 * A map for the reason the three above are maps: a seventh value arriving in `Focus` leaves this
 * file failing to compile rather than leaving her a tile she cannot press.
 */
export const focusLabels: Readonly<Record<Focus, string>> = {
  sleep: words('log.group.sleep'),
  mood: words('log.group.mood'),
  energy: words('log.group.energy'),
  skin: words('log.group.skin'),
  digestion: words('log.group.digestion'),
  pain: words('log.group.pain'),
};

/** The order the screen offers them in, which the record above cannot carry. */
export const focusChoices: readonly Focus[] = focusValues;

/**
 * The words of the six feelings the last question offers. The prototype's own six words are kept,
 * so four of them are the catalogue's word for the slug and two are shorter than it: she presses
 * Tired for `fatigue` and Low for `low-mood`.
 *
 * A map for the reason the four above are maps: a seventh slug arriving in `todaySymptoms` leaves
 * this file failing to compile rather than leaving her a tile with no word on it.
 */
export const todayLabels: Readonly<Record<TodaySymptom, string>> = {
  cramps: words('onboarding.today.choice.cramps'),
  headache: words('onboarding.today.choice.headache'),
  bloating: words('onboarding.today.choice.bloating'),
  fatigue: words('onboarding.today.choice.fatigue'),
  calm: words('onboarding.today.choice.calm'),
  'low-mood': words('onboarding.today.choice.low-mood'),
};

/** The order the screen offers them in, which the map above cannot carry. */
export const todayChoices: readonly TodaySymptom[] = todaySymptoms;

/**
 * The words of the three moments she can be reminded at. A map for the reason the five above are
 * maps: a fourth lead leaves this file failing to compile rather than leaving her a choice with no
 * word on it.
 */
export const reminderLabels: Readonly<Record<ReminderLead, string>> = {
  twoDaysBefore: words('onboarding.reminder.choice.twoDaysBefore'),
  oneDayBefore: words('onboarding.reminder.choice.oneDayBefore'),
  onTheDay: words('onboarding.reminder.choice.onTheDay'),
};

/** The line under the question once she has chosen, which says when the reminder comes. */
export const reminderLines: Readonly<Record<ReminderLead, string>> = {
  twoDaysBefore: words('onboarding.reminder.line.twoDaysBefore'),
  oneDayBefore: words('onboarding.reminder.line.oneDayBefore'),
  onTheDay: words('onboarding.reminder.line.onTheDay'),
};

/** The order the screen offers them in, which the maps above cannot carry. */
export const reminderChoices: readonly ReminderLead[] = reminderLeads;

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

/**
 * How many complete cycles Emi wants before it forecasts from her own cycles. The number handed in
 * is the one the arithmetic asks for, so the sentence cannot state a count the rule disagrees with.
 */
export function cyclesBeforeAForecastSentence(cycles: number): string {
  return words('onboarding.firstForecast.noDate.cycles', cycles);
}

/** The same count, said under a range that the stated length made rather than her own cycles. */
export function stillLearningSentence(cycles: number): string {
  return words('onboarding.firstForecast.needs', cycles);
}

/** The length she gave, which Emi counts from the first period she logs. */
export function countsFromTheFirstPeriodSentence(cycleLengthDays: number): string {
  return words('onboarding.firstForecast.noDate.length', cycleLengthDays);
}

/**
 * Why the answer is a range, in three sentences, each read off a number the arithmetic used: the
 * complete cycles it has, the cycles it waits for, the length she gave and the days either side.
 */
export function whyARangeSentences(counted: {
  readonly completeCycles: number;
  readonly needsCycles: number;
  readonly cycleLengthDays: number;
  readonly daysEitherSide: number;
}): string[] {
  return [
    words('onboarding.firstForecast.why.read', counted.completeCycles),
    words('onboarding.firstForecast.why.counts', counted.cycleLengthDays, {
      needs: counted.needsCycles,
    }),
    words('onboarding.firstForecast.why.width', counted.daysEitherSide),
  ];
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

/** What a screen reader says for one year of the wheel, because a bare number says nothing. */
export function birthYearLabel(year: number): string {
  return words('onboarding.birthYear.year', undefined, { year });
}

/**
 * The one card she reads after the welcome and before Emi asks her anything: what the ring is, and
 * what Emi costs.
 *
 * The words live here rather than in a screen, so a test reads them without rendering anything and
 * the wording gate reads them in one place.
 */
export const tourCopy = {
  title: words('onboarding.tour.ring.title'),
  lines: [words('onboarding.tour.ring.line.bead'), words('onboarding.tour.ring.line.arcs')],
  legend: {
    period: words('onboarding.tour.ring.legend.period'),
    follicular: words('onboarding.tour.ring.legend.after'),
    ovulation: words('onboarding.tour.ring.legend.ovulation'),
    luteal: words('onboarding.tour.ring.legend.before'),
  },
  price: {
    title: words('onboarding.tour.price.title'),
    line: words('onboarding.tour.price.line'),
  },
  action: words('onboarding.tour.ring.action'),
  skip: words('onboarding.tour.skip'),
} as const;

/**
 * The three lines of the promise, in the order she reads them. A list as well as the record below,
 * because the order is the screen and a record does not carry one.
 */
export const promiseLines = ['encrypted', 'noTracking', 'delete'] as const;

export type PromiseLine = (typeof promiseLines)[number];

export const promiseCopy = {
  title: words('onboarding.promise.title'),
  lines: {
    encrypted: words('onboarding.promise.encrypted'),
    noTracking: words('onboarding.promise.noTracking'),
    delete: words('onboarding.promise.delete'),
  } satisfies Readonly<Record<PromiseLine, string>>,
  action: words('onboarding.promise.action'),
} as const;

/** The three cards of the screen after the promise, in the order she reads them. */
export const whatEmiDoesCards = ['forecast', 'log', 'privacy'] as const;

export type WhatEmiDoesCard = (typeof whatEmiDoesCards)[number];

export const whatEmiDoesCopy = {
  title: words('onboarding.whatEmiDoes.title'),
  forecast: {
    title: words('onboarding.whatEmiDoes.forecast.title'),
    line: words('onboarding.whatEmiDoes.forecast.line'),
  },
  log: {
    title: words('onboarding.whatEmiDoes.log.title'),
    line: words('onboarding.whatEmiDoes.log.line'),
    and: words('onboarding.whatEmiDoes.log.and'),
  },
  privacy: {
    title: words('onboarding.whatEmiDoes.privacy.title'),
    line: words('onboarding.whatEmiDoes.privacy.line'),
  },
  action: words('onboarding.whatEmiDoes.action'),
} as const;

/**
 * A group named inside a sentence rather than at the head of its section. Every language Emi ships
 * writes a group as a common noun, so only the name that opens the sentence keeps its capital.
 *
 * `toLowerCase` rather than the locale aware form, which maps a capital I to a dotless letter on a
 * phone set to Turkish.
 */
function insideASentence(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/**
 * Her groups, joined the way a sentence names them. `Intl.ListFormat` is the obvious way and the
 * engine the application runs on does not carry it: Hermes ships the collator, the date format and
 * the number format and no more, so that call is undefined on a phone and correct under the runner.
 * It is exported because the screen that reads her first run back to her names the same groups
 * in the same sentence, and two joinings would put the comma in two places.
 */
export function focusNamesInASentence(groups: readonly Focus[]): string {
  return joinedAsASentence(
    groups.map((group, at) =>
      at === 0 ? focusLabels[group] : insideASentence(focusLabels[group]),
    ),
  );
}

/** Names joined the way a sentence lists them: commas, then the word for and before the last. */
function joinedAsASentence(named: readonly string[]): string {
  const last = named.at(-1);
  const before = named.slice(0, -1);

  if (last === undefined) {
    return '';
  }

  return before.length === 0 ? last : `${before.join(', ')} ${whatEmiDoesCopy.log.and} ${last}`;
}

/**
 * Groups named after a colon, where no name opens the sentence, so every one of them is written as
 * a common noun.
 */
function groupsAfterAColon(groups: readonly SymptomGroup[]): string {
  return joinedAsASentence(groups.map((group) => insideASentence(groupHeadings[group])));
}

/**
 * What the log section says under her chips: the groups she pressed, in the order she pressed
 * them, or the groups the log opens with for everybody where she pressed none. Either way the
 * sentence names the same groups the chips above it draw.
 */
export function whatComesFirstWhenSheLogs(chosen: readonly Focus[]): string {
  if (chosen.length === 0) {
    return words('onboarding.whatEmiDoes.log.usual', undefined, {
      groups: groupsAfterAColon(theGroupsSheSeesFirst(chosen)),
    });
  }

  return words('onboarding.whatEmiDoes.log.chosen', chosen.length, {
    groups: groupsAfterAColon(chosen),
  });
}
