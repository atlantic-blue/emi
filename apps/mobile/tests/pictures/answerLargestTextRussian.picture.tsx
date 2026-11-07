import { drawTheAnswerAtTheLargestTextSize } from '../fixtures/theAnswerAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));

drawTheAnswerAtTheLargestTextSize('ru');
