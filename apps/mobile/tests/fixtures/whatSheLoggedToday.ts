import type { DayRecord } from '@emi/crypto';
import { type Symptom, findSymptom, symptoms } from '@emi/cycle';
import { screen } from '@testing-library/react-native';

import {
  loggedTodayLeadTestID,
  loggedTodayLineTestID,
  loggedTodayTestID,
} from '../../src/features/home/LoggedToday';

import { herPhoneHoldsTheseAnswers } from './herPhone';
import { textIn } from './renderedText';
import { type Part, theMarkupOfTheMockup, thePartsOfTheMockup } from './theMockupScreen';
import {
  sheSaidHerCycleRuns,
  sheSaidHerPeriodRunsFor,
  theDaySheOpensIt,
  theDaysOfHerWeek,
  theDaysOfTheDrawingsStrip,
} from './theWeekSheOpensWith';

/**
 * The row under the phase line: the two drawings it is read from, the phone it is read on, and
 * what the built row drew.
 *
 * Two drawings answer the same question in opposite ways. `todayNext` is the screen she opens
 * before she marks anything, and it places no row. `todayLogged` is the same screen after she
 * saved, and it places one. So neither the presence nor the absence is a rule somebody typed:
 * each one is read off the drawing that decides it.
 */

/** The drawing of the screen she opens before she marked anything today. */
export const theDrawingBeforeSheLogged = 'todayNext';

/** The drawing of the screen she comes back to, which places the row. */
export const theDrawingAfterSheLogged = 'todayLogged';

/**
 * Every drawing this fixture reads, with its key written out at the call. The gate over the
 * mockups stage reads the literal there, so a key built at run time is a drawing nobody can tell
 * is missing.
 */
const theDrawings: Readonly<Record<string, () => Part[]>> = {
  todayLogged: () => thePartsOfTheMockup('todayLogged'),
  todayNext: () => thePartsOfTheMockup('todayNext'),
};

/** The name both drawings give the part this step builds. */
export const thePartTheDrawingNames = 'LoggedToday';

/** The part the ring is drawn as, which is where the top of this screen stops. */
const theRing = 'CycleRing';

/** The parts one drawing places from the top of the screen down to the ring. */
export function theScreenDownToTheRing(key: string): Part[] {
  const parts = theEveryPartOf(key);
  const ring = parts.map((part) => part.name).indexOf(theRing);

  if (ring < 0) {
    throw new Error(`the drawing "${key}" places no ring, so it names no top of the screen`);
  }

  return parts.slice(0, ring + 1);
}

/**
 * Whether one drawing places the row at all, read off the whole drawing. The row stands under the
 * round actions, which is below the ring, so a reader that stopped at the ring would answer no for
 * every drawing.
 */
export function theDrawingPlacesTheRow(key: string): boolean {
  return theEveryPartOf(key).some((part) => part.name === thePartTheDrawingNames);
}

/** Every part one drawing places, which is what both readers above are answered from. */
function theEveryPartOf(key: string): Part[] {
  const read = theDrawings[key];

  if (read === undefined) {
    throw new Error(
      `this step is held to todayNext and todayLogged, and it was asked for "${key}"`,
    );
  }

  return read();
}

const theRowOfTheDrawing = /<li class="row"[^>]*data-to="([^"]*)"[^>]*>([\s\S]*?)<\/li>/;
const theLineUnderTheHeading = /<span class="sub">([^<]*)<\/span>/;

function theRowMarkup(): RegExpExecArray {
  const row = theRowOfTheDrawing.exec(theMarkupOfTheMockup('todayLogged'));

  if (row === null) {
    throw new Error('the drawing of the screen she comes back to places no row');
  }

  return row;
}

/** Where the drawing sends the row, which is the drawing its press opens. */
export function whereTheDrawingSendsTheRow(): string {
  return String(theRowMarkup()[1]);
}

/** The draft line the drawing writes under the heading, in the one language it is drafted in. */
export function theLineTheDrawingDrafts(): string {
  const line = theLineUnderTheHeading.exec(theRowMarkup()[2] ?? '');

  if (line === null) {
    throw new Error('the row of the drawing carries no line under its heading');
  }

  return String(line[1]);
}

interface Found {
  readonly symptom: Symptom;
  readonly at: number;
}

/**
 * The symptoms of the catalogue one line names, in the order it names them.
 *
 * A name that sits inside a longer name is dropped, because two entries of the catalogue are part
 * of a longer entry and a line carrying the longer one names one symptom and not two.
 */
export function theSymptomsNamedIn(line: string): string[] {
  const said = line.toLowerCase();
  const found: Found[] = [];

  for (const symptom of symptoms) {
    const at = said.indexOf(symptom.name.toLowerCase());

    if (at >= 0) {
      found.push({ at, symptom });
    }
  }

  return found
    .filter(
      (one) =>
        !found.some(
          (other) =>
            other !== one &&
            other.at <= one.at &&
            other.at + other.symptom.name.length >= one.at + one.symptom.name.length,
        ),
    )
    .sort((one, other) => one.at - other.at)
    .map((each) => each.symptom.slug);
}

/**
 * The symptoms the drawing's line names, resolved to the catalogue. The walk marks these rather
 * than two slugs typed into a test, so the day the walk records is the day the drawing draws.
 *
 * A line that resolves to nothing is refused. A walk that marked no symptom would read back an
 * absent row, which is what the other half of this step proves, so it may never pass here.
 */
export function theSymptomsTheDrawingNames(): string[] {
  const named = theSymptomsNamedIn(theLineTheDrawingDrafts());

  if (named.length === 0) {
    throw new Error(`the line "${theLineTheDrawingDrafts()}" names no symptom of the catalogue`);
  }

  return named;
}

/** What one symptom is called, which is what the row names it by. */
export function theNameOf(slug: string): string {
  const symptom = findSymptom(slug);

  if (symptom === undefined) {
    throw new Error(`the catalogue holds no symptom called "${slug}"`);
  }

  return symptom.name;
}

/** The days the drawing's strip fills, which are the days she bled before today. */
export function theDaysSheBledOn(): string[] {
  const strip = theDaysOfTheDrawingsStrip();

  return theDaysOfHerWeek().filter((_unused, at) => strip[at]?.mark === 'bled');
}

/** Those days as records, which is her period up to but not including today. */
export function herRecordedPeriodDays(): DayRecord[] {
  return theDaysSheBledOn().map((day) => ({
    day,
    flow: 'medium',
    recordedAt: `${day}T08:00:00.000Z`,
  }));
}

/** Today as she leaves it once she marks the symptoms the drawing names. */
export function theDaySheMarkedThoseSymptoms(recordedAt: Date): DayRecord {
  return {
    day: theDaySheOpensIt,
    symptoms: theSymptomsTheDrawingNames(),
    recordedAt: recordedAt.toISOString(),
  };
}

async function herPhoneHolds(
  firstRunFinishedAt: Date,
  records: readonly DayRecord[],
): Promise<void> {
  await herPhoneHoldsTheseAnswers(
    firstRunFinishedAt,
    {
      kind: 'profile',
      cycleLengthDays: sheSaidHerCycleRuns,
      periodLengthDays: sheSaidHerPeriodRunsFor,
      recordedAt: firstRunFinishedAt.toISOString(),
    },
    records,
  );
}

/**
 * Her phone at the start of the walk: the period days the drawing fills, and nothing at all for
 * today. That is the woman `todayNext` draws, whose strip fills the days behind today and leaves
 * today ringed.
 */
export async function herPhoneHoldsNothingForToday(firstRunFinishedAt: Date): Promise<void> {
  await herPhoneHolds(firstRunFinishedAt, herRecordedPeriodDays());
}

/** The same phone after she marked the symptoms, which is the woman `todayLogged` draws. */
export async function herPhoneHoldsTheSymptomsSheMarked(firstRunFinishedAt: Date): Promise<void> {
  await herPhoneHolds(firstRunFinishedAt, [
    ...herRecordedPeriodDays(),
    theDaySheMarkedThoseSymptoms(firstRunFinishedAt),
  ]);
}

/** What the built row drew: the heading over it, and the one line under the heading. */
export interface RowOnTheGlass {
  readonly lead: string;
  readonly line: string;
}

/** Whether the row is on the glass at all, which is the whole of the absent case. */
export function theRowIsOnTheScreen(): boolean {
  return screen.queryByTestId(loggedTodayTestID) !== null;
}

/** The row she reads, or a refusal where there is no row to read. */
export function theRowSheReads(): RowOnTheGlass {
  return {
    lead: textIn(screen.getByTestId(loggedTodayLeadTestID)).join(''),
    line: textIn(screen.getByTestId(loggedTodayLineTestID)).join(''),
  };
}

/** Every symptom of the catalogue the row names, in the order the row names them. */
export function theSymptomsTheRowNames(): string[] {
  return theSymptomsNamedIn(theRowSheReads().line);
}
