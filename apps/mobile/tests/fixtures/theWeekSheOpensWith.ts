import type { DayRecord, ProfileRecord } from '@emi/crypto';
import { type CyclePhaseDays, addDays } from '@emi/cycle';
import { washFieldTestID, washTestID, washTintTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';

import { listCycles } from '../../src/data/cycleRepository';
import type { DayMark } from '../../src/features/cycle/herWeek';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { phaseDaysFor, ringInputFor } from '../../src/features/cycle/ringInput';
import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import { ringCentreDayTestID } from '../../src/components/CycleRing';
import { homeCalendarTestID } from '../../src/features/home/HomeHeader';

import { herDatabase, herPhoneHoldsTheseAnswers } from './herPhone';
import { herVault } from './herVault';
import { textIn } from './renderedText';
import { type Control, controlsTooSmallToPress } from './tapTargets';
import {
  type Part,
  theIdentifiersDrawn,
  theMarkupOfTheMockup,
  thePartsOfTheMockup,
} from './theMockupScreen';

/**
 * The week of the screen she opens: the drawing it is held to, and the phone it is read off. The
 * scenario and the integration test both read both from here, so the two are held to one drawing
 * and to one woman rather than to two of each that happen to agree.
 *
 * The drawing names the strip as one part and names nothing inside it, so the seven days and what
 * each one carries are read off the markup. Seven days somebody typed would pass against
 * themselves.
 *
 * The built screen no longer draws the strip: the approved todayPhases board replaces it with a
 * calendar button in the top bar, and puts the day of her cycle in the middle of the ring. The
 * drawing is still read, because the dates of her week and the day she opens Emi come from it.
 */

/** The week the drawing shows: her period started on the Monday and she opens Emi on the Thursday. */
export const herPeriodStartedOn = '2026-09-14';
export const theDaySheOpensIt = '2026-09-17';

/** Her two answers at the first run, which are the two the drawing was worked out from. */
export const sheSaidHerCycleRuns = 31;
export const sheSaidHerPeriodRunsFor = 5;

/** How many days she recorded, all of them bleeding, ending on the day she opens Emi. */
export const theDaysSheRecorded = 4;

/** The header and the strip, as the drawing places them. The built screen draws the header only. */
export function theHeaderAndTheStripOfTheDrawing(): Part[] {
  return thePartsOfTheMockup('todayNext').slice(0, 2);
}

/** One day of the strip, as the drawing draws it. */
export interface DrawnDay {
  /** The letter of the weekday, which the drawing writes in English and the phone in her own. */
  readonly letter: string;
  /** The day of the month, as a number. */
  readonly date: number;
  readonly cycleDay: number;
  readonly mark: DayMark;
}

const aDayOfTheStrip = /<div class="day">([\s\S]*?)<\/div>/g;
const theLetter = /<span class="letter">([^<]*)<\/span>/;
const theDate = /<span class="date([^"]*)">([^<]*)<\/span>/;
const theCycleDay = /<span class="cycleday">([^<]*)<\/span>/;

function markOf(classes: string): DayMark {
  for (const mark of ['bled', 'today', 'forecast'] as const) {
    if (classes.split(/\s+/).includes(mark)) {
      return mark;
    }
  }

  return 'plain';
}

/**
 * The days of the drawing's strip, in the order it places them. Everything a case holds the built
 * strip to comes from here, so the count, the dates, the cycle days and the four states are the
 * drawing's own rather than a second copy of them.
 */
export function theDaysOfTheDrawingsStrip(): DrawnDay[] {
  const markup = theMarkupOfTheMockup('todayNext');
  const days: DrawnDay[] = [];

  aDayOfTheStrip.lastIndex = 0;

  for (
    let found = aDayOfTheStrip.exec(markup);
    found !== null;
    found = aDayOfTheStrip.exec(markup)
  ) {
    const inside = found[1] ?? '';
    const date = theDate.exec(inside);
    const cycleDay = theCycleDay.exec(inside);
    const letter = theLetter.exec(inside);

    if (date === null || cycleDay === null || letter === null) {
      throw new Error(`a day of the drawing's strip carries no letter, date or cycle day`);
    }

    days.push({
      cycleDay: Number(cycleDay[1]),
      date: Number(date[2]),
      letter: String(letter[1]),
      mark: markOf(String(date[1])),
    });
  }

  if (days.length === 0) {
    throw new Error('the drawing of the screen she opens carries no week strip');
  }

  return days;
}

/** The day of the calendar each day of the drawing's strip stands for. */
export function theDaysOfHerWeek(): string[] {
  return theDaysOfTheDrawingsStrip().map((_unused, index) => addDays(herPeriodStartedOn, index));
}

/**
 * Everything the screen she opens drew, from itself downwards. The route tree wraps the screen in
 * the lock, which draws an identifier of its own above it, so a walk of the whole glass answers
 * the lock where the question is about the screen.
 *
 * The wash is left out of it. It is drawn first and it carries colour and no words, so a reader
 * asking what the screen says would otherwise be answered by a gradient.
 */
export function whatTheScreenSheOpensDrew(): string[] {
  const drawn = theIdentifiersDrawn();
  const at = drawn.indexOf(homeScreenTestID);

  if (at < 0) {
    throw new Error('the screen she opens was not on the glass');
  }

  return drawn.slice(at + 1).filter((identifier) => !theWashIsDrawnUnder.includes(identifier));
}

/** Every identifier the wash draws, which is the whole of what the reader above leaves out. */
const theWashIsDrawnUnder: readonly string[] = [
  washTestID,
  washFieldTestID,
  washTintTestID(1),
  washTintTestID(2),
];

/**
 * Every identifier the strip of seven days drew under. The todayPhases board takes the strip off
 * Today, so a reader asking for any of these on the screen she opens is asking for a part that
 * must be gone.
 */
export const theIdentifiersOfTheStripThatIsGone: readonly string[] = [
  'home-week-strip',
  'home-week-day-',
  'home-week-letter-',
  'home-week-date-',
  'home-week-cycle-day-',
];

/** Everything still on the glass that the strip used to draw. Empty is the answer once it is gone. */
export function whatIsLeftOfTheStrip(): string[] {
  return theIdentifiersDrawn().filter((identifier) =>
    theIdentifiersOfTheStripThatIsGone.some((gone) => identifier.startsWith(gone)),
  );
}

/** The calendar button in the top bar, which is the way to her month that replaced the strip. */
export function theCalendarButton(): Control {
  return screen.getByTestId(homeCalendarTestID);
}

/** The calendar button, named with its size, where it is under the floor SEE-3 sets. */
export function theCalendarButtonTooSmallToPress(): string[] {
  return controlsTooSmallToPress([theCalendarButton()]);
}

/** The day of her cycle the ring of Today writes in its middle, as the number she reads. */
export function theDayTheRingCentreSays(): number {
  return Number(textIn(screen.getByTestId(ringCentreDayTestID)).join('').replace(/\D+/g, ''));
}

/**
 * The day the ring itself would say she is on, were she opening Emi on that date. The strip is
 * held to this rather than to a number in a list, so a strip that counted a day of its own would
 * be caught by the thing it is not allowed to disagree with.
 */
export function theDayTheRingSaysFor(day: string): number | undefined {
  const database = herDatabase();
  const vault = herVault();

  return ringInputFor({
    cycles: listCycles(database),
    records: recordedDays(database, vault.open),
    today: day,
    statedCycleLengthDays: sheSaidHerCycleRuns,
    statedPeriodLengthDays: sheSaidHerPeriodRunsFor,
  })?.day;
}

/**
 * The days of each phase of her cycle, were she opening Emi on that date, read through the same
 * function the screen reads them through, so the card is held to the rule rather than to a list.
 */
export function thePhaseDaysTheRuleGivesFor(day: string): CyclePhaseDays | undefined {
  const database = herDatabase();
  const vault = herVault();

  return phaseDaysFor({
    cycles: listCycles(database),
    records: recordedDays(database, vault.open),
    today: day,
    statedCycleLengthDays: sheSaidHerCycleRuns,
    statedPeriodLengthDays: sheSaidHerPeriodRunsFor,
  });
}

/** The four days she bled, ending on the day she opens Emi. */
export function herFourRecordedPeriodDays(): DayRecord[] {
  return Array.from({ length: theDaysSheRecorded }, (_unused, index) => {
    const day = addDays(herPeriodStartedOn, index);

    return { day, flow: 'medium', recordedAt: `${day}T08:00:00.000Z` };
  });
}

/**
 * Her phone before she opens Emi: four recorded period days, and the two lengths she gave at the
 * first run. She gave no name, because the greeting is step 1 and this step reads the strip.
 */
export async function herPhoneHoldsFourRecordedPeriodDays(firstRunFinishedAt: Date): Promise<void> {
  const profile: ProfileRecord = {
    kind: 'profile',
    cycleLengthDays: sheSaidHerCycleRuns,
    periodLengthDays: sheSaidHerPeriodRunsFor,
    recordedAt: firstRunFinishedAt.toISOString(),
  };

  await herPhoneHoldsTheseAnswers(firstRunFinishedAt, profile, herFourRecordedPeriodDays());
}

/** Her phone with the answers of the first run and not one day recorded. */
export async function herPhoneHoldsNoDayAtAll(firstRunFinishedAt: Date): Promise<void> {
  const profile: ProfileRecord = {
    kind: 'profile',
    cycleLengthDays: sheSaidHerCycleRuns,
    periodLengthDays: sheSaidHerPeriodRunsFor,
    recordedAt: firstRunFinishedAt.toISOString(),
  };

  await herPhoneHoldsTheseAnswers(firstRunFinishedAt, profile, []);
}
