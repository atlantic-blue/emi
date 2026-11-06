import { drawTheMonthAtTheLargestTextSize } from '../fixtures/theMonthAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }));

drawTheMonthAtTheLargestTextSize('es');
