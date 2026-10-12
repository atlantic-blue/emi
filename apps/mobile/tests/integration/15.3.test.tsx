import { join } from 'node:path';

import { type PhaseName, textStyle } from '@emi/tokens';
import { render, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, Text, View } from 'react-native';

import { cycleRingTestID, ringCentreDayTestID } from '../../src/components/CycleRing';
import { phaseCardTestID } from '../../src/features/home/PhaseCard';
import { phaseCardWords } from '../../src/features/home/copy';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { phaseFills, textDrawnOnAPhaseFill } from '../fixtures/phaseInk';
import { textIn } from '../fixtures/renderedText';
import { partsMissing, theIdentifiersDrawn } from '../fixtures/theMockupScreen';
import {
  theDaySheReachesHerLutealPhase,
  theDayTheLutealDrawingNames,
  theFillOf,
  theFourWordsDrawnOn,
  theFirstLutealDayTheRuleGives,
  theFourWordsDrawnTooLargeOn,
  theGroundThePhaseCardIsDrawnOn,
  theIdentifiersOfTheLineThatIsGone,
  theInkOf,
  theLargestTheyMayBeDrawn,
  theLutealDayTheDrawingDraws,
  thePhaseCardOnTheGlass,
  thePhaseLineOfTheDrawing,
  thePhaseSheReads,
  theTopOfTheDrawing,
} from '../fixtures/thePhaseLineSheReads';
import {
  herPhoneHoldsFourRecordedPeriodDays,
  herPhoneHoldsNoDayAtAll,
  theDaySheOpensIt,
  theDayTheRingSaysFor,
  thePhaseDaysTheRuleGivesFor,
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

/** The card the screen should draw on that day, worked out through the rule the screen reads. */
function theCardTheRuleGives(phase: PhaseName, day: string): string {
  const days = thePhaseDaysTheRuleGivesFor(day);

  if (days === undefined) {
    throw new Error(`her phone gives no phase days on ${day}`);
  }

  return phaseCardWords(phase, days[phase]).days;
}

/** The parts of the line under the ring still on the glass. Empty is the answer once it is gone. */
function whatIsLeftOfTheLine(): string[] {
  return theIdentifiersDrawn().filter((identifier) =>
    theIdentifiersOfTheLineThatIsGone.includes(identifier),
  );
}

/**
 * Contract changed by the todayPhases board: the line under the ring is gone. The day of her cycle
 * is written in the middle of the ring as "Day N", the phase name over it in its ink, and the card
 * under the ring names the phase and its days.
 */
describe('she reads her phase and her cycle day from across the room', () => {
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
    it('places the line fourth, under the ring, and the phase card is what it is built under', () => {
      const [header, strip, ring, line] = theTopOfTheDrawing('todayNext');

      expect(header?.name).toBe('HomeHeader');
      expect(strip?.name).toBe('WeekStrip');
      expect(ring?.name).toBe('CycleRing');
      expect(line?.name).toBe('PhaseLine');
      expect(line?.builtUnder).toEqual([phaseCardTestID]);
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

  describe('what she reads on a period day', () => {
    beforeEach(async () => {
      await sheOpensEmiOn(whenSheOpensIt);
    });

    it('answers for the top of the drawing, but the strip the calendar button replaced', () => {
      expect(partsMissing(theTopOfTheDrawing('todayNext'), whatTheScreenSheOpensDrew())).toEqual([
        'the drawing names WeekStrip, and nothing says which test identifier it is built under',
      ]);
    });

    it('draws the phase card under the ring, and no part of the line', () => {
      const drawn = whatTheScreenSheOpensDrew();

      expect(drawn.indexOf(phaseCardTestID)).toBeGreaterThan(drawn.indexOf(cycleRingTestID));
      expect(whatIsLeftOfTheLine()).toEqual([]);
    });

    it('writes Day and the day the drawing names in the ring, which is the day the ring says she is on', () => {
      expect(thePhaseSheReads().daySaid).toBe(
        `Day ${String(thePhaseLineOfTheDrawing('todayNext').day)}`,
      );
      expect(thePhaseSheReads().day).toBe(theDayTheRingSaysFor(theDaySheOpensIt));
    });

    it('names the phase in words over the day, and it is the phase the drawing draws her in', () => {
      expect(thePhaseSheReads().phase).toBe('Period');
    });

    it('names the phase and its days on the card, as the phase rule gives them', () => {
      expect(thePhaseSheReads().cardDays).toBe(theCardTheRuleGives('period', theDaySheOpensIt));
      expect(thePhaseSheReads().cardDays).toMatch(/^Period phase, days? \d+/);
      expect(thePhaseSheReads().cardLine).not.toBe('');
    });

    it('draws the day far larger than the phase over it, which is what reads across a room', () => {
      const read = thePhaseSheReads();

      expect(read.dayPoints).toBeGreaterThan(read.phasePoints ?? 0);
      expect(read.dayPoints).toBeGreaterThan(theLargestTheyMayBeDrawn * 2);
    });

    it('writes the phase in the ink partner of that phase, and never in the fill', () => {
      const read = thePhaseSheReads();

      expect(read.phaseColour).toBe(theInkOf('period'));
      expect(read.phaseColour).not.toBe(theFillOf('period'));
    });

    it('draws the card on the surface, so no word of it sits on the colour of a phase', () => {
      expect(textIn(thePhaseCardOnTheGlass()).length).toBeGreaterThan(0);
      expect(textDrawnOnAPhaseFill(thePhaseCardOnTheGlass())).toEqual([]);

      for (const ground of theGroundThePhaseCardIsDrawnOn()) {
        expect(phaseFills).not.toContain(ground);
      }
    });
  });

  describe('the same screen three weeks later, in her luteal phase', () => {
    beforeEach(async () => {
      await sheOpensEmiOn(whenSheReachesHerLutealPhase);
    });

    it('answers for the top of the luteal drawing, but the strip the calendar button replaced', () => {
      expect(partsMissing(theTopOfTheDrawing('todayLuteal'), whatTheScreenSheOpensDrew())).toEqual([
        'the drawing names WeekStrip, and nothing says which test identifier it is built under',
      ]);
    });

    it('writes the first luteal day the phase rule gives, which is the day the ring says she is on', () => {
      expect(thePhaseSheReads().day).toBe(theFirstLutealDayTheRuleGives);
      expect(thePhaseSheReads().day).toBe(theDayTheRingSaysFor(theDaySheReachesHerLutealPhase));
    });

    it('names the ovulation phase on the day the older luteal drawing names', async () => {
      resetExpoSqlite();
      resetExpoSecureStore();
      await sheOpensEmiOn(new Date(`${theDayTheLutealDrawingNames}T12:00:00.000Z`));

      expect(thePhaseSheReads().day).toBe(theLutealDayTheDrawingDraws);
      expect(thePhaseSheReads().phase).toBe('Ovulation');
      expect(thePhaseSheReads().cardDays).toContain('Ovulation');
      expect(thePhaseSheReads().cardDays).not.toContain('Luteal');
    });

    it('names the luteal phase in words, writes it in the luteal ink, and names its days on the card', () => {
      const read = thePhaseSheReads();

      expect(read.phase).toBe('Luteal');
      expect(read.phaseColour).toBe(theInkOf('luteal'));
      expect(read.cardDays).toBe(theCardTheRuleGives('luteal', theDaySheReachesHerLutealPhase));
    });

    it('draws the phase at the size a period day drew it, because the size never moves', async () => {
      const luteal = thePhaseSheReads();

      resetExpoSqlite();
      resetExpoSecureStore();
      await sheOpensEmiOn(whenSheOpensIt);

      expect(luteal.phasePoints).toBe(thePhaseSheReads().phasePoints);
      expect(luteal.dayPoints).toBe(thePhaseSheReads().dayPoints);
      expect(luteal.cardDaysPoints).toBe(thePhaseSheReads().cardDaysPoints);
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

    it('reads no card, no day in a ring and no line, because there is no day of a cycle to name', () => {
      expect(screen.queryByTestId(phaseCardTestID)).toBeNull();
      expect(screen.queryByTestId(ringCentreDayTestID)).toBeNull();
      expect(whatIsLeftOfTheLine()).toEqual([]);
    });
  });

  describe('what the comparison says when the card is missing', () => {
    beforeEach(async () => {
      await sheOpensEmiOn(whenSheOpensIt);
    });

    it('names the line, and says the card is what it is built under', () => {
      const withoutTheCard = whatTheScreenSheOpensDrew().filter(
        (identifier) => identifier !== phaseCardTestID,
      );

      expect(partsMissing(theTopOfTheDrawing('todayNext'), withoutTheCard)).toEqual([
        'the drawing names WeekStrip, and nothing says which test identifier it is built under',
        `the drawing names PhaseLine, built under ${phaseCardTestID}, and the screen draws none of them after ${cycleRingTestID}`,
      ]);
    });
  });
});
