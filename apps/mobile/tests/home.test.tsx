import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from '../src/features/home/HomeScreen';
import { textIn } from './fixtures/renderedText';

describe('the home screen', () => {
  it('shows the word Emi', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Emi')).toBeTruthy();
  });

  it('shows nothing else', async () => {
    await render(<HomeScreen />);

    expect(textIn(screen.toJSON())).toEqual(['Emi']);
  });
});
