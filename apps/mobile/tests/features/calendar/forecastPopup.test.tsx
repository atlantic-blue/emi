import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { StyleSheet, type ViewStyle } from 'react-native';

import { listDayLogs } from '../../../src/data/dayLogRepository';
import { databaseFileName, expoDatabase } from '../../../src/data/expoDatabase';
import { readSetting, writeSetting } from '../../../src/data/settingRepository';
import { calendarLaterTestID } from '../../../src/features/calendar/CalendarScreen';
import { dateDiscTestID } from '../../../src/features/calendar/CycleMonth';
import {
  forecastPopupActionTestID,
  forecastPopupEyebrowTestID,
  forecastPopupLineTestID,
  forecastPopupNotNowTestID,
  forecastPopupTestID,
  forecastPopupTitleTestID,
} from '../../../src/features/calendar/ForecastPopup';
import { forecastIsMissingFor } from '../../../src/features/calendar/asksForPastPeriods';
import { forecastPopupCopy } from '../../../src/features/calendar/copy';
import { pastPeriodRowTestID } from '../../../src/features/pastPeriods/PastPeriodsList';
import {
  pastPeriodsSaveTestID,
  pastPeriodsScreenTestID,
} from '../../../src/features/pastPeriods/PastPeriodsScreen';
import { english, russian, spanish } from '../../../src/language';
import { openDatabaseSync, resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, herPhoneHoldsTheseAnswers } from '../../fixtures/herPhone';
import { textIn } from '../../fixtures/renderedText';
import { sheGivesAPeriod } from '../../fixtures/thePastPeriods';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * Issue 271: when she opens a month ahead and Emi has too little data to forecast it, a sheet asks
 * her to add her last three periods. "Not now" closes it over that month for the rest of the day,
 * and "Add past periods" opens the list the first run asks with.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = '2026-05-14';
const herPeriodStarted = '2026-05-09';
const sheSaidHerCycleRuns = 28;

/** The month after next, which the learning forecast never reaches. */
const twoMonthsAhead = '2026-07-01';
/** The month after this one, which holds the one period the learning forecast draws. */
const nextMonth = '2026-06-01';

function aPeriodOf(start: string, lengthDays: number): DayRecord[] {
  return Array.from({ length: lengthDays }, (_unused, at) => aBleedingDay(addDays(start, at)));
}

async function herPhoneHoldsOnePeriod(): Promise<void> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: sheSaidHerCycleRuns,
      recordedAt: whenSheOpensIt.toISOString(),
    },
    aPeriodOf(herPeriodStarted, 5),
  );
}

async function herPhoneHoldsThreePeriods(): Promise<void> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: sheSaidHerCycleRuns,
      recordedAt: whenSheOpensIt.toISOString(),
    },
    [
      ...aPeriodOf('2026-03-14', 5),
      ...aPeriodOf('2026-04-11', 5),
      ...aPeriodOf(herPeriodStarted, 5),
    ],
  );
}

interface OpenApp {
  readonly pathname: () => string;
}

async function sheOpensTheMonth(month: string): Promise<OpenApp> {
  const app = renderRouter(appDirectory, { initialUrl: `/calendar?day=${month}` });
  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function aForecastIsDrawnIn(month: string): boolean {
  const days = Array.from({ length: 31 }, (_unused, at) => addDays(month, at)).filter(
    (day) => day.slice(0, 7) === month.slice(0, 7),
  );

  return days.some((day) => {
    const disc = screen.queryByTestId(dateDiscTestID(day));
    const style: ViewStyle = disc === null ? {} : StyleSheet.flatten(disc.props.style);

    return style.borderStyle === 'dashed';
  });
}

describe('the sheet that asks for her past periods over a month Emi cannot forecast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when it shows', () => {
    it('shows over a month ahead the forecast does not reach, in the board words', async () => {
      await herPhoneHoldsOnePeriod();
      await sheOpensTheMonth(twoMonthsAhead);

      expect(screen.getByTestId(forecastPopupTestID)).toBeTruthy();
      expect(screen.getByTestId(forecastPopupEyebrowTestID)).toHaveTextContent(
        'Forecast from day one',
      );
      expect(screen.getByTestId(forecastPopupTitleTestID)).toHaveTextContent(
        'Add your last three periods',
      );
      expect(screen.getByTestId(forecastPopupLineTestID)).toHaveTextContent(
        'Emi needs a few cycles before it can forecast the months ahead. Add the start of your last three periods, and the forecast is ready now.',
      );
      expect(screen.getByTestId(forecastPopupActionTestID)).toHaveTextContent('Add past periods');
    });

    it('shows over a month ahead for a woman who gave no period at all', async () => {
      await herPhoneHoldsTheseAnswers(whenSheOpensIt, {
        kind: 'profile',
        cycleLengthDays: sheSaidHerCycleRuns,
        recordedAt: whenSheOpensIt.toISOString(),
      });
      await sheOpensTheMonth(nextMonth);

      expect(screen.getByTestId(forecastPopupTestID)).toBeTruthy();
    });

    it('does not show over the month she is in', async () => {
      await herPhoneHoldsOnePeriod();
      await sheOpensTheMonth('2026-05-01');

      expect(screen.queryByTestId(forecastPopupTestID)).toBeNull();
    });

    it('does not show over a month ahead that holds the period Emi does forecast', async () => {
      await herPhoneHoldsOnePeriod();
      await sheOpensTheMonth(nextMonth);

      expect(aForecastIsDrawnIn(nextMonth)).toBe(true);
      expect(screen.queryByTestId(forecastPopupTestID)).toBeNull();
    });

    it('does not show once her own cycles carry a forecast', async () => {
      await herPhoneHoldsThreePeriods();
      await sheOpensTheMonth(twoMonthsAhead);

      expect(aForecastIsDrawnIn(twoMonthsAhead)).toBe(true);
      expect(screen.queryByTestId(forecastPopupTestID)).toBeNull();
    });
  });

  describe('Not now', () => {
    it('closes it, and it stays closed over that month for the rest of the day', async () => {
      await herPhoneHoldsOnePeriod();
      await sheOpensTheMonth(twoMonthsAhead);

      await shePresses(forecastPopupNotNowTestID);

      expect(screen.queryByTestId(forecastPopupTestID)).toBeNull();
      expect(listDayLogs(expoDatabase(openDatabaseSync(databaseFileName)))).toHaveLength(5);

      await sheOpensTheMonth(twoMonthsAhead);

      expect(screen.queryByTestId(forecastPopupTestID)).toBeNull();
    });

    it('leaves it showing over another month she has not closed it on', async () => {
      await herPhoneHoldsOnePeriod();
      await sheOpensTheMonth(twoMonthsAhead);
      await shePresses(forecastPopupNotNowTestID);

      await shePresses(calendarLaterTestID);

      expect(screen.getByTestId(forecastPopupTestID)).toBeTruthy();
    });

    it('lets it show again the next day', async () => {
      await herPhoneHoldsOnePeriod();
      writeSetting(
        expoDatabase(openDatabaseSync(databaseFileName)),
        'forecastPopupClosed',
        `${addDays(today, -1)}|${twoMonthsAhead}`,
      );

      await sheOpensTheMonth(twoMonthsAhead);

      expect(screen.getByTestId(forecastPopupTestID)).toBeTruthy();
    });

    it('writes the day and the month she closed it on, and nothing else', async () => {
      await herPhoneHoldsOnePeriod();
      await sheOpensTheMonth(twoMonthsAhead);
      await shePresses(forecastPopupNotNowTestID);

      expect(
        readSetting(expoDatabase(openDatabaseSync(databaseFileName)), 'forecastPopupClosed'),
      ).toBe(`${today}|${twoMonthsAhead}`);
    });
  });

  describe('Add past periods', () => {
    it('opens the list of her last three periods, with the one Emi holds already given', async () => {
      const app = await herPhoneHoldsOnePeriod().then(() => sheOpensTheMonth(twoMonthsAhead));

      await shePresses(forecastPopupActionTestID);

      expect(app.pathname()).toBe('/calendar/past-periods');
      expect(screen.getByTestId(pastPeriodsScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(forecastPopupTestID)).toBeNull();
      expect(textIn(screen.getByTestId(pastPeriodRowTestID(0)))).toEqual(
        expect.arrayContaining(['9 May', '5 days']),
      );
      expect(screen.getByTestId(pastPeriodsSaveTestID)).toBeDisabled();
    });

    it('saves the periods she adds, and the forecast appears in the month she was reading', async () => {
      const app = await herPhoneHoldsOnePeriod().then(() => sheOpensTheMonth(twoMonthsAhead));

      expect(aForecastIsDrawnIn(twoMonthsAhead)).toBe(false);

      await shePresses(forecastPopupActionTestID);
      await sheGivesAPeriod(1, '2026-04-11', 5);
      await sheGivesAPeriod(2, '2026-03-14', 5);
      await shePresses(pastPeriodsSaveTestID);

      expect(app.pathname()).toBe('/calendar');
      expect(listDayLogs(expoDatabase(openDatabaseSync(databaseFileName)))).toHaveLength(15);
      expect(aForecastIsDrawnIn(twoMonthsAhead)).toBe(true);
      expect(screen.queryByTestId(forecastPopupTestID)).toBeNull();
    });
  });

  describe('the rule', () => {
    it('is false for a month that is not ahead of her', () => {
      expect(
        forecastIsMissingFor(
          { cycles: [], records: [], statedCycleLengthDays: 28, today },
          '2026-04-01',
        ),
      ).toBe(false);
      expect(
        forecastIsMissingFor({ cycles: [], records: [], statedCycleLengthDays: 28, today }, today),
      ).toBe(false);
      expect(
        forecastIsMissingFor(
          { cycles: [], records: [], statedCycleLengthDays: 28, today },
          nextMonth,
        ),
      ).toBe(true);
    });
  });

  describe('the words', () => {
    it('are in English, Spanish and Russian', () => {
      for (const catalogue of [english, spanish, russian]) {
        for (const key of [
          'calendar.forecastPopup.eyebrow',
          'calendar.forecastPopup.title',
          'calendar.forecastPopup.line',
          'calendar.forecastPopup.action',
          'calendar.forecastPopup.notNow',
        ] as const) {
          expect(catalogue[key]).toEqual(expect.any(String));
          expect(String(catalogue[key]).length).toBeGreaterThan(0);
        }
      }
      expect(forecastPopupCopy.notNow).toBe('Not now');
    });
  });
});
