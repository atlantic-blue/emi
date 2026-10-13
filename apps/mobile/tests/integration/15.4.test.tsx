import { join } from 'node:path';

import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { tabTestID } from '@emi/ui';
import { screen, within } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID } from '../../src/components/CycleRing';
import {
  homeForecastTestID,
  roundActionTestID,
  roundActions,
} from '../../src/features/home/HomeScreen';
import { flowPickerTestID } from '../../src/features/log/FlowPicker';
import { unexpectedBleedingTestID } from '../../src/features/log/UnexpectedBleeding';
import { periodPageDayTestID, periodPageTestID } from '../../src/features/period/PeriodPage';
import { periodDayLabel } from '../../src/features/period/copy';
import { phasePageTestID } from '../../src/features/phase/PhasePage';
import { sexDayHeading } from '../../src/features/sex/copy';
import { sexPageDayTestID, sexPageTestID } from '../../src/features/sex/SexPage';
import { settingsExportTestID } from '../../src/features/settings/SettingsScreen';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { theDrawingOfTheFlow, theLogProblems } from '../fixtures/theLogSheLandsOn';
import { partsMissing } from '../fixtures/theMockupScreen';
import {
  roundActionProblems,
  roundActionProblemsIn,
  roundActionsTooSmallToPress,
  theActionTheDrawingSendsTo,
  theActionsTheBoardReplaced,
  theDrawingActionsAccountedFor,
  theRoundActionsOfTheBoard,
  theRoundActionsOfTheDrawing,
  theRoundActionsOnTheGlass,
  theRoundActionsTheBoardAsksFor,
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
  readonly searchParams: () => Record<string, string | string[] | undefined>;
}

async function sheOpensEmi(): Promise<OpenApp> {
  await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensIt);

  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return {
    pathname: () => app.getPathname(),
    searchParams: () => app.getSearchParams(),
  };
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
        'CycleRing',
        'PhaseLine',
        'RoundAction',
        'RoundAction',
      ]);
      expect(parts[4]?.builtUnder).toContain(roundActionTestID('period'));
    });

    it('builds Period from the drawing, and records that the board replaces Symptoms', () => {
      expect(theDrawingActionsAccountedFor()).toEqual([
        roundActionTestID('period'),
        theActionsTheBoardReplaced['logSymptoms'],
      ]);
      expect(Object.values(theActionTheDrawingSendsTo)).toEqual(['period']);
    });
  });

  describe('the board the actions are held to', () => {
    it('places Sex, Period and Cycle phase, in that order, and the product builds those three', () => {
      expect(theRoundActionsOfTheBoard).toEqual(['sex', 'period', 'phase']);
      expect([...roundActions]).toEqual([...theRoundActionsOfTheBoard]);
      expect(theRoundActionsTheBoardAsksFor()).toEqual([
        roundActionTestID('sex'),
        roundActionTestID('period'),
        roundActionTestID('phase'),
      ]);
    });
  });

  describe('the screen she opens', () => {
    beforeEach(async () => {
      await sheOpensEmi();
    });

    it('answers for every part the drawing places down to its second action, but the strip the calendar button replaced', () => {
      // The todayPhases board takes the strip off Today, so the strip is the one departure, and
      // theTodayLook.tsx records it with its reason.
      expect(partsMissing(theScreenDownToTheRoundActions(), whatTheScreenSheOpensDrew())).toEqual([
        'the drawing names WeekStrip, and nothing says which test identifier it is built under',
      ]);
    });

    it('draws the three the board places, in its order and no more of them', () => {
      expect(roundActionProblems()).toEqual([]);
      expect(theRoundActionsOnTheGlass()).toEqual([
        roundActionTestID('sex'),
        roundActionTestID('period'),
        roundActionTestID('phase'),
      ]);
    });

    it('labels them Sex, Period and Cycle phase', () => {
      const labels = ['Sex', 'Period', 'Cycle phase'];

      theRoundActionsOnTheGlass().forEach((identifier, at) => {
        expect(within(screen.getByTestId(identifier)).getByText(String(labels[at]))).toBeTruthy();
      });
    });

    it('draws no Symptoms action, because the board moves it to the Cycle phase page', () => {
      // Named as the string it was drawn under, because the name left the product with it.
      expect(screen.queryByTestId('home-round-action-symptoms')).toBeNull();
      expect(screen.queryByText('Symptoms')).toBeNull();
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

  describe('each press she makes', () => {
    it('opens the Sex page of today from Sex', async () => {
      const app = await sheOpensEmi();

      await fireEvent.press(screen.getByTestId(roundActionTestID('sex')));

      expect(app.pathname()).toBe('/sex');
      expect(app.searchParams()['day']).toBeUndefined();
      expect(screen.getByTestId(sexPageTestID)).toBeTruthy();
      expect(screen.getByTestId(sexPageDayTestID)).toHaveTextContent(
        sexDayHeading(theDaySheOpensIt),
      );
    });

    it('opens the Period page of today from Period, and no longer the log', async () => {
      const app = await sheOpensEmi();

      await fireEvent.press(screen.getByTestId(roundActionTestID('period')));

      expect(app.pathname()).toBe('/period');
      expect(app.searchParams()['day']).toBeUndefined();
      expect(screen.getByTestId(periodPageTestID)).toBeTruthy();
      expect(screen.getByTestId(periodPageDayTestID)).toHaveTextContent(
        periodDayLabel(theDaySheOpensIt),
      );
      expect(screen.queryByTestId(flowPickerTestID)).toBeNull();
    });

    it('opens the Cycle phase page from Cycle phase', async () => {
      const app = await sheOpensEmi();

      await fireEvent.press(screen.getByTestId(roundActionTestID('phase')));

      expect(app.pathname()).toBe('/phase');
      expect(screen.getByTestId(phasePageTestID)).toBeTruthy();
    });

    it('still reaches the flow picker and the mark for a bleed that was not her period from the Log column', async () => {
      // The Period action used to open the log at the flow picker. The Period page has the flow,
      // and the log keeps the picker and the mark, so no way forward is lost.
      const app = await sheOpensEmi();

      await fireEvent.press(screen.getByTestId(tabTestID('log/index')));

      expect(app.pathname()).toBe('/log');
      expect(theLogProblems(theDrawingOfTheFlow)).toEqual([]);
      expect(screen.getByTestId(flowPickerTestID)).toBeTruthy();
      expect(screen.getByTestId(unexpectedBleedingTestID)).toBeTruthy();
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

  describe('what the comparison says when the screen and the board differ', () => {
    it('names both counts, where a third action is drawn', async () => {
      await sheOpensEmi();

      const asked = theRoundActionsTheBoardAsksFor();
      const withAFourth = [...theRoundActionsOnTheGlass(), 'home-round-action-symptoms'];

      expect(roundActionProblemsIn(asked, withAFourth)).toEqual([
        'the board places 3 round action(s) and the screen draws 4',
      ]);
    });

    it('names the action it expected, where the row is drawn the other way round', async () => {
      await sheOpensEmi();

      const asked = theRoundActionsTheBoardAsksFor();
      const swapped = [...theRoundActionsOnTheGlass()].reverse();

      expect(roundActionProblemsIn(asked, swapped)).toEqual([
        `the board places ${roundActionTestID('sex')} at 1 and the screen draws ${roundActionTestID('phase')}`,
        `the board places ${roundActionTestID('phase')} at 3 and the screen draws ${roundActionTestID('sex')}`,
      ]);
    });

    it('refuses a drawing that places no round action, rather than passing it', () => {
      expect(() => roundActionProblemsIn([], [])).toThrow('can refuse nothing');
    });
  });
});
