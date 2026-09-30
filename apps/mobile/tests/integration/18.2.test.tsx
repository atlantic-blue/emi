import { join } from 'node:path';

import {
  POPULATION_SPREAD_DAYS,
  type PublishedMeasurement,
  publishedFigures,
  toOneDecimalPlace,
} from '@emi/cycle';
import { tabTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { type CycleRow, listCycles } from '../../src/data/cycleRepository';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { historyCycleTestID } from '../../src/features/history/HistoryScreen';
import {
  herNumberTestID,
  homeNumbersTestID,
  measuredRowTestID,
  publishedNumberTestID,
} from '../../src/features/home/MeasuredRow';
import { homeFiguresLineTestID, homeScreenTestID } from '../../src/features/home/HomeScreen';
import { wordKeys } from '../../src/language';
import { english } from '../../src/language/english';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import { type Catalogue, type Language, languages } from '../../src/language';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import {
  herCycleLengths,
  herCyclesVaryBy,
  herLastCycleRuns,
  herLastPeriodRuns,
  daysOfHerThreeCycles,
} from '../fixtures/herThreeCycles';
import { sizedTextIn, textIn } from '../fixtures/renderedText';
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

/** The length she gave at the first run, which no row of this section reads. */
const sheSaidHerCycleRuns = 29;

/** What each row says, in the words of the catalogue, written out rather than read off it. */
const herCycleLengthReads = '31 days';
const herPeriodLengthReads = '5 days';
const herVariationReads = '3.8 days';

const theCycleLengthPublished = '24 to 38 days';
const thePeriodDurationPublished = 'up to 8 days';
const theVariationPublished = '2.6 days';

/** What the drawing writes beside the cycle length, which the approved design replaced. */
const theWordsTheDrawingCarries = 'not cited yet';

const theLineUnderTheRows =
  'The published figure is the one the paper reports, and the paper is one press away.';

/** The three measurements, in the order the published figures are held in. */
const theThreeMeasurements: readonly PublishedMeasurement[] = [
  'cycle-length',
  'period-duration',
  'cycle-length-variation',
];

/**
 * The words no row may carry, in the three languages Emi is written in. Emi prints her own number
 * and the published figure. A tracker that prints one of these over a number has turned arithmetic
 * into a verdict about her body, which is the whole reason this section exists.
 *
 * Russian entries are stems, because a Russian adjective changes its ending with its case and a
 * search for one ending would miss the other five.
 */
const theWordsSheIsNotTold: Readonly<Record<Language, readonly string[]>> = {
  en: ['normal', 'abnormal', 'irregular'],
  es: ['normal', 'anormal', 'irregular'],
  ru: ['нормальн', 'ненормальн', 'нерегулярн', 'нерегуляр'],
};

const theCatalogueOf: Readonly<Record<Language, Catalogue>> = {
  en: english,
  es: spanish,
  ru: russian,
};

/** Every key the section draws its words from, so a key added later is read by this file too. */
const theKeysOfTheSection = wordKeys.filter((key) => key.startsWith('home.numbers.'));

/** Points. Contract SCREEN-2 keeps the word period on this screen at this size or under. */
const theLargestAWordMayBeDrawn = 14;

/**
 * What each part of the drawing is built under on the screen she opens, in the drawing's order.
 *
 * A part with nothing under it is a part another step owns, named with the step that owns it. The
 * drawing is a whole page and this step builds a section of one, so the header and the way back
 * belong to feature 15 and the press belongs to step 18.3. The list shortens as those steps land.
 */
interface PartOfTheDrawing {
  readonly name: string;
  readonly builtUnder: readonly string[];
  /** Nothing at all where this step builds the part. */
  readonly ownedBy?: string;
}

const theDrawingPlaces: readonly PartOfTheDrawing[] = [
  { name: 'Text', builtUnder: [], ownedBy: 'the header, feature 15 step 1' },
  { name: 'TextLink', builtUnder: [], ownedBy: 'the way back in the header, feature 15 step 1' },
  { name: 'TextLink', builtUnder: [], ownedBy: 'the word Today in the header, feature 15 step 1' },
  { name: 'MeasuredRow', builtUnder: [homeNumbersTestID] },
  { name: 'Text', builtUnder: [homeFiguresLineTestID] },
  { name: 'TextLink', builtUnder: [], ownedBy: 'the press to the figures page, step 18.3' },
  { name: 'BottomNavigation', builtUnder: [tabTestID('index')] },
  { name: 'BottomNavigation', builtUnder: [tabTestID('log/index')] },
  { name: 'BottomNavigation', builtUnder: [tabTestID('history')] },
  { name: 'BottomNavigation', builtUnder: [tabTestID('settings/index')] },
];

function asPart(part: PartOfTheDrawing): Part {
  return { builtUnder: part.builtUnder, name: part.name };
}

const thePartsThisStepAnswersFor = theDrawingPlaces
  .filter((part) => part.ownedBy === undefined)
  .map(asPart);

/** The most recent cycle the cache closed, which is the one her two lengths are read from. */
function herLastCompleteCycle(): CycleRow {
  const complete = listCycles(herDatabase()).filter((cycle) => cycle.lengthDays !== null);
  const last = complete[complete.length - 1];

  if (last === undefined) {
    throw new Error('her own days were written and no complete cycle was read back');
  }

  return last;
}

async function sheOpensEmi(lengths: readonly number[] = herCycleLengths): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, daysOfHerThreeCycles(today, lengths), sheSaidHerCycleRuns);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

function herNumberFor(measures: PublishedMeasurement): string {
  return whatItSays(herNumberTestID(measures));
}

function thePublishedFigureFor(measures: PublishedMeasurement): string {
  return whatItSays(publishedNumberTestID(measures));
}

/** Every row of the section, in the order the screen draws them. */
function theRowsSheReads(): string[] {
  return theIdentifiersDrawn().filter((identifier) =>
    theThreeMeasurements.some((measures) => identifier === measuredRowTestID(measures)),
  );
}

/** Every word of the section with the size it is drawn at, which SCREEN-2 holds to 14 points. */
function theWordsOfTheSection(): { text: string; points: number | undefined }[] {
  return sizedTextIn(screen.getByTestId(homeNumbersTestID));
}

describe('she reads her three cycle numbers beside the published figures', () => {
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

  describe('the section she reads, on a phone holding three recorded cycles', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('draws one row for each of the three measurements, in the order the figures are held', () => {
      expect(theRowsSheReads()).toEqual(theThreeMeasurements.map(measuredRowTestID));
      expect(publishedFigures.map((figure) => figure.measures)).toEqual(theThreeMeasurements);
    });

    it('names each row by the measurement it carries, and never by a word about her', () => {
      expect(whatItSays(measuredRowTestID('cycle-length'))).toContain('Last cycle');
      expect(whatItSays(measuredRowTestID('period-duration'))).toContain('Last period');
      expect(whatItSays(measuredRowTestID('cycle-length-variation'))).toContain('Variation');
    });

    it('reads hers and published over the two columns, so she knows which number is whose', () => {
      expect(whatItSays(homeNumbersTestID)).toContain('Yours');
      expect(whatItSays(homeNumbersTestID)).toContain('Published');
    });

    it('puts her own last cycle length in the cycle row, read from the cycle cache', () => {
      expect(herNumberFor('cycle-length')).toBe(herCycleLengthReads);
      expect(herLastCompleteCycle().lengthDays).toBe(herLastCycleRuns);
    });

    it('puts her own last period length in the period row, read from the cycle cache', () => {
      expect(herNumberFor('period-duration')).toBe(herPeriodLengthReads);
      expect(herLastCompleteCycle().periodLengthDays).toBe(herLastPeriodRuns);
    });

    it('writes her cycle length variation to one decimal place', () => {
      expect(herNumberFor('cycle-length-variation')).toBe(herVariationReads);
    });

    it('keeps her cycle length and her variation each in its own row', () => {
      expect(herNumberFor('cycle-length')).toBe(herCycleLengthReads);
      expect(herNumberFor('cycle-length-variation')).toBe(herVariationReads);
      expect(herCycleLengthReads).not.toBe(herVariationReads);
    });

    it('puts 24 to 38 days beside her cycle length, and not the words the drawing carries', () => {
      expect(thePublishedFigureFor('cycle-length')).toBe(theCycleLengthPublished);
      expect(whatItSays(homeNumbersTestID)).not.toContain(theWordsTheDrawingCarries);
    });

    it('puts up to 8 days beside her period length', () => {
      expect(thePublishedFigureFor('period-duration')).toBe(thePeriodDurationPublished);
    });

    it('puts 2.6 days beside her variation, which is the figure the paper reports', () => {
      expect(thePublishedFigureFor('cycle-length-variation')).toBe(theVariationPublished);
      expect(POPULATION_SPREAD_DAYS).toBe(2.6);
    });

    it('carries the line that says the paper is one press away', () => {
      expect(whatItSays(homeFiguresLineTestID)).toBe(theLineUnderTheRows);
    });

    it('draws every word of the section small enough that a stranger reads none of it', () => {
      const drawn = theWordsOfTheSection();

      expect(
        drawn.filter((run) => run.points === undefined || run.points > theLargestAWordMayBeDrawn),
      ).toEqual([]);
      expect(drawn.length).toBeGreaterThan(theThreeMeasurements.length);
    });
  });

  describe('the screen she opens, held against the drawing of her three numbers', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('is held to the parts the drawing places, in the drawing order, and to no other list', () => {
      expect(thePartsOfTheMockup('todayNumbers').map((part) => part.name)).toEqual(
        theDrawingPlaces.map((part) => part.name),
      );
    });

    it('draws every part of the drawing this step builds, in the order the drawing places them', () => {
      expect(partsMissing(thePartsThisStepAnswersFor, theIdentifiersDrawn())).toEqual([]);
      expect(thePartsThisStepAnswersFor).toHaveLength(6);
    });

    it('answers for nothing else of the drawing yet, and names each part it leaves to another step', () => {
      const unbuilt = theDrawingPlaces.filter((part) => part.ownedBy !== undefined);

      expect(partsMissing(theDrawingPlaces.map(asPart), theIdentifiersDrawn())).toEqual(
        unbuilt.map(
          (part) =>
            `the drawing names ${part.name}, and nothing says which test identifier it is built under`,
        ),
      );
      expect(unbuilt.map((part) => part.ownedBy)).toEqual([
        'the header, feature 15 step 1',
        'the way back in the header, feature 15 step 1',
        'the word Today in the header, feature 15 step 1',
        'the press to the figures page, step 18.3',
      ]);
    });
  });

  describe('her numbers beside the same numbers on the Insights screen', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('names one cycle length, rendered on both screens out of one database', async () => {
      const cycle = herLastCompleteCycle();
      const onTheSection = herNumberFor('cycle-length');

      await shePresses(tabTestID('history'));

      expect(onTheSection).toContain(String(cycle.lengthDays));
      expect(whatItSays(historyCycleTestID(cycle.startedOn))).toContain(String(cycle.lengthDays));
    });

    it('names one period length, rendered on both screens out of one database', async () => {
      const cycle = herLastCompleteCycle();
      const onTheSection = herNumberFor('period-duration');

      await shePresses(tabTestID('history'));

      expect(onTheSection).toContain(String(cycle.periodLengthDays));
      expect(whatItSays(historyCycleTestID(cycle.startedOn))).toContain(
        String(cycle.periodLengthDays),
      );
      expect(cycle.periodLengthDays).not.toBe(cycle.lengthDays);
    });

    it('draws the variation the forecast produces from the same cycle rows', () => {
      const forecast = forecastOf(listCycles(herDatabase()));

      if (forecast.kind !== 'forecast') {
        throw new Error('three complete cycles left no forecast to read a spread from');
      }

      expect(toOneDecimalPlace(forecast.spreadDays)).toBe(herCyclesVaryBy);
      expect(herNumberFor('cycle-length-variation')).toContain(String(herCyclesVaryBy));
    });
  });

  describe('the words she is not told', () => {
    it('are drawn nowhere in the section she reads', async () => {
      await sheOpensEmi();

      const said = whatItSays(homeNumbersTestID).toLowerCase();

      for (const word of theWordsSheIsNotTold.en) {
        expect(said).not.toContain(word);
      }
    });

    it('are in none of the words the section is written from, in any of the three languages', () => {
      for (const language of languages) {
        for (const key of theKeysOfTheSection) {
          const held = JSON.stringify(theCatalogueOf[language][key]).toLowerCase();

          for (const word of theWordsSheIsNotTold[language]) {
            expect([key, held]).not.toContain(word);
            expect(held).not.toContain(word);
          }
        }
      }

      expect(theKeysOfTheSection.length).toBeGreaterThan(5);
      expect(languages).toHaveLength(3);
    });
  });

  describe('the phone that has not measured three numbers yet', () => {
    it('draws no section at all, because Emi holds no sample data to fill one with', async () => {
      await sheOpensEmi([28]);

      // The screen she opens is on the glass and it is the learning state, so the absence below
      // is the section standing down and never a screen that failed to arrive.
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(forecastOf(listCycles(herDatabase())).kind).toBe('learning');
      expect(screen.queryByTestId(homeNumbersTestID)).toBeNull();
      expect(screen.queryByTestId(homeFiguresLineTestID)).toBeNull();
    });
  });
});
