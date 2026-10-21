import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { readDayLog } from '../../../src/data/dayLogRepository';
import { groupTileTestID } from '../../../src/features/log/GroupTiles';
import { logHeaderLeaveTestID } from '../../../src/features/log/LogHeader';
import {
  logFlowCopy,
  logFlowDoneTestID,
  logFlowFootDoneTestID,
  logFlowHeldTestID,
  logFlowPeriodRowTestID,
  logFlowSearchTestID,
  logFlowSexRowTestID,
  logFlowTestID,
  logFlowTitleTestID,
  logFlowWhenTestID,
} from '../../../src/features/log/LogFlow';
import {
  logSymptomsCountTestID,
  logSymptomsNothingFoundTestID,
  logSymptomsSaveTestID,
  logSymptomsTestID,
} from '../../../src/features/log/LogSymptoms';
import { symptomChipTestID, symptomGroupTestID } from '../../../src/features/log/SymptomGroup';
import { symptomSearchTestID } from '../../../src/features/log/SymptomSearchField';
import { editSymptoms, DayEditError } from '../../../src/features/log/editDay';
import { dateWords } from '../../../src/features/onboarding/days';
import { periodPageDayTestID, periodPageTestID } from '../../../src/features/period/PeriodPage';
import { periodDayLabel } from '../../../src/features/period/copy';
import { sexPageDayTestID, sexPageTestID } from '../../../src/features/sex/SexPage';
import { sexDayHeading } from '../../../src/features/sex/copy';
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
 * The log from the redesign, audit chapter 10: a day she already lived takes a symptom, opens its
 * Sex and Period pages, and asks about the flow in words that are true for that day. The symptoms
 * open by group or by search, never as one long list, and nothing is written before she saves.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** Four days back: the second day of the period she is in, which she logged at the time. */
const thatDay = addDays(today, -4);

function herDays(): DayRecord[] {
  return [aBleedingDay(addDays(today, -5)), aBleedingDay(thatDay)];
}

async function sheOpens(url: string): Promise<{ pathname: () => string }> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: 28,
      periodLengthDays: 5,
      recordedAt: whenSheOpensIt.toISOString(),
    },
    herDays(),
  );

  const app = renderRouter(appDirectory, { initialUrl: url });
  await app;

  return { pathname: () => app.getPathname() };
}

async function press(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function theDayOnHerPhone(day: string): DayRecord | undefined {
  const held = readDayLog(herDatabase(), day);

  return held === undefined ? undefined : herVault().open(held.payload);
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

describe('a day she already lived', () => {
  it('names the date as its title and asks about the flow with no word for today', async () => {
    await sheOpens(`/day/${thatDay}`);

    expect(screen.getByTestId(logFlowWhenTestID)).toHaveTextContent(dateWords(thatDay));
    expect(screen.getByTestId(logFlowTitleTestID)).toHaveTextContent(logFlowCopy.title);
    expect(screen.queryByText(/today/i)).toBeNull();
  });

  it('offers Done at the top and again at the foot', async () => {
    await sheOpens(`/day/${thatDay}`);

    expect(screen.getByTestId(logFlowDoneTestID)).toBeTruthy();
    expect(screen.getByTestId(logFlowFootDoneTestID)).toBeTruthy();
  });

  it('saves a symptom on that day, and only on that day', async () => {
    await sheOpens(`/day/${thatDay}`);

    await press(groupTileTestID('digestive'));
    await press(symptomChipTestID('bloating'));
    await press(logSymptomsSaveTestID);

    expect(theDayOnHerPhone(thatDay)?.symptoms).toEqual(['bloating']);
    expect(theDayOnHerPhone(thatDay)?.flow).toBe('medium');
    expect(theDayOnHerPhone(today)).toBeUndefined();
    expect(screen.getByTestId(logFlowTestID)).toBeTruthy();
    expect(screen.getByTestId(logFlowHeldTestID)).toBeTruthy();
    expect(screen.getByTestId(symptomChipTestID('bloating'))).toBeChecked();
  });

  it('takes a symptom off that day with one press on its chip', async () => {
    await sheOpens(`/day/${thatDay}`);

    await press(groupTileTestID('digestive'));
    await press(symptomChipTestID('bloating'));
    await press(logSymptomsSaveTestID);
    await press(symptomChipTestID('bloating'));

    expect(theDayOnHerPhone(thatDay)?.symptoms).toBeUndefined();
    expect(screen.queryByTestId(logFlowHeldTestID)).toBeNull();
  });

  it('leaves the day as it was when she goes back from the symptoms without saving', async () => {
    await sheOpens(`/day/${thatDay}`);

    await press(groupTileTestID('digestive'));
    await press(symptomChipTestID('bloating'));
    await press(logHeaderLeaveTestID);

    expect(theDayOnHerPhone(thatDay)?.symptoms).toBeUndefined();
    expect(screen.getByTestId(logFlowTestID)).toBeTruthy();
  });

  it('opens the Sex page of that day', async () => {
    await sheOpens(`/day/${thatDay}`);

    await press(logFlowSexRowTestID);

    expect(screen.getByTestId(sexPageTestID)).toBeTruthy();
    expect(screen.getByTestId(sexPageDayTestID)).toHaveTextContent(sexDayHeading(thatDay));
  });

  it('opens the Period page of that day', async () => {
    await sheOpens(`/day/${thatDay}`);

    await press(logFlowPeriodRowTestID);

    expect(screen.getByTestId(periodPageTestID)).toBeTruthy();
    expect(screen.getByTestId(periodPageDayTestID)).toHaveTextContent(periodDayLabel(thatDay));
  });

  it('refuses a symptom written to a day ahead of her, whatever screen asks', () => {
    expect(() =>
      editSymptoms(herDatabase(), herVault(), {
        day: addDays(today, 2),
        symptoms: ['bloating'],
        now: whenSheOpensIt,
        today,
      }),
    ).toThrow(DayEditError);
  });
});

describe('the log of today', () => {
  it('has no rows to the Sex and Period pages, because Today has those actions', async () => {
    await sheOpens('/log');

    expect(screen.queryByTestId(logFlowSexRowTestID)).toBeNull();
    expect(screen.queryByTestId(logFlowPeriodRowTestID)).toBeNull();
  });
});

describe('the symptoms, opened by search', () => {
  it('finds a symptom of a group that is not open, by the letters she types', async () => {
    await sheOpens('/log');

    await press(logFlowSearchTestID);
    await fireEvent.changeText(screen.getByTestId(symptomSearchTestID), 'bloat');

    expect(screen.getByTestId(symptomChipTestID('bloating'))).toBeTruthy();
    expect(screen.queryByTestId(symptomGroupTestID('mood'))).toBeNull();
  });

  it('says nothing matches, in her words, when nothing does', async () => {
    await sheOpens('/log');

    await press(logFlowSearchTestID);
    await fireEvent.changeText(screen.getByTestId(symptomSearchTestID), 'qqq');

    expect(screen.getByTestId(logSymptomsNothingFoundTestID)).toHaveTextContent(
      'No symptoms match qqq',
    );
  });

  it('counts what she picked, and writes it to today only when she saves', async () => {
    await sheOpens('/log');

    await press(logFlowSearchTestID);
    await fireEvent.changeText(screen.getByTestId(symptomSearchTestID), 'bloat');
    await press(symptomChipTestID('bloating'));

    expect(screen.getByTestId(logSymptomsCountTestID)).toHaveTextContent('1 picked');
    expect(theDayOnHerPhone(today)).toBeUndefined();

    await press(logSymptomsSaveTestID);

    expect(theDayOnHerPhone(today)?.symptoms).toEqual(['bloating']);
    expect(screen.queryByTestId(logSymptomsTestID)).toBeNull();
  });
});

describe('the entry for today', () => {
  it('names itself as the entry for today, not as the bare word Today', async () => {
    await sheOpens('/log');

    expect(screen.getByTestId(logFlowWhenTestID)).toHaveTextContent('Entry for today');
    expect(screen.getByTestId(logFlowWhenTestID)).not.toHaveTextContent(/^Today$/);
  });
});
