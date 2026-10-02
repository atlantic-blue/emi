import { join } from 'node:path';

import { GAP_DEGREES, colour, phaseLabel, stroke } from '@emi/tokens';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet, type ViewStyle } from 'react-native';

import { ringCycleLengthWords, weekTodayWord } from '../../src/features/cycle/copy';
import { weekDateTestID, weekLetterTestID } from '../../src/features/home/WeekStrip';
import { weekdayLetter } from '../../src/features/onboarding/days';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { textIn } from '../fixtures/renderedText';
import {
  theBeadSheSees,
  theEndsOfTheArcs,
  theGroundBetweenTheArcs,
  theMiddleOfTheRing,
} from '../fixtures/theRingSheReads';
import {
  herPhoneHoldsFourRecordedPeriodDays,
  sheSaidHerCycleRuns,
  theDaySheOpensIt,
  theDayTheRingSaysFor,
  theDaysTheStripDrew,
} from '../fixtures/theWeekSheOpensWith';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The ring and the week above it, in the shapes the approved redesign draws them in.
 *
 * She reads where she is in her cycle from these two drawings before she reads a word of the
 * screen, so every case here asks what the shapes say: what the middle of the ring names, where
 * the ground between two phases is, and which of her seven days is filled, outlined or hers.
 *
 * Nothing here decides which day she bled on or which day her period is expected on. Each one is
 * read off the week the cycle layer already worked out, so a strip that drew a day of its own
 * would be caught by the thing it is not allowed to disagree with.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the Thursday of the drawing, well away from any change of the clocks. */
const whenSheOpensIt = new Date(`${theDaySheOpensIt}T12:00:00.000Z`);

async function sheOpensEmi(): Promise<void> {
  await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensIt);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

/** How the disc around one date is drawn, which is the whole of what that day says. */
function theDiscOn(day: string): ViewStyle {
  return StyleSheet.flatten(screen.getByTestId(weekDateTestID(day)).props.style) as ViewStyle;
}

/** What one column wrote above its date, which is a weekday letter on six days of seven. */
function theLetterOver(day: string): string {
  return textIn(screen.getByTestId(weekLetterTestID(day))).join('');
}

function theDaysDrawnAs(mark: (style: ViewStyle) => boolean): string[] {
  return theDaysTheStripDrew().filter((day) => mark(theDiscOn(day)));
}

describe('the ring and the week strip take the redesign look', () => {
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
    it('names her phase, then the day she is on, then the length of her cycle', () => {
      const day = theDayTheRingSaysFor(theDaySheOpensIt);

      expect(day).toBeGreaterThan(0);
      expect(theMiddleOfTheRing()).toEqual([
        phaseLabel.period,
        String(day),
        ringCycleLengthWords(sheSaidHerCycleRuns),
      ]);
    });

    it('writes the length as the words of the catalogue, and never as a figure on its own', () => {
      expect(ringCycleLengthWords(sheSaidHerCycleRuns)).toContain(String(sheSaidHerCycleRuns));
      expect(theMiddleOfTheRing().at(-1)).not.toBe(String(sheSaidHerCycleRuns));
    });
  });

  describe('the arcs of the ring', () => {
    it('are drawn with a round end, every one of them', () => {
      const ends = theEndsOfTheArcs();

      expect(ends.length).toBeGreaterThan(1);
      expect(ends.filter((end) => end !== 'round')).toEqual([]);
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
    it('is a disc of the card colour with the text colour around it', () => {
      expect(theBeadSheSees()).toEqual({ fill: colour.card, line: colour.text });
    });

    it('is never the accent and never one of the four arcs it can sit on', () => {
      expect(theBeadSheSees().fill).not.toBe(colour.accent);
      expect(theBeadSheSees().fill).not.toBe(colour.period);
    });
  });

  describe('the week above the ring', () => {
    it('fills the disc of every day she bled with the colour of her period', () => {
      const filled = theDaysDrawnAs((disc) => disc.backgroundColor === colour.period);

      expect(filled.length).toBeGreaterThan(0);

      for (const day of filled) {
        expect(theDiscOn(day).borderWidth ?? 0).toBe(0);
      }
    });

    it('outlines the day her period is expected on with a dashed line and no fill', () => {
      const outlined = theDaysDrawnAs((disc) => disc.borderStyle === 'dashed');

      expect(outlined.length).toBeGreaterThan(0);

      for (const day of outlined) {
        expect(theDiscOn(day)).toMatchObject({
          borderColor: colour.period,
          borderStyle: 'dashed',
          borderWidth: stroke.icon,
        });
        expect(theDiscOn(day).backgroundColor).toBeUndefined();
      }
    });

    it('draws no day of her week with the dotted outline the strip used to use', () => {
      expect(theDaysDrawnAs((disc) => disc.borderStyle === 'dotted')).toEqual([]);
    });

    it('names the column she is on TODAY, in place of the letter of its weekday', () => {
      expect(theDaysTheStripDrew()).toContain(theDaySheOpensIt);
      expect(theLetterOver(theDaySheOpensIt)).toBe(weekTodayWord());
      expect(theLetterOver(theDaySheOpensIt)).not.toBe(weekdayLetter(theDaySheOpensIt));
    });

    it('leaves the other six days their own letter, so only one column is named', () => {
      const others = theDaysTheStripDrew().filter((day) => day !== theDaySheOpensIt);

      expect(others).toHaveLength(6);

      for (const day of others) {
        expect(theLetterOver(day)).toBe(weekdayLetter(day));
      }
    });

    it('draws the disc of a date wide enough to read a two figure date in', () => {
      const disc = theDiscOn(theDaySheOpensIt);

      expect(disc.width).toBe(disc.height);
      expect(Number(disc.width)).toBeGreaterThanOrEqual(40);
    });
  });
});
