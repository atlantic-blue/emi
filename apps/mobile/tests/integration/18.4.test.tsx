import { join } from 'node:path';

import { type PhaseName, phaseNames } from '@emi/tokens';
import { tabTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { type CycleRow, listCycles } from '../../src/data/cycleRepository';
import {
  cycleStripBarTestID,
  cycleStripFillTestID,
  cycleStripLengthTestID,
  cycleStripTestID,
  homeCyclesTestID,
} from '../../src/features/home/CycleStrip';
import { homeCyclesLineTestID, homeScreenTestID } from '../../src/features/home/HomeScreen';
import { stripsSheReads } from '../../src/features/home/herCycles';
import {
  historyArcTestID,
  historyCycleTestID,
  historyScreenTestID,
} from '../../src/features/history/HistoryScreen';
import { wordKeys } from '../../src/language';
import { english } from '../../src/language/english';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import { type Catalogue, type Language } from '../../src/language';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { daysOfHerThreeCycles } from '../fixtures/herThreeCycles';
import { sizedTextIn, textIn } from '../fixtures/renderedText';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';
import {
  type Part,
  partsMissing,
  theIdentifiersDrawn,
  thePartsOfTheMockup,
} from '../fixtures/theMockupScreen';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** The length she gave at the first run, which no strip of this section reads. */
const sheSaidHerCycleRuns = 29;

/** Points. Contract SCREEN-2 keeps the word bleeding on this screen at this size or under. */
const theLargestAWordMayBeDrawn = 14;

/** What the strip of the cycle she is in says, in the words of the catalogue. */
const theRunningCycleReads = 'Still running, 5 of bleeding so far';

/** Every key the section draws its words from, so a key added later is read by this file too. */
const theKeysOfTheSection = wordKeys.filter((key) => key.startsWith('home.cycles.'));

const theCatalogueOf: Readonly<Record<Language, Catalogue>> = {
  en: english,
  es: spanish,
  ru: russian,
};

async function sheOpensEmi(): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, daysOfHerThreeCycles(today), sheSaidHerCycleRuns);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

/** Her phone, with her answers and not one day on it, which is the phone with no cycle at all. */
async function sheOpensEmiWithNothingRecorded(): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, [], sheSaidHerCycleRuns);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/**
 * Her cycles as her phone holds them, most recent first. The strips are held against this rather
 * than against a list typed here, because the cache is where a cycle comes from.
 */
function theCyclesHerPhoneHolds(): CycleRow[] {
  return [...listCycles(herDatabase())]
    .filter((cycle) => !cycle.isPredicted)
    .sort((one, other) => other.startedOn.localeCompare(one.startedOn));
}

/** Every strip on the glass, in the order the screen drew them. */
function theStripsSheReads(): string[] {
  const hers = new Set(theCyclesHerPhoneHolds().map((cycle) => cycleStripTestID(cycle.startedOn)));

  return theIdentifiersDrawn().filter((identifier) => hers.has(identifier));
}

/** The days one fill of a strip covers, read off the drawing itself. */
function theDaysOfTheFill(startedOn: string, phase: PhaseName): number {
  const style = StyleSheet.flatten(
    screen.getByTestId(cycleStripFillTestID(startedOn, phase)).props.style,
  ) as { flexGrow?: number };

  return style.flexGrow ?? 0;
}

/** The days one arc of the same cycle covers on the Insights screen. */
function theDaysOfTheArc(startedOn: string, phase: PhaseName): number {
  const style = StyleSheet.flatten(
    screen.getByTestId(historyArcTestID(startedOn, phase)).props.style,
  ) as { flexGrow?: number };

  return style.flexGrow ?? 0;
}

/** The phases one strip drew, which are the phases that cycle had a day for. */
function thePhasesOfTheStrip(startedOn: string): PhaseName[] {
  const drawn = new Set(theIdentifiersDrawn());

  return phaseNames.filter((phase) => drawn.has(cycleStripFillTestID(startedOn, phase)));
}

/** Every word of the section with the size it is drawn at, which SCREEN-2 holds to 14 points. */
function theWordsOfTheSection(): { text: string; points: number | undefined }[] {
  return sizedTextIn(screen.getByTestId(homeCyclesTestID));
}

/** Whether a cycle is marked on the Insights screen as the one she arrived at. */
function theCycleMarkedOnInsights(): string[] {
  return theCyclesHerPhoneHolds()
    .filter((cycle) => {
      const state = screen.getByTestId(historyCycleTestID(cycle.startedOn)).props
        .accessibilityState as { selected?: boolean } | undefined;

      return state?.selected === true;
    })
    .map((cycle) => cycle.startedOn);
}

/**
 * What each part of the drawing is built under on the screen she opens, in the drawing's order.
 *
 * A part with nothing under it is a part another step owns, named with the step that owns it. The
 * drawing is a whole page and this step builds a section of one, so the header and the way back
 * belong to feature 15. The last Text of the drawing carries a sentence about the contracts rather
 * than anything a woman reads, so the line under the strips answers for it in her own words.
 */
interface PartOfTheDrawing {
  readonly name: string;
  readonly builtUnder: readonly string[];
  /** Nothing at all where this step builds the part. */
  readonly ownedBy?: string;
}

function theDrawingPlaces(): PartOfTheDrawing[] {
  const strips = theCyclesHerPhoneHolds().map((cycle) => cycleStripTestID(cycle.startedOn));

  return [
    { name: 'Text', builtUnder: [], ownedBy: 'the header, feature 15 step 1' },
    { name: 'TextLink', builtUnder: [], ownedBy: 'the way back in the header, feature 15 step 1' },
    {
      name: 'TextLink',
      builtUnder: [],
      ownedBy: 'the word Today in the header, feature 15 step 1',
    },
    { name: 'CycleStrip', builtUnder: strips },
    { name: 'CycleStrip', builtUnder: strips },
    { name: 'CycleStrip', builtUnder: strips },
    { name: 'Text', builtUnder: [homeCyclesLineTestID] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('index')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('log/index')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('history')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('settings/index')] },
  ];
}

function asPart(part: PartOfTheDrawing): Part {
  return { builtUnder: part.builtUnder, name: part.name };
}

describe('she reaches a past cycle from the screen she opens and comes back to it', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement belongs to step 2.4. Here it arrives already open, so what a case
    // reads off the screen is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the strips she reads, on a phone holding three recorded cycles and the one she is in', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('draws the cycle she is in first, then the three before it, most recent first', () => {
      const hers = theCyclesHerPhoneHolds();

      expect(theStripsSheReads()).toEqual(hers.map((cycle) => cycleStripTestID(cycle.startedOn)));
      expect(theStripsSheReads()).toHaveLength(stripsSheReads);
      expect(hers[0]?.lengthDays).toBeNull();
    });

    it('names the days each cycle covers, the way the Insights screen names them', () => {
      expect(whatItSays(cycleStripTestID('2026-05-07'))).toContain('From the 7th of May');
      expect(whatItSays(cycleStripTestID('2026-04-06'))).toContain(
        'The 6th of April to the 6th of May',
      );
    });

    it('gives each strip the length her phone holds for that cycle, and never one of its own', () => {
      for (const cycle of theCyclesHerPhoneHolds()) {
        const said = whatItSays(cycleStripLengthTestID(cycle.startedOn));

        expect(said).toBe(
          cycle.lengthDays === null
            ? theRunningCycleReads
            : `${String(cycle.lengthDays)} days, ${String(cycle.periodLengthDays)} of them bleeding`,
        );
      }

      expect(theCyclesHerPhoneHolds().map((cycle) => cycle.lengthDays)).toEqual([null, 31, 30, 24]);
    });

    it('says how much of each cycle she bled, which is what the cache holds for it', () => {
      for (const cycle of theCyclesHerPhoneHolds().filter((row) => row.lengthDays !== null)) {
        expect(whatItSays(cycleStripLengthTestID(cycle.startedOn))).toContain(
          `${String(cycle.periodLengthDays)} of them bleeding`,
        );
      }
    });

    it('draws the four phase fills on every strip, sized by the days of each phase', () => {
      for (const cycle of theCyclesHerPhoneHolds()) {
        expect(thePhasesOfTheStrip(cycle.startedOn)).toEqual([...phaseNames]);

        const days = phaseNames.map((phase) => theDaysOfTheFill(cycle.startedOn, phase));

        expect(days.every((count) => count > 0)).toBe(true);
        expect(days.reduce((total, count) => total + count, 0)).toBe(cycle.lengthDays ?? 30);
      }
    });

    it('puts no word on a fill, and none on the bar the fills sit in', () => {
      for (const cycle of theCyclesHerPhoneHolds()) {
        expect(textIn(screen.getByTestId(cycleStripBarTestID(cycle.startedOn)))).toEqual([]);

        for (const phase of phaseNames) {
          expect(textIn(screen.getByTestId(cycleStripFillTestID(cycle.startedOn, phase)))).toEqual(
            [],
          );
        }
      }
    });

    it('draws every word of the section small enough that a stranger reads none of it', () => {
      const drawn = theWordsOfTheSection();

      expect(
        drawn.filter((run) => run.points === undefined || run.points > theLargestAWordMayBeDrawn),
      ).toEqual([]);
      expect(drawn.length).toBeGreaterThan(stripsSheReads);
    });

    it('gives every strip a thumb to press it with', () => {
      const strips = theCyclesHerPhoneHolds().map((cycle) =>
        screen.getByTestId(cycleStripTestID(cycle.startedOn)),
      );

      expect(controlsTooSmallToPress(strips)).toEqual([]);
      expect(strips).toHaveLength(stripsSheReads);
    });

    it('says under the strips what they are and that one of them opens', () => {
      expect(whatItSays(homeCyclesLineTestID)).not.toBe('');
      expect(theKeysOfTheSection.length).toBeGreaterThan(0);

      for (const language of Object.keys(theCatalogueOf) as Language[]) {
        for (const key of theKeysOfTheSection) {
          expect(theCatalogueOf[language][key]).toBeDefined();
        }
      }
    });
  });

  describe('the screen she opens with nothing recorded', () => {
    it('draws no strip and no line, because a section Emi cannot fill is absent', async () => {
      await sheOpensEmiWithNothingRecorded();

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(homeCyclesTestID)).toBeNull();
      expect(screen.queryByTestId(homeCyclesLineTestID)).toBeNull();
    });
  });

  describe('the screen she opens, held against the drawing of her cycle history', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('is held to the parts the drawing places, in the drawing order, and to no other list', () => {
      expect(thePartsOfTheMockup('todayCycles').map((part) => part.name)).toEqual(
        theDrawingPlaces().map((part) => part.name),
      );
    });

    it('draws every part of the drawing this step builds, in the order the drawing places them', () => {
      const mine = theDrawingPlaces()
        .filter((part) => part.ownedBy === undefined)
        .map(asPart);

      expect(partsMissing(mine, theIdentifiersDrawn())).toEqual([]);
      expect(mine).toHaveLength(8);
    });

    it('answers for nothing else of the drawing yet, and names each part it leaves to another step', () => {
      const unbuilt = theDrawingPlaces().filter((part) => part.ownedBy !== undefined);

      expect(partsMissing(theDrawingPlaces().map(asPart), theIdentifiersDrawn())).toEqual(
        unbuilt.map(
          (part) =>
            `the drawing names ${part.name}, and nothing says which test identifier it is built under`,
        ),
      );
      expect(unbuilt.map((part) => part.ownedBy)).toEqual([
        'the header, feature 15 step 1',
        'the way back in the header, feature 15 step 1',
        'the word Today in the header, feature 15 step 1',
      ]);
    });
  });

  describe('the cycle she presses, read again on the Insights screen', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('lands on Insights with that cycle marked, and no other cycle marked', async () => {
      const past = theCyclesHerPhoneHolds()[1] as CycleRow;

      await shePresses(cycleStripTestID(past.startedOn));

      expect(screen.getByTestId(historyScreenTestID)).toBeTruthy();
      expect(theCycleMarkedOnInsights()).toEqual([past.startedOn]);
    });

    it('gives that cycle the same length and the same four arcs on both screens', async () => {
      const past = theCyclesHerPhoneHolds()[1] as CycleRow;
      const onTheStrip = whatItSays(cycleStripLengthTestID(past.startedOn));
      const onTheStripDays = phaseNames.map((phase) => theDaysOfTheFill(past.startedOn, phase));

      await shePresses(cycleStripTestID(past.startedOn));

      expect(whatItSays(historyCycleTestID(past.startedOn))).toContain(onTheStrip);
      expect(phaseNames.map((phase) => theDaysOfTheArc(past.startedOn, phase))).toEqual(
        onTheStripDays,
      );
    });

    it('draws the same arcs for the cycle she is in, which no cache row gives a length to', async () => {
      const running = theCyclesHerPhoneHolds()[0] as CycleRow;
      const onTheStripDays = phaseNames.map((phase) => theDaysOfTheFill(running.startedOn, phase));

      await shePresses(tabTestID('history'));

      expect(phaseNames.map((phase) => theDaysOfTheArc(running.startedOn, phase))).toEqual(
        onTheStripDays,
      );
      expect(running.lengthDays).toBeNull();
    });
  });
});
