import { fireEvent, render, screen } from '@testing-library/react-native';

import { listCycles } from '../src/data/cycleRepository';
import { forecastOf } from '../src/features/forecast/fromCache';
import {
  HomeScreen,
  exportLabel,
  exportTestID,
  historyLabel,
  historyTestID,
  homeCopy,
  homeNoRingTestID,
  logTodayLabel,
  logTodayTestID,
  settingsLabel,
  settingsTestID,
} from '../src/features/home/HomeScreen';
import { migratedDatabase } from './fixtures/cycleCache';
import { herWeek } from './fixtures/herWeek';
import { textIn } from './fixtures/renderedText';

/** The day the empty screen is opened on, so the week it draws is the same week every run. */
const today = '2026-09-17';

/** A phone with nothing on it yet, which is the screen with the fewest words on it. */
async function theEmptyHomeScreen(asked: string[] = []): Promise<void> {
  const database = migratedDatabase();

  await render(
    <HomeScreen
      cycleLengthDays={28}
      forecast={forecastOf(listCycles(database))}
      onExport={() => asked.push('export')}
      onHistory={() => asked.push('history')}
      onLogToday={() => asked.push('log today')}
      onOpenDay={(day) => asked.push(`day ${day}`)}
      onSettings={() => asked.push('settings')}
      ring={undefined}
      today={today}
      week={herWeek(database, today)}
    />,
  );
}

/**
 * The seven columns of a phone with nothing recorded: a weekday letter and a date, and no cycle
 * day above either, because no cycle of hers has started.
 */
const theWeekWithNothingOnIt = [
  'F',
  '11',
  'S',
  '12',
  'S',
  '13',
  'M',
  '14',
  'T',
  '15',
  'W',
  '16',
  'T',
  '17',
];

describe('the home screen', () => {
  it('shows the word Emi', async () => {
    await theEmptyHomeScreen();

    expect(screen.getByText(homeCopy.wordmark)).toBeTruthy();
  });

  it('shows the wordmark, her week, what to do next, and the four ways in', async () => {
    await theEmptyHomeScreen();

    expect(screen.getByTestId(homeNoRingTestID)).toBeTruthy();
    expect(textIn(screen.toJSON())).toEqual([
      homeCopy.wordmark,
      ...theWeekWithNothingOnIt,
      homeCopy.noRing.title,
      homeCopy.noRing.line,
      'Still learning',
      'Emi needs 2 more complete cycles before it forecasts.',
      'Until then Emi counts a cycle of 28 days, the length you gave at the first run.',
      logTodayLabel,
      historyLabel,
      exportLabel,
      settingsLabel,
    ]);
  });

  it('sends her to log the day when she presses the control that says so', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(asked);

    await fireEvent.press(screen.getByTestId(logTodayTestID));

    expect(asked).toEqual(['log today']);
  });

  it('sends her to her history when she presses the control that says so', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(asked);

    await fireEvent.press(screen.getByTestId(historyTestID));

    expect(asked).toEqual(['history']);
  });

  it('sends her to the export when she presses the control that says so', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(asked);

    await fireEvent.press(screen.getByTestId(exportTestID));

    expect(asked).toEqual(['export']);
  });

  it('sends her to the settings when she presses the control that says so', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(asked);

    await fireEvent.press(screen.getByTestId(settingsTestID));

    expect(asked).toEqual(['settings']);
  });
});
