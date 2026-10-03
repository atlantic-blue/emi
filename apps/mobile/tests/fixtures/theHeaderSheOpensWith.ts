import type { DayRecord, ProfileRecord } from '@emi/crypto';
import { washFieldTestID, washTestID, washTintTestID } from '@emi/ui';

import {
  homeGreetingTestID,
  homeHeaderMarkTestID,
  homeHeaderTestID,
  homeHeaderWordTestID,
} from '../../src/features/home/HomeHeader';
import { homeScreenTestID } from '../../src/features/home/HomeScreen';

import { herPhoneHoldsTheseAnswers } from './herPhone';
import { daysOfHerThreeCycles } from './herThreeCycles';
import {
  type Part,
  theIdentifiersDrawn,
  theMarkupOfTheMockup,
  thePartsOfTheMockup,
} from './theMockupScreen';

/**
 * The header of the screen she opens: the drawing it is held to, and the phone it is read off.
 * The scenario and the integration test both read both from here, so the two are held to one
 * drawing and to one woman rather than to two of each that happen to agree.
 *
 * The drawing names the header as one part and names nothing inside it: the mark, the word and the
 * greeting carry no component of their own. So the order inside the header is read off the markup,
 * and the record below joins each of the three to the identifier the built header draws it under.
 */

/** The name she gave at the first run, and the greeting the header reads from it. */
export const theNameSheGave = 'Ada';

/** The length she gave at the first run, which the header does not read. */
export const sheSaidHerCycleRuns = 28;

/** The header, on its own. The drawing places ten more parts, and later steps build those. */
export function theHeaderOfTheDrawing(): Part[] {
  return thePartsOfTheMockup('todayNext').slice(0, 1);
}

/** Every part of the drawing, which this step builds the first of. */
export function everyPartOfTheDrawing(): Part[] {
  return thePartsOfTheMockup('todayNext');
}

/**
 * The three things the header carries, each with the identifier the built header draws it under.
 * The order is held to the drawing by `theOrderTheDrawingPlacesThemIn`.
 */
export const theHeaderCarries: readonly Part[] = [
  { builtUnder: [homeHeaderMarkTestID], name: 'mark' },
  { builtUnder: [homeHeaderWordTestID], name: 'word' },
  { builtUnder: [homeGreetingTestID], name: 'greeting' },
];

/** The header and everything in it, so a walk of the whole screen is cut to what this step builds. */
export const theIdentifiersOfTheHeader: readonly string[] = [
  homeHeaderTestID,
  homeHeaderMarkTestID,
  homeHeaderWordTestID,
  homeGreetingTestID,
];

/**
 * Everything the screen she opens drew, from itself downwards.
 *
 * The route tree wraps the screen in the lock, which draws an identifier of its own above it, so a
 * walk of the whole glass answers the lock where the question is about the screen.
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

  return drawn.slice(at + 1).filter((identifier) => !theIdentifiersOfTheWash.includes(identifier));
}

/** Every identifier the wash draws, which is the whole of what the reader above leaves out. */
const theIdentifiersOfTheWash: readonly string[] = [
  washTestID,
  washFieldTestID,
  washTintTestID(1),
  washTintTestID(2),
];

/** Everything the header drew, in the order the screen drew it, and nothing from below it. */
export function whatTheHeaderDrew(): string[] {
  return whatTheScreenSheOpensDrew().filter((identifier) =>
    theIdentifiersOfTheHeader.includes(identifier),
  );
}

const aHeaderElement = /<header[^>]*data-component="HomeHeader"[^>]*>([\s\S]*?)<\/header>/;

/** How the markup of the drawing writes each of the three. */
const theMarkupOfAThing: readonly { readonly written: RegExp; readonly name: string }[] = [
  { name: 'mark', written: /<svg\b/g },
  { name: 'word', written: /class="word"/g },
  { name: 'greeting', written: /class="greeting"/g },
];

/**
 * The three things inside the drawing's header, in the order the drawing writes them. An order
 * somebody typed would pass against itself, so the order every comparison uses comes from here.
 */
export function theOrderTheDrawingPlacesThemIn(): string[] {
  const inside = aHeaderElement.exec(theMarkupOfTheMockup('todayNext'));

  if (inside === null) {
    throw new Error('the drawing of the screen she opens carries no header named HomeHeader');
  }

  const markup = inside[1] ?? '';
  const found: { at: number; name: string }[] = [];

  for (const thing of theMarkupOfAThing) {
    thing.written.lastIndex = 0;

    for (let read = thing.written.exec(markup); read !== null; read = thing.written.exec(markup)) {
      found.push({ at: read.index, name: thing.name });
    }
  }

  return found.sort((one, other) => one.at - other.at).map((thing) => thing.name);
}

/** Her days, so the screen she opens draws a ring and a range rather than the learning state. */
export function herRecordedDays(today: string): DayRecord[] {
  return daysOfHerThreeCycles(today);
}

/**
 * Her phone before she opens Emi: her own days, and the name she gave or no name at all. A woman
 * who gave none is the second case the header is proved over.
 */
export async function herPhoneHoldsHerDaysAnd(
  firstRunFinishedAt: Date,
  today: string,
  name?: string,
): Promise<void> {
  const profile: ProfileRecord = {
    kind: 'profile',
    cycleLengthDays: sheSaidHerCycleRuns,
    ...(name === undefined ? {} : { name }),
    recordedAt: firstRunFinishedAt.toISOString(),
  };

  await herPhoneHoldsTheseAnswers(firstRunFinishedAt, profile, herRecordedDays(today));
}
