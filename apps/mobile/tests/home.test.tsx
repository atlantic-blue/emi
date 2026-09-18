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
} from '../src/features/home/HomeScreen';
import { migratedDatabase } from './fixtures/cycleCache';
import { textIn } from './fixtures/renderedText';

/** A phone with nothing on it yet, which is the screen with the fewest words on it. */
async function theEmptyHomeScreen(asked: string[] = []): Promise<void> {
  await render(
    <HomeScreen
      cycleLengthDays={28}
      forecast={forecastOf(listCycles(migratedDatabase()))}
      onExport={() => asked.push('export')}
      onHistory={() => asked.push('history')}
      onLogToday={() => asked.push('log today')}
      ring={undefined}
    />,
  );
}

describe('the home screen', () => {
  it('shows the word Emi', async () => {
    await theEmptyHomeScreen();

    expect(screen.getByText(homeCopy.wordmark)).toBeTruthy();
  });

  it('shows the wordmark, what to do next, and the three ways in', async () => {
    await theEmptyHomeScreen();

    expect(screen.getByTestId(homeNoRingTestID)).toBeTruthy();
    expect(textIn(screen.toJSON())).toEqual([
      homeCopy.wordmark,
      homeCopy.noRing.title,
      homeCopy.noRing.line,
      'Still learning',
      'Emi needs 2 more complete cycles before it forecasts.',
      'Until then Emi counts a cycle of 28 days, the length you gave at the first run.',
      logTodayLabel,
      historyLabel,
      exportLabel,
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
});
