import type { DayRecord, ProfileRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import type { DayMark } from '../../src/features/cycle/herWeek';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { homeScreenTestID } from '../../src/features/home/HomeScreen';
import {
  weekCycleDayTestID,
  weekDateTestID,
  weekDayTestID,
  weekLetterTestID,
} from '../../src/features/home/WeekStrip';

import { herDatabase, herPhoneHoldsTheseAnswers } from './herPhone';
import { herVault } from './herVault';
import { textIn } from './renderedText';
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
 */

/** The week the drawing shows: her period started on the Monday and she opens Emi on the Thursday. */
export const herPeriodStartedOn = '2026-09-14';
export const theDaySheOpensIt = '2026-09-17';

/** Her two answers at the first run, which are the two the drawing was worked out from. */
export const sheSaidHerCycleRuns = 31;
export const sheSaidHerPeriodRunsFor = 5;

/** How many days she recorded, all of them bleeding, ending on the day she opens Emi. */
export const theDaysSheRecorded = 4;

/** The header and the strip, which is what this step builds. The drawing places nine more parts. */
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
 */
export function whatTheScreenSheOpensDrew(): string[] {
  const drawn = theIdentifiersDrawn();
  const at = drawn.indexOf(homeScreenTestID);

  if (at < 0) {
    throw new Error('the screen she opens was not on the glass');
  }

  return drawn.slice(at + 1);
}

/** What a day of the strip is drawn under, without the day itself, so a reader can match on it. */
const aDayOfTheBuiltStrip = weekDayTestID('');

/** Every day the built strip drew, in the order it drew them. */
export function theDaysTheStripDrew(): string[] {
  return screen
    .queryAllByTestId(new RegExp(`^${aDayOfTheBuiltStrip}`))
    .map((element) => String(element.props.testID).slice(aDayOfTheBuiltStrip.length));
}

function saidUnder(testID: string): string {
  return textIn(screen.getByTestId(testID)).join('');
}

/** The letter of the weekday the built strip drew over that day. */
export function theLetterOver(day: string): string {
  return saidUnder(weekLetterTestID(day));
}

/** The date the built strip drew for that day, as the number she reads. */
export function theDateDrawnFor(day: string): number {
  return Number(saidUnder(weekDateTestID(day)));
}

/** The cycle day the built strip drew over that date, or nothing where it drew none. */
export function theCycleDayOver(day: string): number | undefined {
  const drawn = screen.queryByTestId(weekCycleDayTestID(day));

  return drawn === null ? undefined : Number(textIn(drawn).join(''));
}

/**
 * Which of the four states the built strip drew that date in, read off the drawn style rather
 * than off a name the component wrote for itself. A fill, a ring and a dotted outline are three
 * different things to look at, and that is what the reader below distinguishes.
 */
export function theMarkOnTheDate(day: string): DayMark {
  const style: ViewStyle = StyleSheet.flatten(screen.getByTestId(weekDateTestID(day)).props.style);

  if (style.backgroundColor !== undefined && style.backgroundColor !== 'transparent') {
    return 'bled';
  }
  if (style.borderStyle === 'dotted') {
    return 'forecast';
  }

  return (style.borderWidth ?? 0) > 0 ? 'today' : 'plain';
}

/** What the built strip drew for every day of her week: the date, the cycle day and the state. */
export function theStripSheReads(): DrawnDay[] {
  return theDaysTheStripDrew().map((day) => ({
    cycleDay: theCycleDayOver(day) ?? Number.NaN,
    date: theDateDrawnFor(day),
    letter: theLetterOver(day),
    mark: theMarkOnTheDate(day),
  }));
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
