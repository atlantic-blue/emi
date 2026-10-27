import { join } from 'node:path';

import { render, screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { CalendarScreen } from '../../../src/features/calendar/CalendarScreen';
import {
  CycleMonth,
  dayTestID,
  legendSexTestID,
  monthLegendTestID,
  sexMarkTestID,
} from '../../../src/features/calendar/CycleMonth';
import {
  daySheetLineTestID,
  daySheetRecordSexTestID,
  daySheetTestID,
} from '../../../src/features/calendar/DaySheet';
import { herMonth } from '../../../src/features/calendar/herMonth';
import { whatSheMarkedOn } from '../../../src/features/log/copy';
import { sexChipTestID, sexPageSaveTestID, sexPageTestID } from '../../../src/features/sex/SexPage';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { textIn } from '../../fixtures/renderedText';
import { OnAPhone } from '../../fixtures/theSafeArea';
import {
  herPhoneHoldsFourRecordedPeriodDays,
  theDaySheOpensIt,
} from '../../fixtures/theWeekSheOpensWith';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const whenSheOpensIt = new Date(`${theDaySheOpensIt}T12:00:00.000Z`);
/** A day she lived before her period, so a save leaves straight back to the month. */
const thatDay = '2026-09-10';

async function shePresses(testID: string): Promise<void> {
  await act(async () => {
    fireEvent.press(await screen.findByTestId(testID));
  });
}

async function sheRecordsOnThatDay(chips: readonly [string, string][]): Promise<void> {
  await shePresses(dayTestID(thatDay));
  await shePresses(daySheetRecordSexTestID);
  await screen.findByTestId(sexPageTestID);
  for (const [group, value] of chips) {
    await shePresses(sexChipTestID(group as 'sex', value));
  }
  await shePresses(sexPageSaveTestID);
  await screen.findByTestId(daySheetTestID);
}

function theCardLine(): string {
  return textIn(screen.getByTestId(daySheetLineTestID)).join('');
}

describe('sex she records on a day she lived, read back in the month', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHoldsFourRecordedPeriodDays(whenSheOpensIt);
    await renderRouter(appDirectory, { initialUrl: '/calendar' });
    await screen.findByTestId(dayTestID(thatDay));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should write the answers to the day, and name sex on the card of that day', async () => {
    await sheRecordsOnThatDay([
      ['sex', 'unprotected'],
      ['sexDrive', 'high'],
      ['orgasm', 'yes'],
    ]);

    expect(theCardLine()).toMatch(/Sex$/);
    expect(theCardLine()).not.toContain('Nothing logged');

    await shePresses(daySheetRecordSexTestID);
    expect(await screen.findByTestId(sexChipTestID('sex', 'unprotected'))).toBeSelected();
    expect(screen.getByTestId(sexChipTestID('sexDrive', 'high'))).toBeSelected();
    expect(screen.getByTestId(sexChipTestID('orgasm', 'yes'))).toBeSelected();
  });

  it('should put a heart on that day in the month', async () => {
    expect(screen.queryByTestId(sexMarkTestID(thatDay))).toBeNull();

    await sheRecordsOnThatDay([['sex', 'protected']]);

    expect(screen.getByTestId(sexMarkTestID(thatDay))).toBeTruthy();
  });

  it('should take the heart off when she takes her answer off', async () => {
    await sheRecordsOnThatDay([['sex', 'protected']]);
    expect(screen.getByTestId(sexMarkTestID(thatDay))).toBeTruthy();
    await sheRecordsOnThatDay([['sex', 'protected']]);

    expect(screen.queryByTestId(sexMarkTestID(thatDay))).toBeNull();
    expect(theCardLine()).not.toMatch(/sex/i);
  });

  it('should take the heart off when she changes her answer to No sex', async () => {
    await sheRecordsOnThatDay([['sex', 'unprotected']]);
    expect(screen.getByTestId(sexMarkTestID(thatDay))).toBeTruthy();
    await sheRecordsOnThatDay([['sex', 'none']]);

    expect(screen.queryByTestId(sexMarkTestID(thatDay))).toBeNull();
    expect(theCardLine()).toMatch(/No sex$/);
  });
});

describe('the line of a day with answers from the Sex page', () => {
  it('should name sex where she had it, and no sex where she said so', () => {
    expect(whatSheMarkedOn({ day: thatDay, recordedAt: '', sex: 'unprotected' })).toBe('Sex');
    expect(whatSheMarkedOn({ day: thatDay, recordedAt: '', sex: 'protected' })).toBe('Sex');
    expect(whatSheMarkedOn({ day: thatDay, recordedAt: '', sex: 'none' })).toBe('No sex');
  });

  it('should name sex once, after everything else the day holds', () => {
    expect(
      whatSheMarkedOn({
        day: thatDay,
        flow: 'medium',
        orgasm: 'yes',
        recordedAt: '',
        sex: 'unprotected',
        sexDrive: 'high',
      }),
    ).toBe('Medium flow and sex');
  });

  it('should name the other two answers on a day without an answer about sex', () => {
    expect(whatSheMarkedOn({ day: thatDay, recordedAt: '', sexDrive: 'low' })).toBe('Sex drive');
    expect(whatSheMarkedOn({ day: thatDay, orgasm: 'rather-not-say', recordedAt: '' })).toBe(
      'An answer about orgasm',
    );
  });
});

describe('the heart in the month and in its legend', () => {
  const month = '2026-09-01';
  const days = herMonth(
    { cycles: [], records: [], statedCycleLengthDays: 28, today: theDaySheOpensIt },
    month,
  );

  async function sheReadsTheMonth(hadSexOn: (day: string) => boolean): Promise<void> {
    await render(
      <OnAPhone>
        <CalendarScreen
          days={days}
          hadSexOn={hadSexOn}
          month={month}
          onBack={() => undefined}
          onEarlierMonth={() => undefined}
          onEditPeriod={() => undefined}
          onLaterMonth={() => undefined}
          onOpenDay={() => undefined}
          onPressDay={() => undefined}
          onRecordSex={() => undefined}
          onToday={() => undefined}
          today={theDaySheOpensIt}
        />
      </OnAPhone>,
    );
  }

  it('should draw a heart only on the days she had sex, and say so to somebody listening', async () => {
    await sheReadsTheMonth((day) => day === thatDay);

    expect(screen.getByTestId(sexMarkTestID(thatDay))).toBeTruthy();
    expect(screen.queryByTestId(sexMarkTestID('2026-09-11'))).toBeNull();
    expect(screen.getByTestId(dayTestID(thatDay)).props.accessibilityLabel).toMatch(/, Sex$/);
    expect(screen.getByTestId(dayTestID('2026-09-11')).props.accessibilityLabel).not.toMatch(/Sex/);
  });

  it('should name the heart in the legend of the calendar', async () => {
    await sheReadsTheMonth(() => false);

    expect(textIn(screen.getByTestId(legendSexTestID)).join('')).toBe('Sex');
  });

  it('should leave the heart out of a grid that draws no hearts', async () => {
    await render(
      <OnAPhone>
        <CycleMonth
          legend
          month={month}
          squareOf={() => ({ label: '', mark: 'plain' })}
          testID="a-month"
        />
      </OnAPhone>,
    );

    expect(screen.getByTestId(monthLegendTestID)).toBeTruthy();
    expect(screen.queryByTestId(legendSexTestID)).toBeNull();
  });
});
