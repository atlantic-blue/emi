import { drawTheLogAtTheLargestTextSize } from '../fixtures/theLogAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }));

drawTheLogAtTheLargestTextSize('es');
