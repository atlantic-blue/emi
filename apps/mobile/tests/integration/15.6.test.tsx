import { join } from 'node:path';

import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID } from '../../src/components/CycleRing';
import { roundActionTestID } from '../../src/features/home/HomeScreen';
import { loggedTodayTestID } from '../../src/features/home/LoggedToday';
import { phaseLineTestID } from '../../src/features/home/PhaseLine';
import { homeCopy } from '../../src/features/home/copy';
import { logFlowDoneTestID } from '../../src/features/log/LogFlow';
import { symptomChipTestID } from '../../src/features/log/SymptomGroup';
import { opensOnParameter, theSymptoms } from '../../src/features/log/askedGroup';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';
import { theDrawingOfTheSymptoms, theLogProblems } from '../fixtures/theLogSheLandsOn';
import { partsMissing, thePartsOfTheMockup } from '../fixtures/theMockupScreen';
import { theFourWordsDrawnTooLargeOn } from '../fixtures/thePhaseLineSheReads';
import { theDaySheOpensIt, whatTheScreenSheOpensDrew } from '../fixtures/theWeekSheOpensWith';
import {
  herPhoneHoldsNothingForToday,
  herPhoneHoldsTheSymptomsSheMarked,
  theDrawingAfterSheLogged,
  theDrawingBeforeSheLogged,
  theDrawingPlacesTheRow,
  theLineTheDrawingDrafts,
  theNameOf,
  thePartTheDrawingNames,
  theRowIsOnTheScreen,
  theRowSheReads,
  theScreenDownToTheRing,
  theSymptomsNamedIn,
  theSymptomsTheDrawingNames,
  theSymptomsTheRowNames,
  whereTheDrawingSendsTheRow,
} from '../fixtures/whatSheLoggedToday';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the day both drawings of this screen are drawn on. */
const whenSheOpensIt = new Date(`${theDaySheOpensIt}T12:00:00.000Z`);

interface OpenApp {
  readonly pathname: () => string;
  readonly searchParams: () => Record<string, string | string[]>;
}

async function sheOpensEmi(): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname(), searchParams: () => app.getSearchParams() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

describe('she records a symptom and the screen she started on shows it', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring arrives already open, so what a case reads is the shape she is left with and never
    // a frame of the one movement the ring makes.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the two drawings the row is held to', () => {
    it('leaves it off the screen she opens and puts it on the screen she comes back to', () => {
      expect(theDrawingPlacesTheRow(theDrawingBeforeSheLogged)).toBe(false);
      expect(theDrawingPlacesTheRow(theDrawingAfterSheLogged)).toBe(true);
    });

    it('places it under the two round actions, which stand under the ring and its line', () => {
      expect(theScreenDownToTheRing(theDrawingAfterSheLogged).map((part) => part.name)).toEqual([
        'HomeHeader',
        'WeekStrip',
        'CycleRing',
      ]);
      expect(thePartsOfTheMockup('todayLogged').map((part) => part.name)).toEqual([
        'HomeHeader',
        'WeekStrip',
        'CycleRing',
        'PhaseLine',
        'RoundAction',
        'RoundAction',
        thePartTheDrawingNames,
        'BottomNavigation',
        'BottomNavigation',
        'BottomNavigation',
        'BottomNavigation',
      ]);
    });

    it('sends the row to the log opened on the symptom groups', () => {
      expect(whereTheDrawingSendsTheRow()).toBe(theDrawingOfTheSymptoms);
    });

    it('names two symptoms of the catalogue in the line it drafts', () => {
      const named = theSymptomsTheDrawingNames();

      expect(named).toHaveLength(2);
      expect(theLineTheDrawingDrafts()).toContain(theNameOf(String(named[0])));
    });

    it('is refused where it is asked for a drawing this step does not read', () => {
      expect(() => theScreenDownToTheRing('todayEmpty')).toThrow('todayNext and todayLogged');
    });
  });

  describe('the screen she opens before she marked anything today', () => {
    beforeEach(async () => {
      await herPhoneHoldsNothingForToday(whenSheOpensIt);
      await sheOpensEmi();
    });

    it('answers for every part the drawing places down to the ring', () => {
      expect(
        partsMissing(
          theScreenDownToTheRing(theDrawingBeforeSheLogged),
          whatTheScreenSheOpensDrew(),
        ),
      ).toEqual([]);
    });

    it('draws no row at all, rather than a row with nothing under its heading', () => {
      expect(theRowIsOnTheScreen()).toBe(false);
    });
  });

  describe('the screen she comes back to, with what the drawing names marked on today', () => {
    let app: OpenApp;

    beforeEach(async () => {
      await herPhoneHoldsTheSymptomsSheMarked(whenSheOpensIt);
      app = await sheOpensEmi();
    });

    it('answers for every part the drawing places down to the ring', () => {
      expect(
        partsMissing(theScreenDownToTheRing(theDrawingAfterSheLogged), whatTheScreenSheOpensDrew()),
      ).toEqual([]);
    });

    it('draws the row under the ring and its line, where the drawing puts it', () => {
      const drawn = whatTheScreenSheOpensDrew();

      expect(drawn.indexOf(loggedTodayTestID)).toBeGreaterThan(drawn.indexOf(phaseLineTestID));
      expect(drawn.indexOf(loggedTodayTestID)).toBeGreaterThan(drawn.indexOf(cycleRingTestID));
    });

    it('heads the row with the words the catalogue holds for it', () => {
      expect(theRowSheReads().lead).toBe(homeCopy.loggedToday.lead);
    });

    it('names in one line every symptom she marked, and no symptom she did not', () => {
      expect(theSymptomsTheRowNames()).toEqual(theSymptomsTheDrawingNames());
    });

    it('is at least 44 points on both axes, which is contract SEE-3', () => {
      expect(controlsTooSmallToPress([screen.getByTestId(loggedTodayTestID)])).toEqual([]);
      expect(MINIMUM_TAP_TARGET).toBe(44);
    });

    it('draws no word a stranger would read above 14 points, which is contract SCREEN-2', () => {
      expect(theFourWordsDrawnTooLargeOn(screen.toJSON())).toEqual([]);
    });

    it('opens the log on the symptom groups when she presses it', async () => {
      await shePresses(loggedTodayTestID);

      expect(app.pathname()).toBe('/log');
      expect(app.searchParams()[opensOnParameter]).toBe(theSymptoms);
      expect(theLogProblems(theDrawingOfTheSymptoms)).toEqual([]);
    });
  });

  describe('a symptom she marked and then took off again', () => {
    it('leaves no row, because a day holding nothing is a day she logged nothing on', async () => {
      await herPhoneHoldsNothingForToday(whenSheOpensIt);
      await sheOpensEmi();

      const [first] = theSymptomsTheDrawingNames();

      await shePresses(roundActionTestID('symptoms'));
      await shePresses(symptomChipTestID(String(first)));
      await shePresses(symptomChipTestID(String(first)));
      await shePresses(logFlowDoneTestID);

      expect(theRowIsOnTheScreen()).toBe(false);
    });
  });

  describe('what the reader of a line says', () => {
    it('reads a symptom out of a line that names it, whatever case it is written in', () => {
      expect(theSymptomsNamedIn('CRAMPS')).toEqual(['cramps']);
    });

    it('reads nothing out of a line that names none', () => {
      expect(theSymptomsNamedIn('')).toEqual([]);
    });
  });
});
