import { join } from 'node:path';

import { textStyle } from '@emi/tokens';
import { render, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, Text, View } from 'react-native';

import { cycleRingTestID } from '../../src/components/CycleRing';
import { homeHeaderTestID } from '../../src/features/home/HomeHeader';
import {
  phaseLineDayTestID,
  phaseLinePhaseTestID,
  phaseLineTestID,
} from '../../src/features/home/PhaseLine';
import { weekStripTestID } from '../../src/features/home/WeekStrip';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { phaseFills, textDrawnOnAPhaseFill } from '../fixtures/phaseInk';
import { textIn } from '../fixtures/renderedText';
import { partsMissing } from '../fixtures/theMockupScreen';
import {
  theDaySheReachesHerLutealPhase,
  theFillOf,
  theFourWordsDrawnOn,
  theFourWordsDrawnTooLargeOn,
  theGroundThePhaseLineIsDrawnOn,
  theInkOf,
  theLargestTheyMayBeDrawn,
  theLutealDayTheDrawingDraws,
  thePhaseLineOfTheDrawing,
  thePhaseLineOnTheGlass,
  thePhaseLineSheReads,
  theTopOfTheDrawing,
} from '../fixtures/thePhaseLineSheReads';
import {
  herPhoneHoldsFourRecordedPeriodDays,
  herPhoneHoldsNoDayAtAll,
  theDaySheOpensIt,
  theDayTheRingSaysFor,
  whatTheScreenSheOpensDrew,
} from '../fixtures/theWeekSheOpensWith';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on her fourth period day, which is the day the drawing of this screen is drawn on. */
const whenSheOpensIt = new Date(`${theDaySheOpensIt}T12:00:00.000Z`);

/** Midday three weeks later, the day of the same cycle the luteal drawing is drawn on. */
const whenSheReachesHerLutealPhase = new Date(`${theDaySheReachesHerLutealPhase}T12:00:00.000Z`);

async function sheOpensEmiOn(when: Date): Promise<void> {
  jest.setSystemTime(when);
  await herPhoneHoldsFourRecordedPeriodDays(when);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

describe('she reads her phase and her cycle day as words from across the room', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring arrives already open, so what a case reads off the screen is the shape she is left
    // with and never a frame of the one movement the ring makes.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the drawings the line is held to', () => {
    it('places the line fourth, under the ring, and says what it is built under', () => {
      const [header, strip, ring, line] = theTopOfTheDrawing('todayNext');

      expect(header?.name).toBe('HomeHeader');
      expect(strip?.name).toBe('WeekStrip');
      expect(ring?.name).toBe('CycleRing');
      expect(line?.name).toBe('PhaseLine');
      expect(line?.builtUnder).toContain(phaseLineTestID);
    });

    it('draws a period day on one screen and a luteal day on the other', () => {
      expect(thePhaseLineOfTheDrawing('todayNext')).toEqual({ day: 4, phase: 'period' });
      expect(thePhaseLineOfTheDrawing('todayLuteal')).toEqual({ day: 21, phase: 'luteal' });
    });

    it('draws the luteal day three weeks further into the cycle than the period day', () => {
      expect(theLutealDayTheDrawingDraws).toBeGreaterThan(
        thePhaseLineOfTheDrawing('todayNext').day + 14,
      );
    });
  });

  describe('the line she reads on a period day', () => {
    beforeEach(async () => {
      await sheOpensEmiOn(whenSheOpensIt);
    });

    it('answers for the four parts the drawing places at the top of the screen', () => {
      expect(partsMissing(theTopOfTheDrawing('todayNext'), whatTheScreenSheOpensDrew())).toEqual(
        [],
      );
    });

    it('draws the line under her week and under the ring', () => {
      const drawn = whatTheScreenSheOpensDrew();

      expect(drawn.indexOf(phaseLineTestID)).toBeGreaterThan(drawn.indexOf(weekStripTestID));
      expect(drawn.indexOf(phaseLineTestID)).toBeGreaterThan(drawn.indexOf(cycleRingTestID));
      expect(drawn.indexOf(weekStripTestID)).toBeGreaterThan(drawn.indexOf(homeHeaderTestID));
    });

    it('names the day the drawing names, which is the day the ring says she is on', () => {
      expect(thePhaseLineSheReads().day).toBe(thePhaseLineOfTheDrawing('todayNext').day);
      expect(thePhaseLineSheReads().day).toBe(theDayTheRingSaysFor(theDaySheOpensIt));
    });

    it('names the phase in words, and it is the phase the drawing draws her in', () => {
      expect(thePhaseLineSheReads().phase).not.toBe('');
      expect(thePhaseLineSheReads().phase.toLowerCase()).toContain('period');
    });

    it('draws the day far larger than the phase beside it, which is what reads across a room', () => {
      const read = thePhaseLineSheReads();

      expect(read.dayPoints).toBeGreaterThan(read.phasePoints ?? 0);
      expect(read.dayPoints).toBeGreaterThan(theLargestTheyMayBeDrawn * 2);
    });

    it('writes the phase in the ink partner of that phase, and never in the fill', () => {
      const read = thePhaseLineSheReads();

      expect(read.phaseColour).toBe(theInkOf('period'));
      expect(read.phaseColour).not.toBe(theFillOf('period'));
    });

    it('draws the line on the surface, so no word of it sits on the colour of a phase', () => {
      // The strip above draws a date on the period fill, which is a figure and not a word, so the
      // reading is of the line rather than of the whole glass, and it is of something.
      expect(textIn(thePhaseLineOnTheGlass()).length).toBeGreaterThan(0);
      expect(textDrawnOnAPhaseFill(thePhaseLineOnTheGlass())).toEqual([]);

      for (const ground of theGroundThePhaseLineIsDrawnOn()) {
        expect(phaseFills).not.toContain(ground);
      }
    });
  });

  describe('the same screen three weeks later, in her luteal phase', () => {
    beforeEach(async () => {
      await sheOpensEmiOn(whenSheReachesHerLutealPhase);
    });

    it('answers for the three parts the luteal drawing places at the top of the screen', () => {
      expect(partsMissing(theTopOfTheDrawing('todayLuteal'), whatTheScreenSheOpensDrew())).toEqual(
        [],
      );
    });

    it('names the day the luteal drawing names, which is the day the ring says she is on', () => {
      expect(thePhaseLineSheReads().day).toBe(theLutealDayTheDrawingDraws);
      expect(thePhaseLineSheReads().day).toBe(theDayTheRingSaysFor(theDaySheReachesHerLutealPhase));
    });

    it('names the luteal phase in words, and writes it in the luteal ink', () => {
      const read = thePhaseLineSheReads();

      expect(read.phase.toLowerCase()).toContain('luteal');
      expect(read.phaseColour).toBe(theInkOf('luteal'));
    });

    it('draws the phase at the size a period day drew it, because the size never moves', async () => {
      const luteal = thePhaseLineSheReads();

      resetExpoSqlite();
      resetExpoSecureStore();
      await sheOpensEmiOn(whenSheOpensIt);

      expect(luteal.phasePoints).toBe(thePhaseLineSheReads().phasePoints);
      expect(luteal.dayPoints).toBe(thePhaseLineSheReads().dayPoints);
    });
  });

  describe('the four words a stranger walking past would read', () => {
    it('are every one of them drawn at 14 points or less, and one of them is on the glass', async () => {
      await sheOpensEmiOn(whenSheOpensIt);

      expect(theFourWordsDrawnTooLargeOn(screen.toJSON())).toEqual([]);
      expect(theFourWordsDrawnOn(screen.toJSON()).length).toBeGreaterThan(0);
    });

    it('are still held to it on a luteal day, where the phase itself is not one of them', async () => {
      await sheOpensEmiOn(whenSheReachesHerLutealPhase);

      expect(theFourWordsDrawnTooLargeOn(screen.toJSON())).toEqual([]);
      expect(theFourWordsDrawnOn(screen.toJSON()).length).toBeGreaterThan(0);
    });

    it('name the word and the size it was drawn at, where one is drawn too large', async () => {
      // The body size is the smallest role above the ceiling, so a phase word that took an
      // ordinary sentence's size rather than a label's is exactly this failure.
      const aboveTheCeiling = textStyle('body-lg');

      await render(
        <View>
          <Text style={aboveTheCeiling}>Your period, day 4 of about 5</Text>
        </View>,
      );

      expect(aboveTheCeiling.fontSize).toBeGreaterThan(theLargestTheyMayBeDrawn);
      expect(theFourWordsDrawnTooLargeOn(screen.toJSON())).toEqual([
        { points: aboveTheCeiling.fontSize, text: 'Your period, day 4 of about 5' },
      ]);
    });

    it('name a word nothing measured, because an unmeasured word is not a small one', async () => {
      await render(
        <View>
          <Text>Your fertile window</Text>
        </View>,
      );

      expect(theFourWordsDrawnTooLargeOn(screen.toJSON())).toEqual([
        { points: undefined, text: 'Your fertile window' },
      ]);
    });
  });

  describe('the woman who has recorded nothing', () => {
    beforeEach(async () => {
      await herPhoneHoldsNoDayAtAll(whenSheOpensIt);
      await renderRouter(appDirectory, { initialUrl: '/' });
    });

    it('reads no line at all, because there is no day of a cycle to name', () => {
      expect(screen.queryByTestId(phaseLineTestID)).toBeNull();
      expect(screen.queryByTestId(phaseLineDayTestID)).toBeNull();
      expect(screen.queryByTestId(phaseLinePhaseTestID)).toBeNull();
    });

    it('still reads her week, so the strip and the line are not one part', () => {
      expect(screen.getByTestId(weekStripTestID)).toBeTruthy();
    });
  });

  describe('what the comparison says when the line is missing', () => {
    beforeEach(async () => {
      await sheOpensEmiOn(whenSheOpensIt);
    });

    it('names the line, and says what it is built under', () => {
      const withoutTheLine = whatTheScreenSheOpensDrew().filter(
        (identifier) => identifier !== phaseLineTestID,
      );

      expect(partsMissing(theTopOfTheDrawing('todayNext'), withoutTheLine)).toEqual([
        `the drawing names PhaseLine, built under ${phaseLineTestID}, and the screen draws none of them after ${cycleRingTestID}`,
      ]);
    });
  });
});
