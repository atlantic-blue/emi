import { fireEvent, render, screen } from '@testing-library/react-native';
import { OnAPhone } from './fixtures/theSafeArea';

import { listCycles } from '../src/data/cycleRepository';
import { cycleCopy } from '../src/features/cycle/copy';
import { homeCopy } from '../src/features/home/copy';
import { forecastOf } from '../src/features/forecast/fromCache';
import {
  HomeScreen,
  homeLogTodayTestID,
  homeNoRingTestID,
  roundActionTestID,
} from '../src/features/home/HomeScreen';
import { migratedDatabase } from './fixtures/cycleCache';
import { textIn } from './fixtures/renderedText';

/** A phone with nothing on it yet, which is the screen with the fewest words on it. */
async function theEmptyHomeScreen(asked: string[] = []): Promise<void> {
  await render(
    <OnAPhone>
      <HomeScreen
        cycleLengthDays={28}
        forecast={forecastOf(listCycles(migratedDatabase()))}
        onExport={() => asked.push('export')}
        onLogPain={() => asked.push('log pain')}
        onLogToday={() => asked.push('log today')}
        onPeriod={() => asked.push('period')}
        onSymptoms={() => asked.push('symptoms')}
        ring={undefined}
      />
    </OnAPhone>,
  );
}

describe('the home screen', () => {
  it('shows the word Emi', async () => {
    await theEmptyHomeScreen();

    expect(screen.getByText(homeCopy.wordmark)).toBeTruthy();
  });

  it('shows the wordmark, what to do next, the two round actions and the one button', async () => {
    await theEmptyHomeScreen();

    expect(screen.getByTestId(homeNoRingTestID)).toBeTruthy();
    expect(textIn(screen.toJSON())).toEqual([
      homeCopy.wordmark,
      cycleCopy.noRing.title,
      cycleCopy.noRing.line,
      homeCopy.roundAction.period,
      homeCopy.roundAction.symptoms,
      'Still learning',
      'Emi needs 2 more complete cycles before it says how sure it is.',
      'Until then Emi counts a cycle of 28 days, the length you gave at the first run.',
      homeCopy.logToday,
    ]);
  });

  it('sends her to log her period when she presses the first round action', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(asked);

    await fireEvent.press(screen.getByTestId(roundActionTestID('period')));

    expect(asked).toEqual(['period']);
  });

  it('sends her to log a symptom when she presses the second round action', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(asked);

    await fireEvent.press(screen.getByTestId(roundActionTestID('symptoms')));

    expect(asked).toEqual(['symptoms']);
  });

  it('sends her to the log when she presses the one button, which has no ring to press', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(asked);

    await fireEvent.press(screen.getByTestId(homeLogTodayTestID));

    expect(asked).toEqual(['log today']);
  });
});
