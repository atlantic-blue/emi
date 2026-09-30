import { join } from 'node:path';

import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { tabTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID } from '../../src/components/CycleRing';
import {
  homeForecastTestID,
  roundActionTestID,
  roundActions,
} from '../../src/features/home/HomeScreen';
import { flowPickerTestID } from '../../src/features/log/FlowPicker';
import { settingsExportTestID } from '../../src/features/settings/SettingsScreen';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { partsMissing } from '../fixtures/theMockupScreen';
import {
  roundActionProblems,
  roundActionProblemsIn,
  roundActionsTooSmallToPress,
  theActionTheDrawingSendsTo,
  theRoundActionsOfTheDrawing,
  theRoundActionsOnTheGlass,
  theRoundActionsTheDrawingAsksFor,
  theScreenDownToTheRoundActions,
} from '../fixtures/theRoundActionsUnderTheRing';
import {
  herPhoneHoldsFourRecordedPeriodDays,
  theDaySheOpensIt,
  whatTheScreenSheOpensDrew,
} from '../fixtures/theWeekSheOpensWith';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on her fourth period day, which is the day the drawing of this screen is drawn on. */
const whenSheOpensIt = new Date(`${theDaySheOpensIt}T12:00:00.000Z`);

/** What the button and the three links were drawn under before this step took them off. */
const theWaysOffTheScreenSheHad = [
  'home-log-today',
  'home-history',
  'home-export',
  'home-settings',
];

interface OpenApp {
  readonly pathname: () => string;
}

async function sheOpensEmi(): Promise<OpenApp> {
  await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensIt);

  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname() };
}

describe('she starts a log from the screen she opens in one press', () => {
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

  describe('the drawing the actions are held to', () => {
    it('places two of them, one reaching the log and one reaching the symptom groups', () => {
      expect(theRoundActionsOfTheDrawing()).toEqual(['log', 'logSymptoms']);
    });

    it('places them after the ring, and says what each one is built under', () => {
      const parts = theScreenDownToTheRoundActions();
      const names = parts.map((part) => part.name);

      expect(names).toEqual([
        'HomeHeader',
        'WeekStrip',
        'PhaseLine',
        'CycleRing',
        'RoundAction',
        'RoundAction',
      ]);
      expect(parts[4]?.builtUnder).toContain(roundActionTestID('period'));
    });

    it('asks for the two the product builds, in its own order', () => {
      expect(theRoundActionsTheDrawingAsksFor()).toEqual([
        roundActionTestID('period'),
        roundActionTestID('symptoms'),
      ]);
      expect(Object.values(theActionTheDrawingSendsTo).sort()).toEqual([...roundActions].sort());
    });
  });

  describe('the screen she opens', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('answers for every part the drawing places down to the second action', () => {
      expect(partsMissing(theScreenDownToTheRoundActions(), whatTheScreenSheOpensDrew())).toEqual(
        [],
      );
    });

    it('draws the two the drawing places, in its order and no more of them', () => {
      expect(roundActionProblems()).toEqual([]);
      expect(theRoundActionsOnTheGlass()).toEqual([
        roundActionTestID('period'),
        roundActionTestID('symptoms'),
      ]);
    });

    it('draws them between the ring and the forecast, where the drawing puts them', () => {
      const drawn = whatTheScreenSheOpensDrew();

      for (const action of theRoundActionsOnTheGlass()) {
        expect(drawn.indexOf(action)).toBeGreaterThan(drawn.indexOf(cycleRingTestID));
        expect(drawn.indexOf(action)).toBeLessThan(drawn.indexOf(homeForecastTestID));
      }
    });

    it('draws each of them at least 44 points on both axes, which is contract SEE-3', () => {
      expect(roundActionsTooSmallToPress()).toEqual([]);
      expect(MINIMUM_TAP_TARGET).toBe(44);
    });

    it('carries no Log today button and no link to the history, the export or the settings', () => {
      // Each one is named as the string it was drawn under rather than through a constant, because
      // the constants went with them and the way off an interface is tested too.
      for (const gone of theWaysOffTheScreenSheHad) {
        expect(screen.queryByTestId(gone)).toBeNull();
      }
    });
  });

  describe('the press she makes every day', () => {
    it('puts her on the log, at the flow picker', async () => {
      const app = await sheOpensEmi();

      await fireEvent.press(screen.getByTestId(roundActionTestID('period')));

      expect(app.pathname()).toBe('/log');
      expect(screen.getByTestId(flowPickerTestID)).toBeTruthy();
    });

    it('takes the symptoms action to the log too, until step 5 points it at the groups', async () => {
      const app = await sheOpensEmi();

      await fireEvent.press(screen.getByTestId(roundActionTestID('symptoms')));

      expect(app.pathname()).toBe('/log');
      expect(screen.getByTestId(flowPickerTestID)).toBeTruthy();
    });
  });

  describe('what she could reach before, and can still reach', () => {
    it('reads her history from the dock, where the link used to be on this screen', async () => {
      const app = await sheOpensEmi();

      await fireEvent.press(screen.getByTestId(tabTestID('history')));

      expect(app.pathname()).toBe('/history');
    });

    it('reads the privacy screen from the dock, and the export is a row of it', async () => {
      const app = await sheOpensEmi();

      await fireEvent.press(screen.getByTestId(tabTestID('settings/index')));

      expect(app.pathname()).toBe('/settings');
      expect(screen.getByTestId(settingsExportTestID)).toBeTruthy();
    });
  });

  describe('what the comparison says when the screen and the drawing differ', () => {
    it('names both counts, where a third action is drawn', async () => {
      await sheOpensEmi();

      const asked = theRoundActionsTheDrawingAsksFor();
      const withAThird = [...theRoundActionsOnTheGlass(), 'home-round-action-intimacy'];

      expect(roundActionProblemsIn(asked, withAThird)).toEqual([
        'the drawing places 2 round action(s) and the screen draws 3',
      ]);
    });

    it('names the action it expected, where the two are drawn the other way round', async () => {
      await sheOpensEmi();

      const asked = theRoundActionsTheDrawingAsksFor();
      const swapped = [...theRoundActionsOnTheGlass()].reverse();

      expect(roundActionProblemsIn(asked, swapped)).toEqual([
        `the drawing places ${roundActionTestID('period')} at 1 and the screen draws ${roundActionTestID('symptoms')}`,
        `the drawing places ${roundActionTestID('symptoms')} at 2 and the screen draws ${roundActionTestID('period')}`,
      ]);
    });

    it('refuses a drawing that places no round action, rather than passing it', () => {
      expect(() => roundActionProblemsIn([], [])).toThrow('can refuse nothing');
    });
  });
});
