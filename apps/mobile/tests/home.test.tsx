import { fireEvent, render, screen } from '@testing-library/react-native';

import { listCycles } from '../src/data/cycleRepository';
import { forecastOf } from '../src/features/forecast/fromCache';
import {
  HomeScreen,
  homeCopy,
  homeNoRingTestID,
  logTodayLabel,
  logTodayTestID,
} from '../src/features/home/HomeScreen';
import { migratedDatabase } from './fixtures/cycleCache';
import { textIn } from './fixtures/renderedText';

/** A phone with nothing on it yet, which is the screen with the fewest words on it. */
async function theEmptyHomeScreen(onLogToday: () => void = () => undefined): Promise<void> {
  await render(
    <HomeScreen
      cycleLengthDays={28}
      forecast={forecastOf(listCycles(migratedDatabase()))}
      onLogToday={onLogToday}
      ring={undefined}
    />,
  );
}

describe('the home screen', () => {
  it('shows the word Emi', async () => {
    await theEmptyHomeScreen();

    expect(screen.getByText(homeCopy.wordmark)).toBeTruthy();
  });

  it('shows the wordmark, what to do next, and one way in', async () => {
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
    ]);
  });

  it('sends her to log the day when she presses the one control on it', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(() => asked.push('log today'));

    await fireEvent.press(screen.getByTestId(logTodayTestID));

    expect(asked).toEqual(['log today']);
  });
});
