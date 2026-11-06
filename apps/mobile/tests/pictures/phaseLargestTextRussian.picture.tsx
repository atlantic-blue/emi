import { drawThePhasePageAtTheLargestTextSize } from '../fixtures/thePhasePageAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));

drawThePhasePageAtTheLargestTextSize('ru');
