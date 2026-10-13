import { join } from 'node:path';

import {
  GAP_DEGREES,
  NAMED_RING_BEAD_ORBIT,
  NAMED_RING_DIAMETER,
  NAMED_RING_RADIUS,
  NAMED_RING_TRACK_WIDTH,
  colour,
} from '@emi/tokens';
import { render } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet, type ViewStyle } from 'react-native';

import {
  CycleRing,
  ringBeadTestID,
  ringCentreDayTestID,
  ringCentreLengthTestID,
  ringCentrePhaseTestID,
} from '../../src/components/CycleRing';
import { ringAboutLengthWords, ringDayNumberWords } from '../../src/features/cycle/copy';
import { homeCalendarTestID } from '../../src/features/home/HomeHeader';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { textIn } from '../fixtures/renderedText';
import {
  theBeadSheSees,
  theEndsOfTheArcs,
  theGroundBetweenTheArcs,
} from '../fixtures/theRingSheReads';
import {
  herPhoneHoldsFourRecordedPeriodDays,
  sheSaidHerCycleRuns,
  theCalendarButtonTooSmallToPress,
  theDaySheOpensIt,
  theDayTheRingSaysFor,
  whatIsLeftOfTheStrip,
} from '../fixtures/theWeekSheOpensWith';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The ring of Today and the top bar above it, in the shapes the approved redesign draws them in.
 *
 * She reads where she is in her cycle from the ring before she reads a word of the screen, so
 * every case here asks what the shapes say: what the middle of the ring names, where the ground
 * between two phases is, and how the arcs end.
 *
 * Contract changed by the todayPhases board: the strip of seven days above the ring is gone, and
 * the calendar button in the top bar is the way to her month. The middle of the ring says the day
 * as "Day N" and the length as "of about N", and every arc is painted whole with square ends.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the Thursday of the drawing, well away from any change of the clocks. */
const whenSheOpensIt = new Date(`${theDaySheOpensIt}T12:00:00.000Z`);

async function sheOpensEmi(): Promise<void> {
  await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensIt);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

function saidUnder(testID: string): string {
  return textIn(screen.getByTestId(testID)).join('');
}

describe('the ring and the top bar take the redesign look', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement is step 2.4. Here it arrives already open, so what a case reads off
    // the screen is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
    await sheOpensEmi();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the middle of the ring', () => {
    it('names her phase, then Day and the day she is on, then about the length of her cycle', () => {
      const day = theDayTheRingSaysFor(theDaySheOpensIt);

      expect(day).toBeGreaterThan(0);
      expect([
        saidUnder(ringCentrePhaseTestID),
        saidUnder(ringCentreDayTestID),
        saidUnder(ringCentreLengthTestID),
      ]).toEqual([
        'Period',
        ringDayNumberWords(Number(day)),
        ringAboutLengthWords(sheSaidHerCycleRuns),
      ]);
      expect(saidUnder(ringCentreDayTestID)).toBe(`Day ${String(day)}`);
    });

    it('writes the length as the words of the catalogue, and never as a figure on its own', () => {
      expect(saidUnder(ringCentreLengthTestID)).toBe(`of about ${String(sheSaidHerCycleRuns)}`);
      expect(saidUnder(ringCentreLengthTestID)).not.toBe(String(sheSaidHerCycleRuns));
    });
  });

  describe('the arcs of the ring', () => {
    it('are painted with a square end, every one of them, as the board draws them', () => {
      const ends = theEndsOfTheArcs();

      expect(ends.length).toBeGreaterThan(1);
      expect(ends.filter((end) => end !== 'butt')).toEqual([]);
    });

    it('still leave ground at every boundary, so no boundary is a colour change alone', () => {
      const ground = theGroundBetweenTheArcs();

      expect(ground.length).toBeGreaterThan(1);

      for (const gap of ground) {
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeCloseTo(GAP_DEGREES, 2);
      }
    });
  });

  describe('the bead on today', () => {
    // Contract changed by the todayPhases board: on the ring of Today the bead is a disc of the
    // text colour with a card colour halo, on an orbit outside the band. The plain ring keeps the
    // card disc with the text colour around it.
    it('is a disc of the text colour with the card colour around it, on the ring of Today', () => {
      expect(theBeadSheSees()).toEqual({ fill: colour.text, line: colour.card });
    });

    it('sits outside the band, so it never covers a name written on an arc', () => {
      const bead = screen.getByTestId(ringBeadTestID);
      const centre = NAMED_RING_DIAMETER / 2;
      const orbit = Math.hypot(Number(bead.props.cx) - centre, Number(bead.props.cy) - centre);

      expect(orbit).toBeCloseTo(NAMED_RING_BEAD_ORBIT, 3);
      expect(orbit).toBeGreaterThan(NAMED_RING_RADIUS + NAMED_RING_TRACK_WIDTH / 2);
    });

    it('is never the accent and never one of the four arcs it can sit on', () => {
      expect(theBeadSheSees().fill).not.toBe(colour.accent);
      expect(theBeadSheSees().fill).not.toBe(colour.period);
    });

    it('is still a disc of the card colour with the text colour around it on the plain ring', async () => {
      await render(
        <CycleRing
          cycleLengthDays={28}
          day={4}
          phases={[
            { phase: 'period', days: 5 },
            { phase: 'follicular', days: 7 },
            { phase: 'ovulation', days: 7 },
            { phase: 'luteal', days: 9 },
          ]}
        />,
      );

      expect(theBeadSheSees()).toEqual({ fill: colour.card, line: colour.text });
    });
  });

  describe('the top bar above the ring, where the week used to be', () => {
    it('draws no part of the strip of seven days', () => {
      expect(whatIsLeftOfTheStrip()).toEqual([]);
    });

    it('draws the calendar button as a disc of the card colour, at least 44 points across', () => {
      const disc = StyleSheet.flatten(
        screen.getByTestId(homeCalendarTestID).props.style,
      ) as ViewStyle;

      expect(disc.backgroundColor).toBe(colour.card);
      expect(disc.width).toBe(disc.height);
      expect(theCalendarButtonTooSmallToPress()).toEqual([]);
    });
  });
});
