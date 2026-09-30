import { join } from 'node:path';

import { typeScale } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import {
  homeGreetingTestID,
  homeHeaderMarkTestID,
  homeHeaderTestID,
  homeHeaderWordTestID,
} from '../../src/features/home/HomeHeader';
import { greeting, homeCopy } from '../../src/features/home/copy';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf } from '../fixtures/herPhone';
import { sizedTextIn, textIn } from '../fixtures/renderedText';
import {
  everyPartOfTheDrawing,
  herPhoneHoldsHerDaysAnd,
  theHeaderCarries,
  theHeaderOfTheDrawing,
  theNameSheGave,
  theOrderTheDrawingPlacesThemIn,
  whatTheHeaderDrew,
  whatTheScreenSheOpensDrew,
} from '../fixtures/theHeaderSheOpensWith';
import { partsMissing } from '../fixtures/theMockupScreen';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** The role the word takes, and the size the design system holds that role at. */
const theRoleTheWordTakes = 'headline-lg';
const theWordIsDrawnAt = 28;

async function sheOpensEmi(name?: string): Promise<void> {
  await herPhoneHoldsHerDaysAnd(whenSheOpensIt, today, name);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

function whatItSays(testID: string): string {
  return textIn(screen.getByTestId(testID)).join(' ');
}

describe('the screen she opens names Emi and greets her by the name she gave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement is step 2.4. Here it arrives already open, so what a case reads off
    // the screen is the shape and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the drawing the screen is held to', () => {
    it('places the header first, and says what the built header is drawn under', () => {
      const [header] = theHeaderOfTheDrawing();

      expect(header?.name).toBe('HomeHeader');
      expect(header?.builtUnder).toContain(homeHeaderTestID);
    });

    it('places more than the header, and the rest of it is not this step', () => {
      expect(everyPartOfTheDrawing().length).toBeGreaterThan(1);
    });

    it('puts the mark, then the word, then the greeting inside that header', () => {
      expect(theOrderTheDrawingPlacesThemIn()).toEqual(theHeaderCarries.map((part) => part.name));
    });
  });

  describe('the header she reads, on a phone holding her days and the name she gave', () => {
    beforeEach(async () => {
      await sheOpensEmi(theNameSheGave);
    });

    it('answers for the header the drawing places first', () => {
      expect(partsMissing(theHeaderOfTheDrawing(), whatTheScreenSheOpensDrew())).toEqual([]);
    });

    it('draws the mark, then the word, then the greeting, in that order', () => {
      expect(partsMissing(theHeaderCarries, whatTheScreenSheOpensDrew())).toEqual([]);
      expect(whatTheHeaderDrew()).toEqual([
        homeHeaderTestID,
        homeHeaderMarkTestID,
        homeHeaderWordTestID,
        homeGreetingTestID,
      ]);
    });

    it('is the first thing the screen draws, with nothing of the screen above it', () => {
      expect(whatTheScreenSheOpensDrew()[0]).toBe(homeHeaderTestID);
    });

    it('says Emi, and greets her by the name she gave', () => {
      expect(whatItSays(homeHeaderWordTestID)).toBe(homeCopy.wordmark);
      expect(whatItSays(homeGreetingTestID)).toBe(greeting(theNameSheGave));
      // The greeting is held to carrying her name as well as to being the greeting, because a
      // greeting built without it would still match itself.
      expect(whatItSays(homeGreetingTestID)).toContain(theNameSheGave);
    });

    it('draws the word at the largest headline role, which the design system holds at 28 points', () => {
      expect(
        sizedTextIn(screen.getByTestId(homeHeaderWordTestID)).map((run) => run.points),
      ).toEqual([theWordIsDrawnAt]);
      expect(typeScale[theRoleTheWordTakes].size).toBe(theWordIsDrawnAt);
    });
  });

  describe('the header of a woman who gave no name', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('draws the mark and the word, and no greeting line at all', () => {
      expect(whatTheHeaderDrew()).toEqual([
        homeHeaderTestID,
        homeHeaderMarkTestID,
        homeHeaderWordTestID,
      ]);
      expect(screen.queryByTestId(homeGreetingTestID)).toBeNull();
    });
  });

  describe('what the comparison says when a part of the header is missing', () => {
    it('names the mark, and says what it is built under', () => {
      const withoutTheMark = whatTheScreenSheOpensDrew().filter(
        (identifier) => identifier !== homeHeaderMarkTestID,
      );

      expect(partsMissing(theHeaderCarries, withoutTheMark)).toEqual([
        `the drawing names mark, built under ${homeHeaderMarkTestID}, and the screen draws none of them anywhere on the screen`,
      ]);
    });
  });
});
