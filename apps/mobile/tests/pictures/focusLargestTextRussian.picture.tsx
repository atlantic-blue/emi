import { drawTheFocusAtTheLargestTextSize } from '../fixtures/theFocusAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));

drawTheFocusAtTheLargestTextSize('ru');
