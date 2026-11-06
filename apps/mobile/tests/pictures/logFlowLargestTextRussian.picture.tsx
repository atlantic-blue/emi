import { drawTheLogAtTheLargestTextSize } from '../fixtures/theLogAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));

drawTheLogAtTheLargestTextSize('ru');
