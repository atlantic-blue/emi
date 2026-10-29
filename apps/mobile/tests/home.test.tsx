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
        onOpenLogged={() => asked.push('logged')}
        onOpenPhase={() => asked.push('phase')}
        onPeriod={() => asked.push('period')}
        onSex={() => asked.push('sex')}
        ring={undefined}
      />
    </OnAPhone>,
  );
}

describe('the home screen', () => {
  it('shows the word emi', async () => {
    await theEmptyHomeScreen();

    expect(screen.getByText(homeCopy.wordmark)).toBeTruthy();
  });

  it('shows the wordmark, what to do next, the Sex and Period actions and the one button', async () => {
    await theEmptyHomeScreen();

    expect(screen.getByTestId(homeNoRingTestID)).toBeTruthy();
    expect(textIn(screen.toJSON())).toEqual([
      homeCopy.wordmark,
      // A woman who gave no name is greeted anyway, with hello on its own and no gap after it.
      'Hello',
      cycleCopy.noRing.title,
      cycleCopy.noRing.line,
      homeCopy.periodAction.log,
      // No ring means no phase to open, so the Cycle phase action is not drawn on this screen.
      homeCopy.roundAction.sex,
      homeCopy.roundAction.period,
      'Still getting to know you',
      'We need 2 more full cycles before we can say how sure we are.',
      "Until then, we're using the 28 day cycle you told us about.",
      homeCopy.logToday,
    ]);
  });

  it('sends her to the Sex page when she presses the first round action', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(asked);

    await fireEvent.press(screen.getByTestId(roundActionTestID('sex')));

    expect(asked).toEqual(['sex']);
  });

  it('sends her to the Period page when she presses the second round action', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(asked);

    await fireEvent.press(screen.getByTestId(roundActionTestID('period')));

    expect(asked).toEqual(['period']);
  });

  it('draws no Cycle phase action and no Symptoms action while there is no ring', async () => {
    await theEmptyHomeScreen();

    expect(screen.queryByTestId(roundActionTestID('phase'))).toBeNull();
    // Named as the string it was drawn under, because the name left the product with it.
    expect(screen.queryByTestId('home-round-action-symptoms')).toBeNull();
    expect(screen.queryByText('Symptoms')).toBeNull();
  });

  it('sends her to the log when she presses the one button, which has no ring to press', async () => {
    const asked: string[] = [];
    await theEmptyHomeScreen(asked);

    await fireEvent.press(screen.getByTestId(homeLogTodayTestID));

    expect(asked).toEqual(['log today']);
  });
});
