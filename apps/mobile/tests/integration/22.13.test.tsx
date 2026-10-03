import {
  CYCLE_LENGTH_HIGH_DAYS,
  CYCLE_LENGTH_LOW_DAYS,
  PERIOD_MAY_RUN_FOR_DAYS,
  POPULATION_SPREAD_DAYS,
} from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { cycleStripTestID, homeCyclesTestID } from '../../src/features/home/CycleStrip';
import { homeTrendTestID } from '../../src/features/home/CycleTrend';
import { homeCyclesLineTestID } from '../../src/features/home/HomeScreen';
import {
  herNumberTestID,
  homeNumbersHeadingTestID,
  homeNumbersTestID,
  measuredRowTestID,
  publishedNumberTestID,
} from '../../src/features/home/MeasuredRow';
import { patternCardTestID, patternCardTileTestID } from '../../src/features/home/PatternCard';
import { homeCopy } from '../../src/features/home/copy';
import {
  historyBackTestID,
  historyCycleTestID,
  historyTitleTestID,
} from '../../src/features/history/HistoryScreen';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { theSymptomsThatCameBack } from '../fixtures/herRepeatingSymptoms';
import { herPeriodRunsFor } from '../fixtures/herSixCycles';
import { textIn } from '../fixtures/renderedText';
import {
  howManyPartsAreHeldTo,
  sheIsLookingAtHerNumbersOverCyclesOf,
  sheIsLookingAtTheInsights,
  theCyclesHerPhoneHeld,
  theInsightsDrawings,
  thePartNamesTheStagePlaces,
  theScreenOf,
  theStyleOf,
  theThreeMeasurements,
  theWashIsAtTheTopOfTheInsights,
  theWordsOfThePillOn,
  whatTheDrawingAsksFor,
  whatTheInsightsDoNotAnswerFor,
  whatThisStepAnswersFor,
  whatThisStepLeaves,
  whereTheInsightsDrew,
} from '../fixtures/theInsightsLook';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The screens that read her own cycles back to her, in the shapes the approved redesign draws them
 * in.
 *
 * Every case here reads a rendered state against the drawing of that state in the mockups stage.
 * Nothing here decides what Emi counted, what it may say about it, or where a press leads: a case
 * reads what the screen drew and in what order.
 */

/** The last complete cycle on her phone, which is the one her two lengths are read from. */
const herLastCycleRanFor = 27;

/** Her variation over those six cycles, which the forecast works out and this row reads. */
const herVariationIs = 7.1;

/** Six lengths ending on a cycle longer than the published range, for the row that must differ. */
const cyclesEndingOutsideTheBand: readonly number[] = [28, 29, 30, 28, 31, 40];

/** The words no pill may carry, because a pill says where a figure sits and never what she is. */
const theWordsSheIsNotTold: readonly string[] = ['normal', 'abnormal', 'irregular'];

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

describe('the Insights screens match the redesign prototype', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // The ring's one movement belongs to step 2.4. Here the screen arrives already open, so what a
    // case reads off the glass is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('every screen of the set', () => {
    for (const drawing of theInsightsDrawings) {
      it(`carries the wash at the top of ${drawing}`, async () => {
        await sheIsLookingAtTheInsights(drawing);

        expect(theWashIsAtTheTopOfTheInsights()).toBe(true);
      });
    }

    for (const drawing of theInsightsDrawings) {
      it(`is held to the parts the stage places for ${drawing}, and to no other list`, async () => {
        await sheIsLookingAtTheInsights(drawing);

        expect(whatTheDrawingAsksFor(drawing).map((part) => part.name)).toEqual(
          thePartNamesTheStagePlaces(drawing),
        );
      });
    }

    for (const drawing of theInsightsDrawings) {
      it(`answers for every part of ${drawing} this step builds, in the drawing order`, async () => {
        await sheIsLookingAtTheInsights(drawing);

        expect(whatThisStepAnswersFor(drawing).length).toBeGreaterThan(1);
        expect(whatTheInsightsDoNotAnswerFor(drawing)).toEqual([]);
      });
    }

    it('is held to every part of every drawing, and the count is the check', async () => {
      await sheIsLookingAtTheInsights('history');

      expect(theInsightsDrawings).toHaveLength(6);
      expect(howManyPartsAreHeldTo()).toBeGreaterThan(40);
    });

    it('names every part it leaves to another step, which screen it is on, and why', async () => {
      await sheIsLookingAtTheInsights('history');

      const left = theInsightsDrawings.flatMap((drawing) => whatThisStepLeaves(drawing));

      expect(left.length).toBeGreaterThan(0);

      for (const part of left) {
        expect(part.builtUnder).toEqual([]);
        expect(part.ownedBy?.length ?? 0).toBeGreaterThan(40);
      }
    });

    it('names a part the sources page does not draw, so a silent gap cannot hide in the count', async () => {
      await sheIsLookingAtTheInsights('citation');

      const missing = whatTheInsightsDoNotAnswerFor('todayTrends').join(' ');

      expect(missing).toContain('CycleTrend');
      expect(missing).toContain('BottomNavigation');
    });
  });

  describe('her three numbers, each beside the figure a paper reports', () => {
    beforeEach(async () => {
      await sheIsLookingAtTheInsights('todayNumbers');
    });

    it('stands the three rows on the card ground, under one heading in her own words', () => {
      expect(theStyleOf(homeNumbersTestID).backgroundColor).toBe(colour.card);
      expect(theStyleOf(homeNumbersTestID).borderRadius).toBe(radius.xl);
      expect(whatItSays(homeNumbersHeadingTestID)).toBe(homeCopy.numbers.hers);
      expect(whereTheInsightsDrew(homeNumbersHeadingTestID)).toBeLessThan(
        whereTheInsightsDrew(measuredRowTestID('cycle-length')),
      );
    });

    it('carries a pill on every one of the three rows', () => {
      for (const measures of theThreeMeasurements) {
        expect(theWordsOfThePillOn(measures).length).toBeGreaterThan(0);
      }
    });

    it('says her last cycle sits within the published range, which 27 days is inside', () => {
      expect(whatItSays(herNumberTestID('cycle-length'))).toContain(String(herLastCycleRanFor));
      expect(herLastCycleRanFor).toBeGreaterThanOrEqual(CYCLE_LENGTH_LOW_DAYS);
      expect(herLastCycleRanFor).toBeLessThanOrEqual(CYCLE_LENGTH_HIGH_DAYS);
      expect(theWordsOfThePillOn('cycle-length')).toBe(homeCopy.numbers.standing.within);
    });

    it('says her last period sits within it too, because five days is under the eight published', () => {
      expect(herPeriodRunsFor).toBeLessThan(PERIOD_MAY_RUN_FOR_DAYS);
      expect(whatItSays(herNumberTestID('period-duration'))).toContain(String(herPeriodRunsFor));
      expect(theWordsOfThePillOn('period-duration')).toBe(homeCopy.numbers.standing.within);
    });

    it('says her variation is wider, because 7.1 days is over the 2.6 the paper reports', () => {
      expect(herVariationIs).toBeGreaterThan(POPULATION_SPREAD_DAYS);
      expect(whatItSays(herNumberTestID('cycle-length-variation'))).toContain(
        String(herVariationIs),
      );
      expect(theWordsOfThePillOn('cycle-length-variation')).toBe(homeCopy.numbers.standing.wider);
    });

    it('reads her own number rather than printing one word, so a longer cycle reads wider', async () => {
      await sheIsLookingAtHerNumbersOverCyclesOf(cyclesEndingOutsideTheBand);

      expect(theWordsOfThePillOn('cycle-length')).toBe(homeCopy.numbers.standing.wider);
    });

    it('never tells her what she is, on any pill or in any of the three words', () => {
      const said = [
        whatItSays(homeNumbersTestID).toLowerCase(),
        homeCopy.numbers.standing.within.toLowerCase(),
        homeCopy.numbers.standing.wider.toLowerCase(),
        homeCopy.numbers.standing.noFigure.toLowerCase(),
      ].join(' ');

      for (const word of theWordsSheIsNotTold) {
        expect(said).not.toContain(word);
      }
    });

    it('puts her own number over the published figure, which is the order the drawing places', () => {
      for (const measures of theThreeMeasurements) {
        expect(whereTheInsightsDrew(herNumberTestID(measures))).toBeLessThan(
          whereTheInsightsDrew(publishedNumberTestID(measures)),
        );
      }
    });

    it('names the published figure on the row, so neither number is left without an owner', () => {
      for (const measures of theThreeMeasurements) {
        expect(whatItSays(publishedNumberTestID(measures))).toContain(homeCopy.numbers.published);
      }
    });
  });

  describe('her cycles, as strips', () => {
    beforeEach(async () => {
      await sheIsLookingAtTheInsights('todayCycles');
    });

    it('stands every strip on the card ground with the corner of the redesign and no border', () => {
      const strips = theCyclesHerPhoneHeld();

      expect(strips.length).toBeGreaterThan(1);

      for (const startedOn of strips) {
        const strip = theStyleOf(cycleStripTestID(startedOn));

        expect(strip.backgroundColor).toBe(colour.card);
        expect(strip.borderRadius).toBe(radius.xl);
        expect(strip.borderWidth ?? 0).toBe(0);
      }
    });

    it('keeps the line that says what a strip is under the strips themselves', () => {
      expect(whereTheInsightsDrew(homeCyclesTestID)).toBeLessThan(
        whereTheInsightsDrew(homeCyclesLineTestID),
      );
    });
  });

  describe('her trend over six cycles', () => {
    beforeEach(async () => {
      await sheIsLookingAtTheInsights('todayTrends');
    });

    it('stands the chart on the card ground with the corner of the redesign and no border', () => {
      const trend = theStyleOf(homeTrendTestID);

      expect(trend.backgroundColor).toBe(colour.card);
      expect(trend.borderRadius).toBe(radius.xl);
      expect(trend.borderWidth ?? 0).toBe(0);
    });
  });

  describe('what comes back', () => {
    beforeEach(async () => {
      await sheIsLookingAtTheInsights('todayPatterns');
    });

    it('stands every card on the card ground with the corner of the redesign and no border', () => {
      for (const symptom of theSymptomsThatCameBack) {
        const card = theStyleOf(patternCardTestID(symptom.slug));

        expect(card.backgroundColor).toBe(colour.card);
        expect(card.borderRadius).toBe(radius.xl);
        expect(card.borderWidth ?? 0).toBe(0);
      }
    });

    it('gives every card its own round drawing, at the head of the card', () => {
      for (const symptom of theSymptomsThatCameBack) {
        const tile = theStyleOf(patternCardTileTestID(symptom.slug));

        expect(tile.borderRadius).toBe(radius.full);
        expect(whereTheInsightsDrew(patternCardTileTestID(symptom.slug))).toBeGreaterThan(
          whereTheInsightsDrew(patternCardTestID(symptom.slug)),
        );
      }
    });
  });

  describe('the Insights screen she reaches by the dock', () => {
    beforeEach(async () => {
      await sheIsLookingAtTheInsights('history');
    });

    it('stands every row on the card ground with the corner of the redesign and no border', () => {
      const rows = theCyclesHerPhoneHeld();

      expect(rows.length).toBeGreaterThan(1);

      for (const startedOn of rows) {
        const row = theStyleOf(historyCycleTestID(startedOn));

        expect(row.backgroundColor).toBe(colour.card);
        expect(row.borderRadius).toBe(radius.xl);
        expect(row.borderWidth ?? 0).toBe(0);
      }
    });

    it('offers the way back as the quieter capsule, under the rows she came to read', () => {
      const back = theStyleOf(historyBackTestID);
      const from = theScreenOf('history');

      expect(back.backgroundColor).toBe(colour.field);
      expect(back.borderRadius).toBe(radius.full);
      expect(Number(back.minHeight)).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
      expect(whereTheInsightsDrew(historyTitleTestID, from)).toBeLessThan(
        whereTheInsightsDrew(historyBackTestID, from),
      );
    });
  });
});
