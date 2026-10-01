import type { DayRecord } from '@emi/crypto';
import { addDays, daysBetween } from '@emi/cycle';

import { listCycles } from '../../src/data/cycleRepository';
import { listDayLogs } from '../../src/data/dayLogRepository';
import type { Database } from '../../src/data/database';
import {
  type SymptomThatCameBack,
  theCyclesTheThirdSymptomIsIn,
  theSymptomSheLoggedTwice,
  theSymptomsThatCameBack,
} from './herRepeatingSymptoms';
import { herPhoneHoldsTheseAnswers } from './herPhone';

/**
 * The four states of her data the screen she opens is read at: no recorded day, one complete cycle,
 * two complete cycles, and six.
 *
 * Her answers are the same in all four, so the only thing that moves between them is the days she
 * recorded. A section that arrives on the wrong state is then a section her days earned too early,
 * and never an answer she happened to give.
 *
 * The lengths and the symptoms are the ones `herSixCycles` and `herRepeatingSymptoms` already hold,
 * so the woman read here is the woman the rest of the suite reads.
 */

/** The complete cycle lengths of each state, oldest first. One more cycle starts after the last. */
const theLengthsOfEachState: readonly (readonly number[])[] = [
  [],
  [28],
  [28, 30],
  [40, 22, 30, 28, 39, 27],
];

/** How long her period runs, which is what every cycle of every state bleeds for. */
export const herPeriodRunsFor = 5;

/**
 * The day of the open cycle she is standing on when she opens Emi. Day two, so she is inside her
 * period: the line that offers the pain log is then drawn at every state that has a ring, and that
 * section is read in both directions rather than only while it is absent.
 */
export const theDayOfHerCycleSheOpensOn = 2;

/** How many of her cycles must carry a symptom before Emi names it. Stated here, never read. */
const cyclesBeforeASymptomHasComeBack = 3;

/** The day of her cycle the third symptom sits on, which is no day either pattern lands on. */
const theThirdSymptomSitsOnCycleDay = 9;

/** The answers she gave at her first run, which are the same at all four states. */
export const herAnswers = {
  cycleLengthDays: 29,
  gaveTheName: 'Ada',
  periodRunsFor: herPeriodRunsFor,
  saidHerPeriodIsHard: true,
  askedForTheFertileWindow: true,
  askedForARecordForHerDoctor: true,
} as const;

/** Her answers, as the facts the rules of the sections are written against. */
const herAnswersAsFacts = {
  askedForARecordForHerDoctor: herAnswers.askedForARecordForHerDoctor,
  askedForTheFertileWindow: herAnswers.askedForTheFertileWindow,
  gaveAName: herAnswers.gaveTheName.length > 0,
  periodRunsFor: herAnswers.periodRunsFor,
  saidHerPeriodIsHard: herAnswers.saidHerPeriodIsHard,
} as const;

/**
 * What her phone holds at one state: the counts her own days come to, and the answers she gave at
 * her first run. Both are hers, and every rule a section is held to is written against them.
 */
export interface HerData {
  readonly recordedDays: number;
  readonly completeCycles: number;
  /** Whether she wrote anything about today, which the row under the line reads back. */
  readonly loggedToday: boolean;
  /** The day of the cycle she is standing on, or nothing at all before her first cycle began. */
  readonly dayOfHerCycle: number | undefined;
  /** Whether a symptom came back in enough of her cycles for Emi to name one. */
  readonly aSymptomCameBack: boolean;
  readonly gaveAName: boolean;
  readonly askedForTheFertileWindow: boolean;
  readonly askedForARecordForHerDoctor: boolean;
  readonly saidHerPeriodIsHard: boolean;
  /** How long she said her period runs, which the line offering the pain log is read against. */
  readonly periodRunsFor: number;
}

/** The counts her days come to, which is the half of the above that moves between the states. */
export type HerDays = Pick<
  HerData,
  'recordedDays' | 'completeCycles' | 'loggedToday' | 'dayOfHerCycle'
>;

/** One state: what it is called, the days it seeds, and what those days come to. */
export interface HerDataState {
  /** What the state is called, which is what a failure names beside the section. */
  readonly name: string;
  readonly days: readonly DayRecord[];
  /** What the days above come to. The guard reads her phone and holds this to it. */
  readonly holds: HerData;
}

function aBleedingDay(day: string, flow: DayRecord['flow']): DayRecord {
  return { day, flow, recordedAt: `${day}T08:00:00.000Z` };
}

function aDaySheMarked(day: string, slug: string): DayRecord {
  return { day, symptoms: [slug], recordedAt: `${day}T20:00:00.000Z` };
}

/**
 * The first day of every cycle of a state, the open one last, counted back from the day she opens
 * Emi so the cycle she is standing in is the one the state names.
 */
function herCyclesStartOn(today: string, lengths: readonly number[]): string[] {
  const starts = [addDays(today, -(theDayOfHerCycleSheOpensOn - 1))];

  for (let back = lengths.length - 1; back >= 0; back -= 1) {
    starts.unshift(addDays(String(starts[0]), -Number(lengths[back])));
  }

  return starts;
}

/**
 * The day one symptom sits on in one cycle, placed the way its anchor says. Every one of them is
 * well past the day her period closed, so none lands on a day the cycle arithmetic reads.
 */
function theDayASymptomSitsOn(
  starts: readonly string[],
  pattern: Pick<SymptomThatCameBack, 'anchor' | 'day'>,
  cycle: number,
): string {
  return pattern.anchor === 'cycle-day'
    ? addDays(String(starts[cycle]), pattern.day - 1)
    : addDays(String(starts[cycle + 1]), -pattern.day);
}

/**
 * The symptoms she wrote on top of her cycles, which is what makes one of them come back.
 *
 * A symptom only goes in a cycle the state actually has, so a state of one cycle carries one of
 * each and a state of two carries two. Two is a coincidence rather than a pattern, which is why
 * the section that names what came back is absent at three of the four states and drawn at one.
 */
function herSymptomsOver(starts: readonly string[], completeCycles: number): DayRecord[] {
  const marked: DayRecord[] = [];

  for (const pattern of theSymptomsThatCameBack) {
    for (let cycle = 0; cycle < Math.min(pattern.cyclesWithIt, completeCycles); cycle += 1) {
      marked.push(aDaySheMarked(theDayASymptomSitsOn(starts, pattern, cycle), pattern.slug));
    }
  }

  for (let cycle = 0; cycle < Math.min(theCyclesTheThirdSymptomIsIn, completeCycles); cycle += 1) {
    marked.push(
      aDaySheMarked(
        theDayASymptomSitsOn(
          starts,
          { anchor: 'cycle-day', day: theThirdSymptomSitsOnCycleDay },
          cycle,
        ),
        theSymptomSheLoggedTwice,
      ),
    );
  }

  return marked;
}

/**
 * Her days at one state: every complete cycle bled through and closed, then the days of the open
 * cycle up to the one she is standing on. Nothing is written on a day she has not lived.
 *
 * The symptoms go on every state that has cycles to carry them, and a state with one cycle carries
 * none, so the section that names what came back is read on both sides of its own threshold.
 */
function herDaysAt(today: string, lengths: readonly number[]): DayRecord[] {
  if (lengths.length === 0) {
    return [];
  }

  const starts = herCyclesStartOn(today, lengths);
  const days: DayRecord[] = [];

  for (const start of starts.slice(0, -1)) {
    for (let day = 0; day < herPeriodRunsFor; day += 1) {
      days.push(
        aBleedingDay(addDays(start, day), day === herPeriodRunsFor - 1 ? 'light' : 'medium'),
      );
    }
    // The day after the period, written with no flow, which is what closes the period.
    days.push(aBleedingDay(addDays(start, herPeriodRunsFor), 'none'));
  }

  for (let day = 0; day < Math.min(herPeriodRunsFor, theDayOfHerCycleSheOpensOn); day += 1) {
    days.push(aBleedingDay(addDays(String(starts[starts.length - 1]), day), 'medium'));
  }

  return [...days, ...herSymptomsOver(starts, lengths.length)].sort((one, other) =>
    one.day.localeCompare(other.day),
  );
}

/**
 * Whether any symptom she wrote came back in enough complete cycles to be named, counted off the
 * days of the state and the cycles they fall in. It is counted here rather than asked of the
 * arithmetic the cards are drawn from, so the two are a second opinion on each other.
 */
function aSymptomCameBackIn(days: readonly DayRecord[], starts: readonly string[]): boolean {
  const complete = starts.slice(0, -1);
  const cyclesWithIt = new Map<string, Set<number>>();

  for (const day of days) {
    for (const slug of day.symptoms ?? []) {
      const where = complete.findLastIndex((start) => daysBetween(start, day.day) >= 0);

      if (where >= 0) {
        cyclesWithIt.set(slug, (cyclesWithIt.get(slug) ?? new Set<number>()).add(where));
      }
    }
  }

  return [...cyclesWithIt.values()].some(
    (cycles) => cycles.size >= cyclesBeforeASymptomHasComeBack,
  );
}

/**
 * The four states, in the order her days arrive in. Each one carries what its days come to, so a
 * state that does not hold what it claims fails before anything is read off the screen.
 */
export function theStatesOfHerData(today: string): HerDataState[] {
  return theLengthsOfEachState.map((lengths) => {
    const starts = herCyclesStartOn(today, lengths);
    const days = herDaysAt(today, lengths);

    return {
      days,
      holds: {
        ...herAnswersAsFacts,
        aSymptomCameBack: aSymptomCameBackIn(days, starts),
        completeCycles: lengths.length,
        dayOfHerCycle: days.length === 0 ? undefined : theDayOfHerCycleSheOpensOn,
        loggedToday: days.some((day) => day.day === today),
        recordedDays: new Set(days.map((day) => day.day)).size,
      },
      name: theNameOfTheState(lengths.length),
    };
  });
}

function theNameOfTheState(complete: number): string {
  if (complete === 0) {
    return 'nothing recorded';
  }

  return complete === 1 ? 'one complete cycle' : `${String(complete)} complete cycles`;
}

/** Her phone at one state: her answers, which never move, and the days that state recorded. */
export async function herPhoneHoldsThisState(
  firstRunFinishedAt: Date,
  state: HerDataState,
): Promise<void> {
  await herPhoneHoldsTheseAnswers(
    firstRunFinishedAt,
    {
      kind: 'profile',
      cycleLengthDays: herAnswers.cycleLengthDays,
      feeling: 'hard',
      goals: ['fertileWindow', 'doctorRecord'],
      name: herAnswers.gaveTheName,
      periodLengthDays: herAnswers.periodRunsFor,
      recordedAt: firstRunFinishedAt.toISOString(),
      regularity: 'moves',
    },
    state.days,
  );
}

/**
 * What her phone actually holds, read back out of the tables rather than counted off the seeding.
 * The day of her cycle comes off the open cycle's own first day, so it is a fact about her rows
 * and not a number the screen worked out.
 *
 * Whether a symptom came back is not here: the symptoms are sealed, and opening them again would
 * be this guard asking the arithmetic it is checking. The state counts that one off its own days.
 */
export function whatHerPhoneHolds(database: Database, today: string): HerDays {
  const cycles = listCycles(database);
  const open = cycles.find((cycle) => cycle.lengthDays === null);
  const days = listDayLogs(database);

  return {
    completeCycles: cycles.filter((cycle) => cycle.lengthDays !== null).length,
    dayOfHerCycle: open === undefined ? undefined : daysBetween(open.startedOn, today) + 1,
    loggedToday: days.some((day) => day.day === today),
    recordedDays: days.length,
  };
}
