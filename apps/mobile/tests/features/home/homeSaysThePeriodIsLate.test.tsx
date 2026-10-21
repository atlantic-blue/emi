import { fireEvent, screen } from '@testing-library/react-native';

import {
  nextPeriodItStartedTestID,
  nextPeriodLateTestID,
  nextPeriodRangeTestID,
  nextPeriodTestID,
} from '../../../src/features/forecast/NextPeriod';
import { homeWhenSheIsLate } from '../../fixtures/theLateHome';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'en-GB' }]) }));

/**
 * Issue 318: after the forecast window passed, Home kept the range of days that had gone by. Home
 * now says how many days her period is late, with a link that opens the period editor on today.
 */

describe('Home after the forecast window has passed, in English', () => {
  it('should say the period is 2 days late in place of the range', async () => {
    await homeWhenSheIsLate({ daysLate: 2, onItStarted: () => undefined });

    expect(screen.getByTestId(nextPeriodLateTestID)).toHaveTextContent(
      'Your period is 2 days late',
    );
    expect(screen.queryByTestId(nextPeriodRangeTestID)).toBeNull();
    expect(screen.queryByText('Between the 15th and the 17th of October')).toBeNull();
  });

  it('should say one day in the singular', async () => {
    await homeWhenSheIsLate({ daysLate: 1, onItStarted: () => undefined });

    expect(screen.getByTestId(nextPeriodLateTestID)).toHaveTextContent('Your period is 1 day late');
  });

  it('should open the period editor when she presses It started', async () => {
    const pressed: string[] = [];
    await homeWhenSheIsLate({ daysLate: 2, onItStarted: () => pressed.push('it started') });

    const link = screen.getByTestId(nextPeriodItStartedTestID);
    expect(link).toHaveTextContent('It started');
    await fireEvent.press(link);

    expect(pressed).toEqual(['it started']);
  });

  it('should let somebody listening reach the link by itself', async () => {
    await homeWhenSheIsLate({ daysLate: 2, onItStarted: () => undefined });

    expect(screen.getByTestId(nextPeriodItStartedTestID).props.accessibilityRole).toBe('link');
    expect(screen.getByTestId(nextPeriodTestID).props.accessible).toBe(false);
  });

  it('should keep the range and offer no link inside the window', async () => {
    await homeWhenSheIsLate({ onItStarted: () => undefined });

    expect(screen.getByTestId(nextPeriodRangeTestID)).toHaveTextContent(
      'Between the 15th and the 17th of October',
    );
    expect(screen.queryByTestId(nextPeriodLateTestID)).toBeNull();
    expect(screen.queryByTestId(nextPeriodItStartedTestID)).toBeNull();
    expect(screen.getByTestId(nextPeriodTestID).props.accessible).toBe(true);
  });

  it('should draw no link where the caller offers no way to the editor', async () => {
    await homeWhenSheIsLate({ daysLate: 2 });

    expect(screen.getByTestId(nextPeriodLateTestID)).toHaveTextContent(
      'Your period is 2 days late',
    );
    expect(screen.queryByTestId(nextPeriodItStartedTestID)).toBeNull();
  });
});
