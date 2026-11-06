import { drawThePeriodPageAtTheLargestTextSize } from '../fixtures/thePeriodPageAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));

drawThePeriodPageAtTheLargestTextSize('ru');
