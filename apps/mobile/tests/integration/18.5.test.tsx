import { join } from 'node:path';

import { CYCLE_LENGTH_HIGH_DAYS, CYCLE_LENGTH_LOW_DAYS } from '@emi/cycle';
import { tabTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { type CycleRow, listCycles } from '../../src/data/cycleRepository';
import {
  PLOT_HEIGHT,
  homeTrendTestID,
  trendAxisTestID,
  trendBandTestID,
  trendCaptionTestID,
  trendJoinTestID,
  trendPlotTestID,
  trendPointTestID,
} from '../../src/features/home/CycleTrend';
import {
  homeScreenTestID,
  homeTrendCountTestID,
  homeTrendPressTestID,
} from '../../src/features/home/HomeScreen';
import { cyclesSheReadsAsATrend } from '../../src/features/home/herTrend';
import { cyclesOutsideReads } from '../../src/features/home/copy';
import { historyCycleTestID, historyScreenTestID } from '../../src/features/history/HistoryScreen';
import { wordKeys } from '../../src/language';
import { type Catalogue, type Language } from '../../src/language';
import { english } from '../../src/language/english';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import {
  daysOfHerSixCycles,
  herCycleLengths,
  herCyclesOutsideTheBand,
} from '../fixtures/herSixCycles';
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

/** The length she gave at the first run, which no point of this chart reads. */
const sheSaidHerCycleRuns = 29;

/** Points. Contract SCREEN-2 keeps every word of this screen at this size or under. */
const theLargestAWordMayBeDrawn = 14;

/**
 * A coordinate is drawn to two decimal places, so a length read back off the drawing lands near
 * the length rather than on it. The first is decimal places of a day, which is what toBeCloseTo
 * counts. The second is plot units, and it is what makes a point on the edge of the band read as
 * on the edge rather than as outside it.
 */
const theDaysAgreeToOneDecimalPlace = 1;
const theEdgeOfTheBandInPlotUnits = 0.05;

/** Every key the section draws its words from, so a key added later is read by this file too. */
const theKeysOfTheSection = wordKeys.filter((key) => key.startsWith('home.trend.'));

const theCatalogueOf: Readonly<Record<Language, Catalogue>> = {
  en: english,
  es: spanish,
  ru: russian,
};

async function sheOpensEmi(lengths: readonly number[] = herCycleLengths): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, daysOfHerSixCycles(today, lengths), sheSaidHerCycleRuns);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

/** Her complete cycles as her phone holds them, oldest first, which is the order of the points. */
function theCompleteCyclesHerPhoneHolds(): CycleRow[] {
  return [...listCycles(herDatabase())]
    .filter((cycle) => !cycle.isPredicted && cycle.lengthDays !== null)
    .sort((one, other) => one.startedOn.localeCompare(other.startedOn))
    .slice(-cyclesSheReadsAsATrend);
}

/** The cycle she is in, which no cache row gives a length to and no point stands for. */
function theCycleSheIsIn(): CycleRow {
  const running = [...listCycles(herDatabase())].filter(
    (cycle) => !cycle.isPredicted && cycle.lengthDays === null,
  );

  return running[running.length - 1] as CycleRow;
}

/** Every point on the chart, in the order the chart drew them. */
function thePointsSheReads(): string[] {
  const drawn = new Set(theIdentifiersDrawn());

  return theCompleteCyclesHerPhoneHolds()
    .map((cycle) => trendPointTestID(cycle.startedOn))
    .filter((identifier) => drawn.has(identifier));
}

interface Band {
  readonly top: number;
  readonly bottom: number;
}

/** The band behind the points, read off the drawing. */
function theBandBehindThePoints(): Band {
  const band = screen.getByTestId(trendBandTestID).props as { y: number; height: number };

  return { bottom: band.y + band.height, top: band.y };
}

/** Where one point sits down the plot, read off the drawing. */
function theHeightOfThePoint(startedOn: string): number {
  return (screen.getByTestId(trendPointTestID(startedOn)).props as { cy: number }).cy;
}

/** The days one end of the axis stands for, read off the words beside the drawing. */
function theDaysTheAxisNames(end: 'low' | 'high'): number {
  return Number(whatItSays(trendAxisTestID(end)));
}

/**
 * The days a height down the plot stands for, worked out from the two numbers printed beside the
 * axis and the height of the plot, and from nothing the chart holds. A reader with a ruler and the
 * two labels gets this number, which is the whole point of printing them.
 */
function theDaysAtTheHeight(height: number): number {
  const low = theDaysTheAxisNames('low');
  const high = theDaysTheAxisNames('high');

  return high - (height * (high - low)) / PLOT_HEIGHT;
}

/** The cycles a reader counts as drawn outside the band, by looking at the points and the band. */
function thePointsDrawnOutsideTheBand(): number[] {
  const band = theBandBehindThePoints();

  return theCompleteCyclesHerPhoneHolds()
    .map((cycle) => theHeightOfThePoint(cycle.startedOn))
    .filter(
      (height) =>
        height < band.top - theEdgeOfTheBandInPlotUnits ||
        height > band.bottom + theEdgeOfTheBandInPlotUnits,
    );
}

/** Every word of the section with the size it is drawn at, which SCREEN-2 holds to 14 points. */
function theWordsOfTheSection(): { text: string; points: number | undefined }[] {
  return [
    ...sizedTextIn(screen.getByTestId(homeTrendTestID)),
    ...sizedTextIn(screen.getByTestId(homeTrendCountTestID)),
    ...sizedTextIn(screen.getByTestId(homeTrendPressTestID)),
  ];
}

/** Every cycle the Insights screen lists, which is where the link under the chart goes. */
function theCyclesInsightsLists(): string[] {
  const drawn = new Set(theIdentifiersDrawn());

  return [...listCycles(herDatabase())]
    .filter((cycle) => drawn.has(historyCycleTestID(cycle.startedOn)))
    .map((cycle) => cycle.startedOn);
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
    { name: 'CycleTrend', builtUnder: [homeTrendTestID] },
    { name: 'Text', builtUnder: [homeTrendCountTestID] },
    { name: 'TextLink', builtUnder: [homeTrendPressTestID] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('index')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('log/index')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('history')] },
    { name: 'BottomNavigation', builtUnder: [tabTestID('settings/index')] },
  ];
}

function asPart(part: PartOfTheDrawing): Part {
  return { builtUnder: part.builtUnder, name: part.name };
}

describe('she reads the shape of her last six cycles against the published range', () => {
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

  describe('the chart she reads, on a phone holding six complete cycles and the one she is in', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('draws one point for each of her six complete cycles, oldest first', () => {
      const hers = theCompleteCyclesHerPhoneHolds();

      expect(thePointsSheReads()).toEqual(hers.map((cycle) => trendPointTestID(cycle.startedOn)));
      expect(thePointsSheReads()).toHaveLength(6);
      expect(hers.map((cycle) => cycle.lengthDays)).toEqual([...herCycleLengths]);
    });

    it('draws no point for the cycle she is in, because her phone holds no length for it', () => {
      const running = theCycleSheIsIn();

      expect(running.lengthDays).toBeNull();
      expect(screen.queryByTestId(trendPointTestID(running.startedOn))).toBeNull();
    });

    it('puts each point where that cycle length falls against the two numbers on the axis', () => {
      for (const cycle of theCompleteCyclesHerPhoneHolds()) {
        expect(theDaysAtTheHeight(theHeightOfThePoint(cycle.startedOn))).toBeCloseTo(
          cycle.lengthDays as number,
          theDaysAgreeToOneDecimalPlace,
        );
      }
    });

    it('shades the published range of 24 to 38 days behind the points', () => {
      const band = theBandBehindThePoints();

      expect(theDaysAtTheHeight(band.top)).toBeCloseTo(
        CYCLE_LENGTH_HIGH_DAYS,
        theDaysAgreeToOneDecimalPlace,
      );
      expect(theDaysAtTheHeight(band.bottom)).toBeCloseTo(
        CYCLE_LENGTH_LOW_DAYS,
        theDaysAgreeToOneDecimalPlace,
      );
      expect([CYCLE_LENGTH_LOW_DAYS, CYCLE_LENGTH_HIGH_DAYS]).toEqual([24, 38]);
    });

    it('keeps both edges of the band on the drawing, so a point outside it is drawn outside it', () => {
      const band = theBandBehindThePoints();

      expect(band.top).toBeGreaterThanOrEqual(0);
      expect(band.bottom).toBeLessThanOrEqual(PLOT_HEIGHT);
      expect(theDaysTheAxisNames('low')).toBeLessThanOrEqual(CYCLE_LENGTH_LOW_DAYS);
      expect(theDaysTheAxisNames('high')).toBeGreaterThanOrEqual(CYCLE_LENGTH_HIGH_DAYS);
    });

    it('draws a cycle longer than the range above the band, and a shorter one below it', () => {
      const band = theBandBehindThePoints();
      const hers = theCompleteCyclesHerPhoneHolds();
      const longest = hers.find((cycle) => cycle.lengthDays === Math.max(...herCycleLengths));
      const shortest = hers.find((cycle) => cycle.lengthDays === Math.min(...herCycleLengths));

      expect(theHeightOfThePoint(String(longest?.startedOn))).toBeLessThan(band.top);
      expect(theHeightOfThePoint(String(shortest?.startedOn))).toBeGreaterThan(band.bottom);
    });

    it('joins the points in the order it drew them, oldest first', () => {
      const joined = String((screen.getByTestId(trendJoinTestID).props as { d: string }).d);
      const heights = theCompleteCyclesHerPhoneHolds().map((cycle) =>
        theHeightOfThePoint(cycle.startedOn),
      );

      for (const height of heights) {
        expect(joined).toContain(String(height));
      }

      expect(joined.indexOf(String(heights[0]))).toBeLessThan(
        joined.indexOf(String(heights[heights.length - 1])),
      );
    });

    it('counts the cycles that ran outside the band, and names the number a reader counts', () => {
      const counted = thePointsDrawnOutsideTheBand();

      expect(counted).toHaveLength(herCyclesOutsideTheBand.length);
      expect(counted).toHaveLength(3);
      expect(whatItSays(homeTrendCountTestID)).toBe(cyclesOutsideReads(3, 6));
      expect(whatItSays(homeTrendCountTestID)).toContain('3');
      expect(whatItSays(homeTrendCountTestID)).toContain('6');
    });

    it('says under the chart how many cycles it drew and what the band is', () => {
      expect(whatItSays(trendCaptionTestID)).not.toBe('');
      expect(whatItSays(trendCaptionTestID)).toContain('6');
      expect(theKeysOfTheSection.length).toBeGreaterThan(0);

      for (const language of Object.keys(theCatalogueOf) as Language[]) {
        for (const key of theKeysOfTheSection) {
          expect(theCatalogueOf[language][key]).toBeDefined();
        }
      }
    });

    it('draws every word of the section small enough that a stranger reads none of it', () => {
      const drawn = theWordsOfTheSection();

      expect(
        drawn.filter((run) => run.points === undefined || run.points > theLargestAWordMayBeDrawn),
      ).toEqual([]);
      expect(drawn.length).toBeGreaterThan(2);
    });

    it('calls none of her cycles normal, abnormal or irregular', () => {
      const said = theWordsOfTheSection()
        .map((run) => run.text.toLowerCase())
        .join(' ');

      for (const verdict of ['normal', 'abnormal', 'irregular']) {
        expect(said).not.toContain(verdict);
      }
    });

    it('tells somebody listening what the shape is, because a picture says nothing to them', () => {
      const spoken = String(screen.getByTestId(trendPlotTestID).props.accessibilityLabel);

      expect(spoken).toContain(String(Math.min(...herCycleLengths)));
      expect(spoken).toContain(String(Math.max(...herCycleLengths)));
      expect(spoken).toContain(String(CYCLE_LENGTH_LOW_DAYS));
      expect(spoken).toContain(String(CYCLE_LENGTH_HIGH_DAYS));
    });
    it('gives the way to the same cycles a thumb to press it with', () => {
      expect(controlsTooSmallToPress([screen.getByTestId(homeTrendPressTestID)])).toEqual([]);
    });
  });

  describe('the chart of a woman whose cycles all fell inside the published range', () => {
    it('tells her so, rather than counting nought of her last six', async () => {
      await sheOpensEmi([28, 29, 30, 28, 31, 27]);

      expect(thePointsDrawnOutsideTheBand()).toEqual([]);
      expect(whatItSays(homeTrendCountTestID)).toBe(cyclesOutsideReads(0, 6));
      expect(whatItSays(homeTrendCountTestID)).not.toContain('0');
    });
  });

  describe('the screen she opens with one complete cycle', () => {
    it('draws no chart, no sentence and no link, because a shape needs two cycles', async () => {
      await sheOpensEmi([28]);

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(homeTrendTestID)).toBeNull();
      expect(screen.queryByTestId(homeTrendCountTestID)).toBeNull();
      expect(screen.queryByTestId(homeTrendPressTestID)).toBeNull();
    });

    it('draws the chart as soon as a second cycle is complete', async () => {
      await sheOpensEmi([28, 30]);

      expect(screen.getByTestId(homeTrendTestID)).toBeTruthy();
      expect(thePointsSheReads()).toHaveLength(2);
    });
  });

  describe('the screen she opens, held against the drawing of her cycle trend', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('is held to the parts the drawing places, in the drawing order, and to no other list', () => {
      expect(thePartsOfTheMockup('todayTrends').map((part) => part.name)).toEqual(
        theDrawingPlaces().map((part) => part.name),
      );
    });

    it('draws every part of the drawing this step builds, in the order the drawing places them', () => {
      const mine = theDrawingPlaces()
        .filter((part) => part.ownedBy === undefined)
        .map(asPart);

      expect(partsMissing(mine, theIdentifiersDrawn())).toEqual([]);
      expect(mine).toHaveLength(7);
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

  describe('the same cycles in full, which the link under the chart reaches', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('lands on Insights, listing the same six cycles the chart drew', async () => {
      const drawn = theCompleteCyclesHerPhoneHolds().map((cycle) => cycle.startedOn);

      await shePresses(homeTrendPressTestID);

      expect(screen.getByTestId(historyScreenTestID)).toBeTruthy();
      expect(theCyclesInsightsLists()).toEqual(expect.arrayContaining(drawn));
      expect(drawn).toHaveLength(6);
    });

    it('gives each of those cycles the length the chart drew it at', async () => {
      const heights = theCompleteCyclesHerPhoneHolds().map((cycle) => ({
        startedOn: cycle.startedOn,
        days: theDaysAtTheHeight(theHeightOfThePoint(cycle.startedOn)),
      }));

      await shePresses(homeTrendPressTestID);

      for (const read of heights) {
        expect(whatItSays(historyCycleTestID(read.startedOn))).toContain(
          String(Math.round(read.days)),
        );
      }
    });
  });
});
