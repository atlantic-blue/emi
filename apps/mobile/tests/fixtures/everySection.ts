import { cycleRingTestID, ringBeadTestID, ringTrackTestID } from '../../src/components/CycleRing';
import { fertileWindowTestID } from '../../src/features/forecast/FertileWindow';
import { learningTestID } from '../../src/features/forecast/Learning';
import { nextPeriodTestID } from '../../src/features/forecast/NextPeriod';
import { homeCyclesTestID } from '../../src/features/home/CycleStrip';
import { homeTrendTestID } from '../../src/features/home/CycleTrend';
import {
  homeGreetingTestID,
  homeHeaderMarkTestID,
  homeHeaderTestID,
  homeHeaderWordTestID,
} from '../../src/features/home/HomeHeader';
import {
  homeCyclesLineTestID,
  homeDoctorRecordTestID,
  homeFertileWindowTestID,
  homeFiguresLineTestID,
  homeFiguresPressTestID,
  homeForecastTestID,
  homeLogTodayTestID,
  homeNoRingLineTestID,
  homeNoRingTestID,
  homeNoRingTitleTestID,
  homePainLineTestID,
  homePatternsLineTestID,
  homePatternsPressTestID,
  homeScreenTestID,
  homeTrendCountTestID,
  homeTrendPressTestID,
} from '../../src/features/home/HomeScreen';
import { loggedTodayTestID } from '../../src/features/home/LoggedToday';
import { homeNumbersTestID } from '../../src/features/home/MeasuredRow';
import { homePatternsTestID } from '../../src/features/home/PatternCard';
import { phaseLineTestID } from '../../src/features/home/PhaseLine';
import { roundActionTestID, roundActions } from '../../src/features/home/RoundAction';
import { sectionWaitingTestID } from '../../src/features/home/SectionWaiting';
import { weekStripTestID } from '../../src/features/home/WeekStrip';
import type { HerData } from './theStatesOfHerData';
import { theIdentifiersDrawn } from './theMockupScreen';

/**
 * Every section of the screen she opens, and the rule that says when her own data fills it.
 *
 * This is the record the rule is held to. Emi holds no sample data, so each section is either drawn
 * from days she recorded herself, or absent with one sentence in its place, and a chart, a strip, a
 * row or a card standing over nothing is the thing the record exists to refuse.
 *
 * Every rule here states its own number rather than reading the constant the arithmetic holds. A
 * guard that reads the same constant as the code cannot catch a threshold that moved, so the two
 * are written out twice on purpose and a change to one has to be made to the other.
 *
 * The frame below carries what no amount of her data moves: the box, the mark, the dates of her
 * week, the two round actions and the dock. Every identifier the screen draws belongs to one
 * section or to the frame, so the next section cannot arrive without an entry here.
 */

/**
 * How many complete cycles Emi needs before it can measure her. Below it there is no median to
 * take, so her three numbers, her forecast, the shape of her cycles and the fertile window all
 * wait for the same second cycle.
 */
const cyclesBeforeEmiCanMeasureHer = 2;

/** Which identifiers a part draws: the ones it draws once, and the ones it draws one of each. */
export interface Draws {
  /** Drawn once, named in full. */
  readonly named?: readonly string[];
  /** Drawn once for each day, cycle or symptom, so only the beginning of the name is known. */
  readonly prefixed?: readonly string[];
}

export interface Section {
  /** What the section is called, which is what a failure names. */
  readonly name: string;
  /** What it draws when her own data fills it. */
  readonly draws: Draws;
  /** What stands in its place when it cannot be filled, or nothing where none does. */
  readonly insteadDraws?: Draws;
  /** Why she is owed no sentence, where the section simply goes. */
  readonly simplyGoes?: string;
  /** Whether her own data fills it. */
  readonly fills: (hers: HerData) => boolean;
}

function claims(draws: Draws | undefined, identifier: string): boolean {
  if (draws === undefined) {
    return false;
  }

  return (
    (draws.named ?? []).includes(identifier) ||
    (draws.prefixed ?? []).some((beginning) => identifier.startsWith(beginning))
  );
}

/** Every identifier a section answers for: what it draws, and what stands in its place. */
export function identifiersOf(section: Section, identifier: string): boolean {
  return claims(section.draws, identifier) || claims(section.insteadDraws, identifier);
}

export const theSectionsOfTheScreenSheOpens: readonly Section[] = [
  {
    draws: { named: [homeGreetingTestID] },
    fills: (hers) => hers.gaveAName,
    name: 'the greeting',
    simplyGoes: 'a woman who kept her name is not greeted by a blank line',
  },
  {
    draws: { prefixed: ['home-week-cycle-day-'] },
    fills: (hers) => hers.dayOfHerCycle !== undefined,
    name: 'the day of her cycle over each date of her week',
    simplyGoes: 'the dates stay, because they are the calendar, so only the number goes',
  },
  {
    draws: { named: [phaseLineTestID], prefixed: [`${phaseLineTestID}-`] },
    fills: (hers) => hers.dayOfHerCycle !== undefined,
    name: 'the line that names the day of her cycle',
    simplyGoes: 'the two lines in place of the ring say what the top of the screen needs first',
  },
  {
    draws: {
      named: [cycleRingTestID, ringTrackTestID, ringBeadTestID],
      prefixed: ['ring-arc-'],
    },
    fills: (hers) => hers.recordedDays > 0,
    insteadDraws: {
      named: [homeNoRingTestID, homeNoRingTitleTestID, homeNoRingLineTestID, homeLogTodayTestID],
    },
    name: 'the ring',
  },
  {
    draws: { named: [loggedTodayTestID], prefixed: [`${loggedTodayTestID}-`] },
    fills: (hers) => hers.loggedToday,
    name: 'what she logged today',
    simplyGoes: 'nothing reads back a log for today, and there is no empty row in its place either',
  },
  {
    draws: { named: [nextPeriodTestID], prefixed: [`${nextPeriodTestID}-`] },
    fills: (hers) => hers.completeCycles >= cyclesBeforeEmiCanMeasureHer,
    insteadDraws: { named: [learningTestID], prefixed: [`${learningTestID}-`] },
    name: 'her forecast',
  },
  {
    draws: {
      named: [homeFertileWindowTestID, fertileWindowTestID],
      prefixed: [`${fertileWindowTestID}-`],
    },
    fills: (hers) =>
      hers.askedForTheFertileWindow && hers.completeCycles >= cyclesBeforeEmiCanMeasureHer,
    name: 'the fertile window',
    simplyGoes:
      'the card answers a question she asked, and before her second cycle there is no window to draw',
  },
  {
    draws: {
      named: [homeNumbersTestID, homeFiguresLineTestID, homeFiguresPressTestID],
      prefixed: ['home-measured-'],
    },
    fills: (hers) => hers.completeCycles >= cyclesBeforeEmiCanMeasureHer,
    insteadDraws: {
      named: [sectionWaitingTestID('cycles')],
      prefixed: [`${sectionWaitingTestID('cycles')}-`],
    },
    name: 'her three numbers beside the published figures',
  },
  {
    draws: {
      named: [homeCyclesTestID, homeCyclesLineTestID],
      prefixed: ['home-cycle-'],
    },
    fills: (hers) => hers.recordedDays > 0,
    name: 'her past cycles as strips',
    simplyGoes:
      'the sentence where her three numbers would be says her cycles arrive with her second period',
  },
  {
    draws: {
      named: [homeTrendTestID, homeTrendCountTestID, homeTrendPressTestID],
      prefixed: [`${homeTrendTestID}-`],
    },
    fills: (hers) => hers.completeCycles >= cyclesBeforeEmiCanMeasureHer,
    insteadDraws: {
      named: [sectionWaitingTestID('trend')],
      prefixed: [`${sectionWaitingTestID('trend')}-`],
    },
    name: 'the shape of her last cycles',
  },
  {
    draws: {
      named: [homePatternsTestID, homePatternsLineTestID, homePatternsPressTestID],
      prefixed: ['home-pattern-'],
    },
    fills: (hers) => hers.aSymptomCameBack,
    insteadDraws: {
      named: [sectionWaitingTestID('patterns')],
      prefixed: [`${sectionWaitingTestID('patterns')}-`],
    },
    name: 'the symptoms that came back',
  },
  {
    draws: { named: [homeDoctorRecordTestID] },
    fills: (hers) => hers.askedForARecordForHerDoctor,
    name: 'the record for her doctor',
    simplyGoes: 'the export is at the foot of Privacy for everybody, so only the shortcut goes',
  },
  {
    draws: { named: [homePainLineTestID] },
    fills: (hers) =>
      hers.saidHerPeriodIsHard &&
      hers.dayOfHerCycle !== undefined &&
      hers.dayOfHerCycle <= hers.periodRunsFor,
    name: 'the way to the pain log',
    simplyGoes: 'a woman who said she is fine with her period reads the screen she read yesterday',
  },
];

/**
 * The frame of the screen: everything her days do not move.
 *
 * The dates and the weekday letters of her week are here because they come off the calendar, which
 * needs no recorded day. The day of her cycle above each date is the part her own days fill, and it
 * is a section above.
 */
export const theFrameOfTheScreenSheOpens: Draws = {
  named: [
    'lock-screens',
    homeScreenTestID,
    homeHeaderTestID,
    homeHeaderMarkTestID,
    homeHeaderWordTestID,
    weekStripTestID,
    homeForecastTestID,
    ...roundActions.map(roundActionTestID),
  ],
  prefixed: ['home-week-day-', 'home-week-letter-', 'home-week-date-', 'bottom-navigation'],
};

/** One section as it stood at one state of her data. */
export interface Measured {
  readonly section: string;
  readonly state: string;
  /** Whether her own data filled it at that state. */
  readonly hers: boolean;
  /** What of it the screen drew. Empty where the section was absent. */
  readonly drawn: readonly string[];
  /** What stood in its place. Empty where nothing did. */
  readonly instead: readonly string[];
  /** Whether she is owed a sentence where the section cannot be filled. */
  readonly owesASentence: boolean;
}

/** Every section of the screen on the glass, measured against what her phone holds. */
export function everySectionMeasured(state: string, hers: HerData): Measured[] {
  const drawn = theIdentifiersDrawn();

  return theSectionsOfTheScreenSheOpens.map((section) => ({
    drawn: drawn.filter((identifier) => claims(section.draws, identifier)),
    hers: section.fills(hers),
    instead: drawn.filter((identifier) => claims(section.insteadDraws, identifier)),
    owesASentence: section.insteadDraws !== undefined,
    section: section.name,
    state,
  }));
}

/**
 * What the rule finds wrong, one line for each, naming the section and the state.
 *
 * Three ways a section breaks it: it is drawn with nothing behind it, it is absent while her days
 * fill it, and it is absent with nothing in its place where she is owed a sentence.
 */
export function sectionsBreakingTheRule(measured: readonly Measured[]): string[] {
  const problems: string[] = [];

  for (const section of measured) {
    const where = `at ${section.state}, ${section.section}`;

    if (!section.hers && section.drawn.length > 0) {
      problems.push(`${where} is drawn from nothing: ${section.drawn.join(', ')}`);
    }

    if (section.hers && section.drawn.length === 0) {
      problems.push(`${where} is filled by her own data and nothing of it is drawn`);
    }

    if (
      !section.hers &&
      section.drawn.length === 0 &&
      section.owesASentence &&
      section.instead.length === 0
    ) {
      problems.push(`${where} is absent and no sentence stands in its place`);
    }

    if (section.hers && section.instead.length > 0) {
      problems.push(
        `${where} is drawn and a sentence stands in its place too: ${section.instead.join(', ')}`,
      );
    }
  }

  return problems;
}

/**
 * Every identifier the screen drew that no section and no part of the frame answers for.
 *
 * This is what makes the record a rule rather than a list somebody remembered to keep: a section
 * added to the screen with no entry above arrives here, named, on the first run.
 */
export function partsNoSectionAnswersFor(): string[] {
  return theIdentifiersDrawn().filter(
    (identifier) =>
      !claims(theFrameOfTheScreenSheOpens, identifier) &&
      !theSectionsOfTheScreenSheOpens.some((section) => identifiersOf(section, identifier)),
  );
}

/**
 * Every section that claims an identifier another section claims too, over the record itself and
 * over every part the screen drew. Exactly one section answers for a part, so a failure names one
 * section rather than leaving a reader to work out which of two it meant.
 */
export function sectionsClaimingTheSamePart(drawn: readonly string[]): string[] {
  const problems: string[] = [];
  const everyIdentifier = [
    ...new Set([
      ...theSectionsOfTheScreenSheOpens.flatMap((section) => [
        ...(section.draws.named ?? []),
        ...(section.insteadDraws?.named ?? []),
      ]),
      ...(theFrameOfTheScreenSheOpens.named ?? []),
      ...drawn,
    ]),
  ];

  for (const identifier of everyIdentifier) {
    const claimed = theSectionsOfTheScreenSheOpens.filter((section) =>
      identifiersOf(section, identifier),
    );
    const byTheFrame = claims(theFrameOfTheScreenSheOpens, identifier);

    if (claimed.length + (byTheFrame ? 1 : 0) > 1) {
      problems.push(
        `${identifier} is claimed by ${[...claimed.map((section) => section.name), ...(byTheFrame ? ['the frame'] : [])].join(' and ')}`,
      );
    }
  }

  return problems;
}
