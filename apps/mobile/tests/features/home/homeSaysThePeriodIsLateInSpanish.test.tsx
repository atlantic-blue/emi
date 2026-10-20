import { screen } from '@testing-library/react-native';

import {
  nextPeriodItStartedTestID,
  nextPeriodLateTestID,
  nextPeriodRangeTestID,
} from '../../../src/features/forecast/NextPeriod';
import { homeWhenSheIsLate } from '../../fixtures/theLateHome';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'es-ES' }]) }));

describe('Home after the forecast window has passed, in Spanish', () => {
  it('should say the period is late, and offer Ya empezó', async () => {
    await homeWhenSheIsLate({ daysLate: 2, onItStarted: () => undefined });

    expect(screen.getByTestId(nextPeriodLateTestID)).toHaveTextContent(
      'Tu regla se retrasa 2 días',
    );
    expect(screen.getByTestId(nextPeriodItStartedTestID)).toHaveTextContent('Ya empezó');
    expect(screen.queryByTestId(nextPeriodRangeTestID)).toBeNull();
  });

  it('should say one day in the singular', async () => {
    await homeWhenSheIsLate({ daysLate: 1, onItStarted: () => undefined });

    expect(screen.getByTestId(nextPeriodLateTestID)).toHaveTextContent('Tu regla se retrasa 1 día');
  });
});
