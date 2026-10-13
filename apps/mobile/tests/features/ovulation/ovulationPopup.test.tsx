import { join } from 'node:path';

import { type DayRecord, ovulationSignValues } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../../src/data/cycleRepository';
import { readDayLog } from '../../../src/data/dayLogRepository';
import { isFertileOn, theFertileWindowOn } from '../../../src/features/calendar/herMonthPhases';
import { recordedDays } from '../../../src/features/cycle/rebuild';
import type { RingInputFrom } from '../../../src/features/cycle/ringInput';
import { forecastOf } from '../../../src/features/forecast/fromCache';
import { homeScreenTestID } from '../../../src/features/home/HomeScreen';
import {
  isASwipeDown,
  ovulationPopupLineTestID,
  ovulationPopupNotNowTestID,
  ovulationPopupSaveTestID,
  ovulationPopupShadeTestID,
  ovulationPopupTestID,
  ovulationPopupTitleTestID,
  ovulationPopupWindowTestID,
  ovulationSignTestID,
} from '../../../src/features/ovulation/OvulationPopup';
import { fertileWindowLabel } from '../../../src/features/ovulation/copy';
import { signsAfterPress } from '../../../src/features/ovulation/signs';
import { catalogueOf } from '../../../src/language/words';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import {
  aBleedingDay,
  dayOf,
  herDatabase,
  herPhoneHoldsTheseAnswers,
} from '../../fixtures/herPhone';
import { herVault } from '../../fixtures/herVault';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * The signs of ovulation popup, from the ovulationPopup board (issue 272): a sheet over Today on a
 * day inside the forecast fertile window, at most once a day, and her answer saved to that day.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

/** A Monday. */
const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const theCycle = 28;

/** Period starts one cycle apart, so that today is the given day of the last of them. */
function herPeriodStarts(cycleDay: number, starts: number): DayRecord[] {
  const started = addDays(today, -(cycleDay - 1));

  return Array.from({ length: starts }, (_, index) =>
    aBleedingDay(addDays(started, -(starts - 1 - index) * theCycle)),
  );
}

/** Three starts make two complete cycles, which is when Emi has a forecast. */
const withAForecast = 3;
/** Two starts make one complete cycle, so Emi is still learning and has no forecast. */
const withNoForecast = 2;
/** A cycle day inside the fertile window of a 28 day cycle, and one well outside it. */
const insideTheWindow = 12;
const outsideTheWindow = 3;

async function herPhoneHolds(records: readonly DayRecord[]): Promise<void> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: theCycle,
      periodLengthDays: 5,
      name: 'Maria',
      recordedAt: whenSheOpensIt.toISOString(),
    },
    records,
  );
}

async function sheOpensToday(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await screen.findByTestId(homeScreenTestID);
}

function herReading(on: string = today): RingInputFrom {
  return {
    cycles: listCycles(herDatabase()),
    records: recordedDays(herDatabase(), herVault().open),
    today: on,
    statedCycleLengthDays: theCycle,
    statedPeriodLengthDays: 5,
  };
}

function theDayOnHerPhone(day: string = today): DayRecord | undefined {
  const held = readDayLog(herDatabase(), day);

  return held === undefined ? undefined : herVault().open(held.payload);
}

function isChosen(testID: string): boolean {
  return screen.getByTestId(testID).props.accessibilityState?.selected === true;
}

function saveIsReady(): boolean {
  return screen.getByTestId(ovulationPopupSaveTestID).props.accessibilityState?.disabled !== true;
}

async function press(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  resetExpoSqlite();
  resetExpoSecureStore();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('when the popup shows', () => {
  it('should show over Today on a day inside the forecast fertile window', async () => {
    await herPhoneHolds(herPeriodStarts(insideTheWindow, withAForecast));
    await sheOpensToday();

    expect(forecastOf(herReading().cycles, theCycle).kind).toBe('forecast');
    expect(isFertileOn(herReading(), today)).toBe(true);
    expect(screen.getByTestId(ovulationPopupTestID)).toBeTruthy();
    expect(screen.getByTestId(homeScreenTestID)).toBeTruthy();
  });

  it('should not show on a day outside the fertile window', async () => {
    await herPhoneHolds(herPeriodStarts(outsideTheWindow, withAForecast));
    await sheOpensToday();

    expect(isFertileOn(herReading(), today)).toBe(false);
    expect(screen.queryByTestId(ovulationPopupTestID)).toBeNull();
  });

  it('should not show before a forecast exists, even inside the window Emi is learning', async () => {
    await herPhoneHolds(herPeriodStarts(insideTheWindow, withNoForecast));
    await sheOpensToday();

    expect(forecastOf(herReading().cycles, theCycle).kind).not.toBe('forecast');
    expect(isFertileOn(herReading(), today)).toBe(true);
    expect(screen.queryByTestId(ovulationPopupTestID)).toBeNull();
  });

  it('should not show with no period recorded at all', async () => {
    await herPhoneHolds([]);
    await sheOpensToday();

    expect(screen.queryByTestId(ovulationPopupTestID)).toBeNull();
  });
});

describe('what the popup says', () => {
  it('should carry the label, the question, the line and the seven signs of the board', async () => {
    await herPhoneHolds(herPeriodStarts(insideTheWindow, withAForecast));
    await sheOpensToday();
    const window = theFertileWindowOn(herReading(), today);

    expect(window).toEqual({ from: '2026-10-11', to: '2026-10-17' });
    expect(screen.getByTestId(ovulationPopupWindowTestID)).toHaveTextContent(
      'Fertile window, 11 to 17 October',
    );
    expect(screen.getByTestId(ovulationPopupTitleTestID)).toHaveTextContent(
      'Did you notice any signs of ovulation?',
    );
    expect(screen.getByTestId(ovulationPopupLineTestID)).toHaveTextContent(
      'Emi keeps what you notice with today, and it goes in your export. Choose all that apply.',
    );
    for (const label of [
      'Egg white discharge',
      'Pain on one side',
      'Tender breasts',
      'Higher sex drive',
      'Positive ovulation test',
      'Higher temperature',
      'Nothing yet',
      'Save',
      'Not now',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('should name both months when the window runs into the next one', () => {
    expect(fertileWindowLabel({ from: '2026-10-29', to: '2026-11-04' })).toBe(
      'Fertile window, 29 October to 4 November',
    );
  });

  it('should not promise that the signs move the forecast, in any language', () => {
    for (const language of ['en', 'es', 'ru'] as const) {
      const line = String(catalogueOf(language)['ovulation.popup.line']);

      expect(line).not.toMatch(/place ovulation|next cycle|próximo ciclo|следующ/i);
      expect(line).toContain('Emi');
    }
  });

  it('should hold every word of the popup in Spanish and Russian', () => {
    const english = Object.keys(catalogueOf('en')).filter((key) => key.startsWith('ovulation.'));

    expect(english).toHaveLength(13);
    for (const language of ['es', 'ru'] as const) {
      for (const key of english) {
        const said = catalogueOf(language)[key as keyof ReturnType<typeof catalogueOf>];

        expect(typeof said === 'string' && said.length > 0).toBe(true);
        expect(said).not.toBe(catalogueOf('en')[key as keyof ReturnType<typeof catalogueOf>]);
      }
    }
  });
});

describe('the signs she picks', () => {
  it('should let her pick several signs, and keep Save waiting until she picks one', async () => {
    await herPhoneHolds(herPeriodStarts(insideTheWindow, withAForecast));
    await sheOpensToday();

    expect(saveIsReady()).toBe(false);
    await press(ovulationSignTestID('egg-white-discharge'));
    await press(ovulationSignTestID('higher-sex-drive'));

    expect(isChosen(ovulationSignTestID('egg-white-discharge'))).toBe(true);
    expect(isChosen(ovulationSignTestID('higher-sex-drive'))).toBe(true);
    expect(saveIsReady()).toBe(true);
  });

  it('should keep "Nothing yet" alone', async () => {
    await herPhoneHolds(herPeriodStarts(insideTheWindow, withAForecast));
    await sheOpensToday();

    await press(ovulationSignTestID('tender-breasts'));
    await press(ovulationSignTestID('nothing-yet'));

    expect(isChosen(ovulationSignTestID('nothing-yet'))).toBe(true);
    expect(isChosen(ovulationSignTestID('tender-breasts'))).toBe(false);

    await press(ovulationSignTestID('pain-on-one-side'));

    expect(isChosen(ovulationSignTestID('nothing-yet'))).toBe(false);
    expect(isChosen(ovulationSignTestID('pain-on-one-side'))).toBe(true);
  });

  it('should take a sign off on a second press', () => {
    expect(signsAfterPress(['tender-breasts'], 'tender-breasts')).toEqual([]);
    expect(signsAfterPress([], 'nothing-yet')).toEqual(['nothing-yet']);
    expect(signsAfterPress(['nothing-yet'], 'higher-temperature')).toEqual(['higher-temperature']);
    expect(ovulationSignValues).toHaveLength(7);
  });
});

describe('her answer', () => {
  it('should save the signs to today, sealed, beside what the day held, and close the popup', async () => {
    await herPhoneHolds([
      ...herPeriodStarts(insideTheWindow, withAForecast),
      { day: today, symptoms: ['bloating'], recordedAt: whenSheOpensIt.toISOString() },
    ]);
    await sheOpensToday();

    await press(ovulationSignTestID('egg-white-discharge'));
    await press(ovulationSignTestID('positive-ovulation-test'));
    await press(ovulationPopupSaveTestID);

    const held = readDayLog(herDatabase(), today);
    expect(new TextDecoder().decode(held?.payload)).not.toContain('egg-white');
    expect(theDayOnHerPhone()).toMatchObject({
      symptoms: ['bloating'],
      ovulationSigns: ['egg-white-discharge', 'positive-ovulation-test'],
      ovulationPopup: 'answered',
    });
    expect(screen.queryByTestId(ovulationPopupTestID)).toBeNull();
  });

  it('should save "Nothing yet" alone as her answer', async () => {
    await herPhoneHolds(herPeriodStarts(insideTheWindow, withAForecast));
    await sheOpensToday();

    await press(ovulationSignTestID('nothing-yet'));
    await press(ovulationPopupSaveTestID);

    expect(theDayOnHerPhone()).toMatchObject({
      ovulationSigns: ['nothing-yet'],
      ovulationPopup: 'answered',
    });
  });

  it('should record "Not now" as dismissed, with no signs, and close the popup', async () => {
    await herPhoneHolds(herPeriodStarts(insideTheWindow, withAForecast));
    await sheOpensToday();

    await press(ovulationSignTestID('tender-breasts'));
    await press(ovulationPopupNotNowTestID);

    expect(theDayOnHerPhone()?.ovulationPopup).toBe('dismissed');
    expect(theDayOnHerPhone()).not.toHaveProperty('ovulationSigns');
    expect(screen.queryByTestId(ovulationPopupTestID)).toBeNull();
  });

  it('should record a press above the sheet as dismissed', async () => {
    await herPhoneHolds(herPeriodStarts(insideTheWindow, withAForecast));
    await sheOpensToday();

    // The sheet is modal to a screen reader, so the shade above it is a press for the eye only.
    await fireEvent.press(
      screen.getByTestId(ovulationPopupShadeTestID, { includeHiddenElements: true }),
    );

    expect(theDayOnHerPhone()?.ovulationPopup).toBe('dismissed');
  });

  it('should read a drag down as a swipe that closes, and a small or upward drag as not', () => {
    expect(isASwipeDown({ dy: 120, vy: 0.1 })).toBe(true);
    expect(isASwipeDown({ dy: 30, vy: 1.2 })).toBe(true);
    expect(isASwipeDown({ dy: 30, vy: 0.1 })).toBe(false);
    expect(isASwipeDown({ dy: -120, vy: -1.2 })).toBe(false);
  });
});

describe('once a day', () => {
  it('should not show again on the same day after she answered', async () => {
    await herPhoneHolds(herPeriodStarts(insideTheWindow, withAForecast));
    await sheOpensToday();
    await press(ovulationSignTestID('higher-temperature'));
    await press(ovulationPopupSaveTestID);

    await sheOpensToday();

    expect(screen.queryByTestId(ovulationPopupTestID)).toBeNull();
  });

  it('should not show again on the same day after she closed it', async () => {
    await herPhoneHolds(herPeriodStarts(insideTheWindow, withAForecast));
    await sheOpensToday();
    await press(ovulationPopupNotNowTestID);

    await sheOpensToday();

    expect(screen.queryByTestId(ovulationPopupTestID)).toBeNull();
  });

  it('should show again the next day while she is still in the window', async () => {
    const yesterday = addDays(today, -1);
    await herPhoneHolds([
      ...herPeriodStarts(insideTheWindow, withAForecast),
      { day: yesterday, ovulationPopup: 'dismissed', recordedAt: `${yesterday}T09:00:00.000Z` },
    ]);
    await sheOpensToday();

    expect(isFertileOn(herReading(yesterday), yesterday)).toBe(true);
    expect(theDayOnHerPhone(yesterday)?.ovulationPopup).toBe('dismissed');
    expect(screen.getByTestId(ovulationPopupTestID)).toBeTruthy();
  });
});
