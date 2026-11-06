import { drawEditPeriodAtTheLargestTextSize } from '../fixtures/theEditPeriodAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-GB' }] }));

drawEditPeriodAtTheLargestTextSize('en');
