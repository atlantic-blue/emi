import { drawTheAnswerAtTheLargestTextSize } from '../fixtures/theAnswerAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }));

drawTheAnswerAtTheLargestTextSize('es');
