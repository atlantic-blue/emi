import { join } from 'node:path';

import { findSymptom } from '@emi/cycle';
import { tabTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { listDayLogs } from '../../src/data/dayLogRepository';
import {
  homePatternsLineTestID,
  homePatternsPressTestID,
  homeScreenTestID,
} from '../../src/features/home/HomeScreen';
import {
  homePatternsTestID,
  patternCardEvidenceTestID,
  patternCardTestID,
  patternCardWhenTestID,
} from '../../src/features/home/PatternCard';
import { homeCopy, patternCardReads, patternWhenReads } from '../../src/features/home/copy';
import {
  historyBackTestID,
  historyPatternTestID,
  historyPatternsTestID,
  historyScreenTestID,
} from '../../src/features/history/HistoryScreen';
import { patternEvidenceSentence } from '../../src/features/history/copy';
import { wordKeys } from '../../src/language';
import { type Catalogue, type Language } from '../../src/language';
import { english } from '../../src/language/english';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { herVault } from '../fixtures/herVault';
import {
  daysOfHerRepeatingSymptoms,
  herCyclesStartOn,
  theCyclesEmiReads,
  theSymptomSheLoggedTwice,
  theSymptomsThatCameBack,
} from '../fixtures/herRepeatingSymptoms';
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

/** The length she gave at the first run, which no card reads. */
const sheSaidHerCycleRuns = 29;

/** Points. Contract SCREEN-2 keeps every word of this screen at this size or under. */
const theLargestAWordMayBeDrawn = 14;

/** What a symptom is called, which is the name a card writes and the name Insights writes. */
function theSymptomNamed(slug: string): string {
  const found = findSymptom(slug);

  if (found === undefined) {
    throw new Error(`${slug} is not a symptom Emi offers`);
  }

  return found.name;
}

/** Every key the section draws its words from, so a key added later is read by this file too. */
const theKeysOfTheSection = wordKeys.filter((key) => key.startsWith('home.patterns.'));

const theCatalogueOf: Readonly<Record<Language, Catalogue>> = {
  en: english,
  es: spanish,
  ru: russian,
};

async function sheOpensEmi(days = daysOfHerRepeatingSymptoms(today)): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, days, sheSaidHerCycleRuns);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/**
 * Every card on the glass, read off the section rather than asked for by name. Asking for the cards
 * this file expects would hide a card drawn for a symptom that came back twice.
 */
function theCardsSheReads(): string[] {
  return screen
    .getByTestId(homePatternsTestID)
    .children.map((card) =>
      String((card as unknown as { props: { testID: unknown } }).props.testID),
    );
}

/** Every symptom the Insights screen names, read off its list the same way. */
function theSymptomsInsightsNames(): string[] {
  return screen
    .getByTestId(historyPatternsTestID)
    .children.map((row) => String((row as unknown as { props: { testID: unknown } }).props.testID));
}

/** Every symptom the Insights screen marks as the one she arrived at. */
function theSymptomsMarkedOnInsights(): string[] {
  return theSymptomsInsightsNames().filter((identifier) => {
    const state = screen.getByTestId(identifier).props.accessibilityState as
      { selected?: boolean } | undefined;

    return state?.selected === true;
  });
}

/** Every word of the section with the size it is drawn at, which SCREEN-2 holds to 14 points. */
function theWordsOfTheSection(): { text: string; points: number | undefined }[] {
  return [
    ...sizedTextIn(screen.getByTestId(homePatternsTestID)),
    ...sizedTextIn(screen.getByTestId(homePatternsLineTestID)),
    ...sizedTextIn(screen.getByTestId(homePatternsPressTestID)),
  ];
}

/** How many of her own days carry one symptom, read out of her phone and never off a card. */
function theDaysSheLogged(slug: string): number {
  const vault = herVault();

  return listDayLogs(herDatabase())
    .map((row) => vault.open(row.payload))
    .filter((record) => (record.symptoms ?? []).includes(slug)).length;
}

/**
 * What each part of the drawing is built under on the screen she opens, in the drawing's order.
 *
 * A part with nothing under it is a part another step owns, named with the step that owns it. The
 * drawing is a whole page and this step builds a section of one, so the header and the two ways out
 * of it belong to feature 15.
 */
interface PartOfTheDrawing {
  readonly name: string;
  readonly builtUnder: readonly string[];
  /** Nothing at all where this step builds the part. */
  readonly ownedBy?: string;
}

function theDrawingPlaces(): PartOfTheDrawing[] {
  return [
    { name: 'Text', builtUnder: [], ownedBy: 'the header, feature 15 step 1' },
    { name: 'TextLink', builtUnder: [], ownedBy: 'the way back in the header, feature 15 step 1' },
    {
      name: 'TextLink',
      builtUnder: [],
      ownedBy: 'the word Today in the header, feature 15 step 1',
    },
    ...theSymptomsThatCameBack.map((symptom) => ({
      name: 'PatternCard',
      builtUnder: [patternCardTestID(symptom.slug)],
    })),
    { name: 'Text', builtUnder: [homePatternsLineTestID] },
    { name: 'TextLink', builtUnder: [homePatternsPressTestID] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('index')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('log/index')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('history')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('settings/index')] },
  ];
}

function asPart(part: PartOfTheDrawing): Part {
  return { builtUnder: part.builtUnder, name: part.name };
}

describe('she meets the symptom that comes back without going to look for it', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement belongs to step 2.4. Here it arrives already open, so what a case
    // reads off the screen is the section and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the cards she reads, on a phone whose days carry two symptoms that came back', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('draws one card for each symptom that came back, the most repeated first', () => {
      expect(theCardsSheReads()).toEqual(
        theSymptomsThatCameBack.map((symptom) => patternCardTestID(symptom.slug)),
      );
      expect(theCardsSheReads()).toHaveLength(2);
    });

    it('names the symptom and the point in her cycle it keeps coming back at', () => {
      for (const symptom of theSymptomsThatCameBack) {
        const said = whatItSays(patternCardWhenTestID(symptom.slug));

        expect(said).toContain(theSymptomNamed(symptom.slug));
        expect(said).toContain(String(symptom.day));
        expect(said).toBe(
          patternCardReads({
            anchor: symptom.anchor,
            day: symptom.day,
            name: theSymptomNamed(symptom.slug),
          }),
        );
      }
    });

    it('counts her cycles beside it, so the evidence sits on the card with the answer', () => {
      for (const symptom of theSymptomsThatCameBack) {
        const said = whatItSays(patternCardEvidenceTestID(symptom.slug));

        expect(said).toBe(patternEvidenceSentence(symptom.cyclesWithIt, theCyclesEmiReads));
        expect(said).toContain(String(symptom.cyclesWithIt));
        expect(said).toContain(String(theCyclesEmiReads));
      }
    });

    it('says a symptom she logged twice is no pattern, and names that symptom nowhere', () => {
      expect(theDaysSheLogged(theSymptomSheLoggedTwice)).toBe(2);
      expect(whatItSays(homePatternsLineTestID)).toBe(homeCopy.patterns.line);
      expect(screen.queryByTestId(patternCardTestID(theSymptomSheLoggedTwice))).toBeNull();
      expect(whatItSays(homePatternsTestID)).not.toContain(
        theSymptomNamed(theSymptomSheLoggedTwice),
      );
    });

    it('prints no number that is not a count of her own', () => {
      const hers = new Set([
        theCyclesEmiReads,
        ...theSymptomsThatCameBack.flatMap((symptom) => [symptom.day, symptom.cyclesWithIt]),
      ]);
      const printed = [
        ...[whatItSays(homePatternsTestID), whatItSays(homePatternsLineTestID)]
          .join(' ')
          .matchAll(/\d+/g),
      ].map((found) => Number(found[0]));

      expect(printed.length).toBeGreaterThan(0);
      expect(printed.filter((number) => !hers.has(number))).toEqual([]);
    });

    it('draws every word of the section small enough that a stranger reads none of it', () => {
      const drawn = theWordsOfTheSection();

      expect(
        drawn.filter((run) => run.points === undefined || run.points > theLargestAWordMayBeDrawn),
      ).toEqual([]);
      expect(drawn.length).toBeGreaterThan(4);
    });

    it('calls her normal, abnormal or irregular nowhere in it', () => {
      const said = theWordsOfTheSection()
        .map((run) => run.text.toLowerCase())
        .join(' ');

      for (const verdict of ['normal', 'abnormal', 'irregular']) {
        expect(said).not.toContain(verdict);
      }
    });

    it('gives every card and the link under them a thumb to press with', () => {
      const pressed = [
        ...theSymptomsThatCameBack.map((symptom) =>
          screen.getByTestId(patternCardTestID(symptom.slug)),
        ),
        screen.getByTestId(homePatternsPressTestID),
      ];

      expect(controlsTooSmallToPress(pressed)).toEqual([]);
    });

    it('writes every word of the section in all three languages', () => {
      expect(theKeysOfTheSection.length).toBeGreaterThan(0);

      for (const language of Object.keys(theCatalogueOf) as Language[]) {
        for (const key of theKeysOfTheSection) {
          expect(theCatalogueOf[language][key]).toBeDefined();
        }
      }
    });
  });

  describe('the screen she opens on a phone holding two complete cycles', () => {
    it('draws no card, no sentence and no link, because two cycles name nothing', async () => {
      const herLastTwoCyclesBegan = String(herCyclesStartOn(today)[4]);
      const hers = daysOfHerRepeatingSymptoms(today).filter(
        (record) => record.day >= herLastTwoCyclesBegan,
      );

      await sheOpensEmi(hers);

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(homePatternsTestID)).toBeNull();
      expect(screen.queryByTestId(homePatternsLineTestID)).toBeNull();
      expect(screen.queryByTestId(homePatternsPressTestID)).toBeNull();
    });
  });

  describe('the screen she opens, held against the drawing of what comes back', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('is held to the parts the drawing places, in the drawing order, and to no other list', () => {
      expect(thePartsOfTheMockup('todayPatterns').map((part) => part.name)).toEqual(
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

  describe('the whole pattern, which a press on a card opens', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('lands on Insights with that symptom marked, and marks no other symptom', async () => {
      const pressed = theSymptomsThatCameBack[0] as (typeof theSymptomsThatCameBack)[0];

      await shePresses(patternCardTestID(pressed.slug));

      expect(screen.getByTestId(historyScreenTestID)).toBeTruthy();
      expect(theSymptomsMarkedOnInsights()).toEqual([historyPatternTestID(pressed.slug)]);
      expect(theSymptomsInsightsNames()).toHaveLength(2);
    });

    it('gives the symptom the same point in her cycle and the same counts the card gave it', async () => {
      const pressed = theSymptomsThatCameBack[1] as (typeof theSymptomsThatCameBack)[1];

      await shePresses(patternCardTestID(pressed.slug));

      const said = whatItSays(historyPatternTestID(pressed.slug));

      expect(said).toContain(theSymptomNamed(pressed.slug));
      expect(said.toLowerCase()).toContain(
        patternWhenReads(pressed.anchor, pressed.day).toLowerCase(),
      );
      expect(said).toContain(patternEvidenceSentence(pressed.cyclesWithIt, theCyclesEmiReads));
    });

    it('marks no symptom at all where she pressed the link under the cards', async () => {
      await shePresses(homePatternsPressTestID);

      expect(screen.getByTestId(historyScreenTestID)).toBeTruthy();
      expect(theSymptomsMarkedOnInsights()).toEqual([]);
      expect(theSymptomsInsightsNames()).toHaveLength(2);
    });

    it('brings her back to the screen she opened, reading the same two cards', async () => {
      const pressed = theSymptomsThatCameBack[0] as (typeof theSymptomsThatCameBack)[0];
      const read = theCardsSheReads();

      await shePresses(patternCardTestID(pressed.slug));
      await shePresses(historyBackTestID);

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(theCardsSheReads()).toEqual(read);
    });
  });
});
