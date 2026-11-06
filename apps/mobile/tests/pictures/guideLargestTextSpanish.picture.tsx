import { drawTheGuideAtTheLargestTextSize } from '../fixtures/theGuideAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }));

drawTheGuideAtTheLargestTextSize('es');
