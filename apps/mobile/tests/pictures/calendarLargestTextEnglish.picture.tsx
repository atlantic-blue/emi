import { drawTheMonthAtTheLargestTextSize } from '../fixtures/theMonthAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-GB' }] }));

drawTheMonthAtTheLargestTextSize('en');
