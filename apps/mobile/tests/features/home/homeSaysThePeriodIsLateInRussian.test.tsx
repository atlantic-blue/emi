import { screen } from '@testing-library/react-native';

import {
  nextPeriodItStartedTestID,
  nextPeriodLateTestID,
  nextPeriodRangeTestID,
} from '../../../src/features/forecast/NextPeriod';
import { homeWhenSheIsLate } from '../../fixtures/theLateHome';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'ru-RU' }]) }));

describe('Home after the forecast window has passed, in Russian', () => {
  it('should say the period is late, and offer Уже начались', async () => {
    await homeWhenSheIsLate({ daysLate: 2, onItStarted: () => undefined });

    expect(screen.getByTestId(nextPeriodLateTestID)).toHaveTextContent(
      'Месячные задерживаются на 2 дня',
    );
    expect(screen.getByTestId(nextPeriodItStartedTestID)).toHaveTextContent('Уже начались');
    expect(screen.queryByTestId(nextPeriodRangeTestID)).toBeNull();
  });

  it.each([
    [1, 'Месячные задерживаются на 1 день'],
    [5, 'Месячные задерживаются на 5 дней'],
    [21, 'Месячные задерживаются на 21 день'],
  ])('should say %i days in its own form', async (days, said) => {
    await homeWhenSheIsLate({ daysLate: days, onItStarted: () => undefined });

    expect(screen.getByTestId(nextPeriodLateTestID)).toHaveTextContent(said);
  });
});
