import { join } from 'node:path';

import { symptomGroups } from '@emi/cycle';
import { tabTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { roundActionTestID } from '../../src/features/home/HomeScreen';
import { opensOnParameter, theSymptoms } from '../../src/features/log/askedGroup';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import {
  theDrawingOfTheFlow,
  theDrawingOfTheSymptoms,
  theFlowPickerIsOnTheLog,
  theGroupsTheLogDrew,
  theLogProblems,
  theLogProblemsIn,
  builtUnder,
  theDrawingPlaces,
  whatTheDrawingOpensOn,
} from '../fixtures/theLogSheLandsOn';
import {
  herPhoneHoldsFourRecordedPeriodDays,
  theDaySheOpensIt,
} from '../fixtures/theWeekSheOpensWith';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on her fourth period day, which is the day the drawing of the home screen is drawn on. */
const whenSheOpensIt = new Date(`${theDaySheOpensIt}T12:00:00.000Z`);

interface OpenApp {
  readonly pathname: () => string;
  readonly searchParams: () => Record<string, string | string[]>;
}

async function sheOpensEmi(): Promise<OpenApp> {
  await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensIt);

  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname(), searchParams: () => app.getSearchParams() };
}

describe('the symptoms action opens the log on the groups and the dock still opens on the flows', () => {
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

  describe('the two drawings the log is held to', () => {
    it('opens the drawing of the symptoms on the groups, and places no flow picker in it', () => {
      expect(whatTheDrawingOpensOn(theDrawingOfTheSymptoms)).toBe('symptoms');
      expect(theDrawingPlaces(theDrawingOfTheSymptoms, 'symptoms')).toBe(true);
      expect(theDrawingPlaces(theDrawingOfTheSymptoms, 'flow')).toBe(false);
    });

    it('opens the drawing of the log on the flow picker, with the groups after it', () => {
      expect(whatTheDrawingOpensOn(theDrawingOfTheFlow)).toBe('flow');
      expect(theDrawingPlaces(theDrawingOfTheFlow, 'symptoms')).toBe(true);
    });

    it('says what each of the two is built under', () => {
      expect(builtUnder('symptoms')).toHaveLength(symptomGroups.length);
      expect(builtUnder('flow')).not.toHaveLength(0);
    });
  });

  describe('the press she makes to mark a headache', () => {
    let app: OpenApp;

    beforeEach(async () => {
      app = await sheOpensEmi();

      await fireEvent.press(screen.getByTestId(roundActionTestID('symptoms')));
    });

    it('puts her on the log, with the symptom groups above the flow picker', () => {
      expect(app.pathname()).toBe('/log');
      expect(theLogProblems(theDrawingOfTheSymptoms)).toEqual([]);
    });

    it('asks for the log by an address that says it opens on the symptoms', () => {
      expect(app.searchParams()[opensOnParameter]).toBe(theSymptoms);
    });

    it('offers every group, so nothing she can record moved', () => {
      expect(theGroupsTheLogDrew()).toHaveLength(symptomGroups.length);
    });

    it('leaves the flow picker on the screen, so a flow is still one press from here', () => {
      expect(theFlowPickerIsOnTheLog()).toBe(true);
    });
  });

  describe('the Log column of the dock', () => {
    it('still opens the log on the flow picker, which is the drawing of the log', async () => {
      const app = await sheOpensEmi();

      await fireEvent.press(screen.getByTestId(tabTestID('log/index')));

      expect(app.pathname()).toBe('/log');
      expect(app.searchParams()[opensOnParameter]).toBeUndefined();
      expect(theLogProblems(theDrawingOfTheFlow)).toEqual([]);
    });
  });

  describe('what the comparison says when the screen and the drawing differ', () => {
    it('names the part it expected first, where the flow picker is drawn first', () => {
      const [aGroup] = builtUnder('symptoms');
      const [aPicker] = builtUnder('flow');

      expect(theLogProblemsIn('symptoms', [String(aPicker), String(aGroup)])).toEqual([
        'the drawing opens on the symptom groups and the screen opens on the flow picker',
      ]);
    });

    it('names what it wanted, where the screen draws neither of the two', () => {
      expect(theLogProblemsIn('symptoms', ['log-flow-done'])).toEqual([
        'the drawing opens on the symptom groups and the screen draws neither of them',
      ]);
    });

    it('refuses a drawing that places neither of them, rather than reading it as a match', () => {
      expect(() => whatTheDrawingOpensOn('todayNext')).toThrow(
        'places neither a symptom group nor the flow picker',
      );
    });
  });
});
