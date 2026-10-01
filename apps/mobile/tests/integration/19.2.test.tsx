import { join } from 'node:path';

import { phaseLabel } from '@emi/tokens';
import { tabTestID } from '@emi/ui';
import { screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { cycleRingTestID } from '../../src/components/CycleRing';
import { listDayLogs } from '../../src/data/dayLogRepository';
import { cycleCopy, ringSpokenLabel } from '../../src/features/cycle/copy';
import { statedLengthSentence } from '../../src/features/forecast/copy';
import { learningStatedLengthTestID, learningTestID } from '../../src/features/forecast/Learning';
import { homeHeaderTestID } from '../../src/features/home/HomeHeader';
import {
  homeLogTodayTestID,
  homeNoRingLineTestID,
  homeNoRingTestID,
  homeNoRingTitleTestID,
  homeScreenTestID,
} from '../../src/features/home/HomeScreen';
import { homeCopy } from '../../src/features/home/copy';
import { flowOptionTestID, flowPickerTestID } from '../../src/features/log/FlowPicker';
import { logFlowDoneTestID } from '../../src/features/log/LogFlow';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { theVaultOnHerPhone } from '../fixtures/herVault';
import { textIn } from '../fixtures/renderedText';
import {
  type Part,
  partsMissing,
  theIdentifiersDrawn,
  thePartsOfTheMockup,
} from '../fixtures/theMockupScreen';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any change of the clocks, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** The drawing this step builds: the screen she opens on day one, before she recorded anything. */
const theDrawing = 'todayEmpty';

/**
 * The length she gave at her first run. It is deliberately not the length Emi would count by on
 * its own, so a card reading the wrong one names 28 and the case can say which number it read.
 */
const sheSaidHerCycleRuns = defaultCycleLengthDays + 1;

/** Her phone on day one: the answers of her first run, and not one recorded day. */
async function sheOpensEmiOnDayOne(): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, [], sheSaidHerCycleRuns);
  await renderRouter(appDirectory, { initialUrl: '/' });
}

/**
 * What each part of the drawing is built under, in the drawing's order.
 *
 * Every part of this drawing is built, which is what finishes it: the two lines and the card were
 * already there, and the way to log today is what this step adds. So nothing here is owed to
 * another step, unlike the drawing of the sections underneath it.
 */
function theDrawingPlaces(): Part[] {
  return [
    { builtUnder: [homeHeaderTestID], name: 'HomeHeader' },
    { builtUnder: [homeNoRingTitleTestID], name: 'Text' },
    { builtUnder: [homeNoRingLineTestID], name: 'Text' },
    { builtUnder: [learningTestID], name: 'Learning' },
    { builtUnder: [homeLogTodayTestID], name: 'PrimaryButton' },
    { builtUnder: [tabTestID('index')], name: 'BottomNavigation' },
    { builtUnder: [tabTestID('log/index')], name: 'BottomNavigation' },
    { builtUnder: [tabTestID('history')], name: 'BottomNavigation' },
    { builtUnder: [tabTestID('settings/index')], name: 'BottomNavigation' },
  ];
}

/** What the one button says, read off the glass rather than off the label handed to it. */
function whatTheButtonSays(): string[] {
  return textIn(screen.getByTestId(homeLogTodayTestID));
}

/** What the ring says about the day she is on, read off the ring and not off the arithmetic. */
function theRingSays(): string {
  return String(screen.getByTestId(cycleRingTestID).props.accessibilityLabel);
}

describe('day one says what the ring needs and the first period she logs draws it', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    // The ring's one movement belongs to step 2.4. Here the ring the walk ends on arrives already
    // open, so what a case reads off it is the cycle and never a frame of an animation.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the screen she opens on a phone that holds nothing', () => {
    beforeEach(async () => {
      await sheOpensEmiOnDayOne();
    });

    it('draws no ring, and the drawing of day one places none either', () => {
      expect(screen.queryByTestId(cycleRingTestID)).toBeNull();
      expect(thePartsOfTheMockup(theDrawing).map((part) => part.name)).not.toContain('CycleRing');
      expect(screen.getByTestId(homeNoRingTestID)).toBeTruthy();
    });

    it('says there is nothing to draw yet, and what the ring needs before it can be drawn', () => {
      expect(textIn(screen.getByTestId(homeNoRingTitleTestID))).toEqual([cycleCopy.noRing.title]);
      expect(textIn(screen.getByTestId(homeNoRingLineTestID))).toEqual([cycleCopy.noRing.line]);
    });

    it('offers one way to log today, and it is the only one of it on the screen', () => {
      expect(whatTheButtonSays()).toEqual([homeCopy.logToday]);
      expect(screen.queryAllByTestId(homeLogTodayTestID)).toHaveLength(1);
    });

    it('counts the cycle length she gave at her first run, and never the length Emi would pick', () => {
      const said = textIn(screen.getByTestId(learningStatedLengthTestID)).join(' ');

      expect(said).toBe(statedLengthSentence(sheSaidHerCycleRuns));
      expect(said).toContain(String(sheSaidHerCycleRuns));
      expect(said).not.toContain(String(defaultCycleLengthDays));
    });

    it('is held to the parts the drawing places, in the drawing order, and to no other list', () => {
      expect(thePartsOfTheMockup(theDrawing).map((part) => part.name)).toEqual(
        theDrawingPlaces().map((part) => part.name),
      );
    });

    it('answers for every part of the drawing, in the order the drawing places them', () => {
      expect(partsMissing(theDrawingPlaces(), theIdentifiersDrawn())).toEqual([]);
      expect(theDrawingPlaces()).toHaveLength(9);
    });

    it('puts the way to log today under everything she reads, which is last in the body', () => {
      const drawn = theIdentifiersDrawn();
      const button = drawn.indexOf(homeLogTodayTestID);

      expect(button).toBeGreaterThan(drawn.indexOf(learningTestID));
      expect(drawn.slice(0, button)).toContain(homeNoRingLineTestID);
    });
  });

  describe('the first period she logs from that screen', () => {
    beforeEach(async () => {
      await sheOpensEmiOnDayOne();
      await fireEvent.press(screen.getByTestId(homeLogTodayTestID));
    });

    it('puts her on the log, at the flow options, in one press', () => {
      expect(screen.getByTestId(flowPickerTestID)).toBeTruthy();
    });

    it('draws the ring from the day she logged once she comes back', async () => {
      await fireEvent.press(screen.getByTestId(flowOptionTestID('medium')));
      await fireEvent.press(screen.getByTestId(logFlowDoneTestID));

      expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
      expect(theRingSays()).toBe(ringSpokenLabel(1, sheSaidHerCycleRuns, phaseLabel.period));
    });

    it('takes the two lines and the way to log today off the screen she comes back to', async () => {
      await fireEvent.press(screen.getByTestId(flowOptionTestID('medium')));
      await fireEvent.press(screen.getByTestId(logFlowDoneTestID));

      for (const gone of [homeNoRingTestID, homeNoRingTitleTestID, homeNoRingLineTestID]) {
        expect(screen.queryByTestId(gone)).toBeNull();
      }

      expect(screen.queryByTestId(homeLogTodayTestID)).toBeNull();
    });

    it('keeps that one day on her phone, which is the day the ring was drawn from', async () => {
      await fireEvent.press(screen.getByTestId(flowOptionTestID('medium')));
      await fireEvent.press(screen.getByTestId(logFlowDoneTestID));

      const vault = await theVaultOnHerPhone();
      const rows = listDayLogs(herDatabase());


      expect(rows.map((row) => row.day)).toEqual([today]);
      expect(rows.map((row) => vault.open(row.payload).flow)).toEqual(['medium']);
    });
  });
});
