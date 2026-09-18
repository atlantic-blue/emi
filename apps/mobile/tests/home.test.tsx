import { fireEvent, render, screen } from '@testing-library/react-native';

import { HomeScreen, logTodayLabel, logTodayTestID } from '../src/features/home/HomeScreen';
import { textIn } from './fixtures/renderedText';

describe('the home screen', () => {
  it('shows the word Emi', async () => {
    await render(<HomeScreen onLogToday={() => undefined} />);

    expect(screen.getByText('Emi')).toBeTruthy();
  });

  it('shows the wordmark and one way in, and nothing else', async () => {
    await render(<HomeScreen onLogToday={() => undefined} />);

    expect(textIn(screen.toJSON())).toEqual(['Emi', logTodayLabel]);
  });

  it('sends her to log the day when she presses the one control on it', async () => {
    const asked: string[] = [];
    await render(<HomeScreen onLogToday={() => asked.push('log today')} />);

    await fireEvent.press(screen.getByTestId(logTodayTestID));

    expect(asked).toEqual(['log today']);
  });
});
