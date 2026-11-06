import { drawTheMonthAtTheLargestTextSize } from '../fixtures/theMonthAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));

drawTheMonthAtTheLargestTextSize('ru');
