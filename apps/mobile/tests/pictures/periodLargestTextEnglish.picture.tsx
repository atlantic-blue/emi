import { drawThePeriodPageAtTheLargestTextSize } from '../fixtures/thePeriodPageAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-GB' }] }));

drawThePeriodPageAtTheLargestTextSize('en');
