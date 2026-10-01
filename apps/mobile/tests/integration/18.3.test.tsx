import { join } from 'node:path';

import {
  CYCLE_LENGTH_HIGH_DAYS,
  CYCLE_LENGTH_LOW_DAYS,
  type PublishedFigure,
  type PublishedMeasurement,
  publishedFigures,
} from '@emi/cycle';
import { tabTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import {
  citationFigureTestID,
  citationIdentifierTestID,
  citationPaperTestID,
  citationRowTestID,
  citationRowsTestID,
  figuresBackTestID,
  figuresHeaderTestID,
  figuresLeaveTestID,
  figuresPrintedTestID,
  figuresQuotedTestID,
  figuresScreenTestID,
  figuresTitleTestID,
} from '../../src/features/cycle/CitationRow';
import {
  homeFiguresLineTestID,
  homeFiguresPressTestID,
  homeScreenTestID,
} from '../../src/features/home/HomeScreen';
import { herNumberTestID, homeNumbersTestID } from '../../src/features/home/MeasuredRow';
import { type Catalogue, type Language, languages, wordKeys } from '../../src/language';
import { english } from '../../src/language/english';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herPhoneHolds } from '../fixtures/herPhone';
import { daysOfHerThreeCycles } from '../fixtures/herThreeCycles';
import { sizedTextIn, textIn } from '../fixtures/renderedText';
import {
  partsMissing,
  thePartsOfTheMockup,
  theIdentifiersDrawn,
} from '../fixtures/theMockupScreen';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** The address the drawing of this page gives it. */
const theAddressOfThePage = '/cycles/figures';

/** The words of the page, written out here rather than read off the catalogue. */
const theTitleOfThePage = 'Where these figures come from';
const theQuotedLine =
  'Each figure is quoted in the words the paper reports it in, so you can check it rather than trust it.';
const thePrintedLine = 'A paper is named here as its journal prints it.';
const thePressUnderTheLine = 'Where these figures come from';

/** What the drawing writes under the cycle length, which step 1 of this feature replaced. */
const theWordsTheDrawingCarries = 'The code cites none';

/** The three measurements, in the order the published figures are held in. */
const theThreeMeasurements: readonly PublishedMeasurement[] = [
  'cycle-length',
  'period-duration',
  'cycle-length-variation',
];

/** Points. Contract SCREEN-2 keeps the word period at this size or under, one press off as well. */
const theLargestAWordMayBeDrawn = 14;

/** The words a stranger at arm's length may not be able to read, which the cap above is for. */
const theWordsAStrangerCouldRead: readonly string[] = [
  'period',
  'bleeding',
  'fertile',
  'ovulation',
];

/**
 * The parts the drawing of this page places, in its order, and what each one is built under.
 *
 * Every part is this step's to build, because this step builds the whole page. So the comparison
 * carries no part left to somebody else, and a part the record cannot join to an identifier fails.
 */
const theDrawingPlaces: readonly { name: string; builtUnder: readonly string[] }[] = [
  { name: 'Text', builtUnder: [figuresHeaderTestID] },
  { name: 'TextLink', builtUnder: [figuresBackTestID] },
  { name: 'TextLink', builtUnder: [figuresLeaveTestID] },
  { name: 'CitationRow', builtUnder: [citationRowsTestID] },
  { name: 'Text', builtUnder: [figuresQuotedTestID] },
  { name: 'Text', builtUnder: [figuresPrintedTestID] },
];

/**
 * The one list of published figures, changed for the length of one case and put back after it.
 *
 * The page is meant to draw whatever the arithmetic package holds. The only way to prove that is
 * to change the package and read the page again, so nothing here is mocked: the route, the section
 * on the screen she opens and this list are the ones the application ships. A page that had typed
 * a figure of its own would keep drawing the old one, and the case below would name it.
 */
const theListThePackageHolds = publishedFigures as PublishedFigure[];
const asThePackageHoldsThem: readonly PublishedFigure[] = [...theListThePackageHolds];

function thePackageHolds(figures: readonly PublishedFigure[]): void {
  theListThePackageHolds.splice(0, theListThePackageHolds.length, ...figures);
}

/** The same cycle length figure, reported by another paper with another range and another number. */
const anotherPaperReportsTheCycleLength: PublishedFigure = {
  measures: 'cycle-length',
  value: { kind: 'range', low: 20, high: 41 },
  unit: 'days',
  citation: {
    source: 'A later cohort, reported somewhere else',
    doi: '10.0000/another.paper',
    figure: 'menstrual cycle frequency, reported as 20 to 41 days',
  },
};

const theCatalogueOf: Readonly<Record<Language, Catalogue>> = {
  en: english,
  es: spanish,
  ru: russian,
};

/** Every key this page draws its words from, so a key added later is read by this file too. */
const theKeysOfThePage = wordKeys.filter((key) => key.startsWith('cycle.figures.'));

async function herPhoneIsSeeded(): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, daysOfHerThreeCycles(today), 29);
}

/** The address she is on, which is what says a push or a replace actually happened. */
let whereSheIs: () => string = () => {
  throw new Error('nothing was rendered, so there is no address to read');
};

async function sheOpens(at: string): Promise<void> {
  await herPhoneIsSeeded();

  const app = renderRouter(appDirectory, { initialUrl: at });

  await app;
  whereSheIs = () => app.getPathname();
}

async function sheOpensThePageAtItsAddress(): Promise<void> {
  await sheOpens(theAddressOfThePage);
}

async function sheOpensEmi(): Promise<void> {
  await sheOpens('/');
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/** Every row of the page, in the order the page draws them. */
function theRowsSheReads(): string[] {
  return theIdentifiersDrawn().filter((identifier) =>
    theThreeMeasurements.some((measures) => identifier === citationRowTestID(measures)),
  );
}

describe('she reaches the page that says where each published figure comes from', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement belongs to step 2.4. Here the screen she starts on arrives already
    // open, so what a case reads is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    thePackageHolds(asThePackageHoldsThem);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the page she reads', () => {
    beforeEach(async () => {
      await sheOpensThePageAtItsAddress();
    });

    it('says what it is for at the top', () => {
      expect(whatItSays(figuresTitleTestID)).toBe(theTitleOfThePage);
    });

    it('draws one row for each published figure, in the order the package holds them', () => {
      expect(theRowsSheReads()).toEqual(theThreeMeasurements.map(citationRowTestID));
      expect(publishedFigures.map((figure) => figure.measures)).toEqual(theThreeMeasurements);
    });

    it('names the measurement each row is about, and never a word about her', () => {
      expect(whatItSays(citationRowTestID('cycle-length'))).toContain('Cycle length');
      expect(whatItSays(citationRowTestID('period-duration'))).toContain('Period length');
      expect(whatItSays(citationRowTestID('cycle-length-variation'))).toContain(
        'Cycle length variation',
      );
    });

    it('quotes each figure in the shape its own paper reports it in', () => {
      expect(whatItSays(citationFigureTestID('cycle-length'))).toBe('24 to 38 days');
      expect(whatItSays(citationFigureTestID('period-duration'))).toBe('up to 8 days');
      expect(whatItSays(citationFigureTestID('cycle-length-variation'))).toBe('2.6 days');
      expect([CYCLE_LENGTH_LOW_DAYS, CYCLE_LENGTH_HIGH_DAYS]).toEqual([24, 38]);
    });

    it('names the paper each figure comes from, word for word as the package holds it', () => {
      for (const figure of publishedFigures) {
        expect(whatItSays(citationPaperTestID(figure.measures))).toBe(figure.citation.source);
        expect(figure.citation.source.length).toBeGreaterThan(0);
      }
    });

    it('names the identifier of that paper, so she can go and read it', () => {
      for (const figure of publishedFigures) {
        expect(whatItSays(citationIdentifierTestID(figure.measures))).toContain(
          figure.citation.doi,
        );
      }

      expect(whatItSays(citationIdentifierTestID('cycle-length'))).toContain('10.1002/ijgo.12666');
    });

    it('gives the cycle length the citation the arithmetic carries, not the words the drawing carries', () => {
      expect(whatItSays(citationPaperTestID('cycle-length'))).toContain(
        'International Federation of Gynecology and Obstetrics',
      );
      expect(whatItSays(figuresScreenTestID)).not.toContain(theWordsTheDrawingCarries);
    });

    it('says under the rows that every figure is quoted in the words the paper reports it in', () => {
      expect(whatItSays(figuresQuotedTestID)).toBe(theQuotedLine);
      expect(whatItSays(figuresPrintedTestID)).toBe(thePrintedLine);
    });

    it('answers on the address the drawing gives it', () => {
      expect(whereSheIs()).toBe(theAddressOfThePage);
    });

    it('draws no dock, because the drawing of this page places none', () => {
      expect(screen.queryByTestId(tabTestID('index'))).toBeNull();
      expect(screen.queryByTestId(tabTestID('history'))).toBeNull();
    });

    it('draws every word a stranger could read small enough that they read none of it', () => {
      const drawn = sizedTextIn(screen.getByTestId(figuresScreenTestID));
      const said = drawn.filter((run) =>
        theWordsAStrangerCouldRead.some((word) => run.text.toLowerCase().includes(word)),
      );

      expect(
        said.filter((run) => run.points === undefined || run.points > theLargestAWordMayBeDrawn),
      ).toEqual([]);
      expect(said.length).toBeGreaterThan(0);
    });
  });

  describe('the page held against the drawing of it', () => {
    beforeEach(async () => {
      await sheOpensThePageAtItsAddress();
    });

    it('is held to the parts the drawing places, in the drawing order, and to no other list', () => {
      expect(thePartsOfTheMockup('citation').map((part) => part.name)).toEqual(
        theDrawingPlaces.map((part) => part.name),
      );
    });

    it('draws every part of the drawing, in the order the drawing places them', () => {
      expect(partsMissing(theDrawingPlaces, theIdentifiersDrawn())).toEqual([]);
      expect(theDrawingPlaces).toHaveLength(6);
    });
  });

  describe('a figure that changes in the arithmetic package', () => {
    it('changes the page, because the page reads the package rather than repeating it', async () => {
      thePackageHolds([anotherPaperReportsTheCycleLength, ...asThePackageHoldsThem.slice(1)]);

      await sheOpensThePageAtItsAddress();

      expect(whatItSays(citationFigureTestID('cycle-length'))).toBe('20 to 41 days');
      expect(whatItSays(citationPaperTestID('cycle-length'))).toBe(
        anotherPaperReportsTheCycleLength.citation.source,
      );
      expect(whatItSays(citationIdentifierTestID('cycle-length'))).toContain(
        '10.0000/another.paper',
      );
      expect(whatItSays(figuresScreenTestID)).not.toContain('24 to 38 days');
    });

    it('is put back afterwards, so the package the next case reads is the one it ships', () => {
      expect(publishedFigures).toEqual(asThePackageHoldsThem);
    });
  });

  describe('the walk from the screen she opens', () => {
    it('reaches the page from the line under her three numbers, and comes back to her numbers', async () => {
      await sheOpensEmi();

      expect(whatItSays(homeFiguresPressTestID)).toBe(thePressUnderTheLine);
      const herCycleLength = whatItSays(herNumberTestID('cycle-length'));

      await shePresses(homeFiguresPressTestID);

      expect(whereSheIs()).toBe(theAddressOfThePage);
      expect(screen.getByTestId(figuresScreenTestID)).toBeTruthy();

      await shePresses(figuresBackTestID);

      expect(whereSheIs()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(whatItSays(herNumberTestID('cycle-length'))).toBe(herCycleLength);
      expect(whatItSays(homeFiguresLineTestID)).not.toBe('');
    });

    it('comes back by the word at the other end of the header too', async () => {
      await sheOpensEmi();
      await shePresses(homeFiguresPressTestID);
      await shePresses(figuresLeaveTestID);

      expect(whereSheIs()).toBe('/');
      expect(screen.getByTestId(homeNumbersTestID)).toBeTruthy();
    });

    it('lands on the screen she opens when the page was the first thing on the glass', async () => {
      await sheOpensThePageAtItsAddress();

      await shePresses(figuresBackTestID);

      expect(whereSheIs()).toBe('/');
      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
    });
  });

  describe('the words the page is written from', () => {
    it('are held in all three languages, so nothing on it falls back to English', () => {
      expect(theKeysOfThePage.length).toBeGreaterThan(5);

      for (const language of languages.filter((spoken) => spoken !== 'en')) {
        for (const key of theKeysOfThePage) {
          expect(theCatalogueOf[language][key]).not.toBe(english[key]);
          expect(theCatalogueOf[language][key]).toBeDefined();
        }
      }

      expect(languages).toHaveLength(3);
    });
  });
});
