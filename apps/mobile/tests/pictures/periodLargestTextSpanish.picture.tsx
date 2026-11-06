import { drawThePeriodPageAtTheLargestTextSize } from '../fixtures/thePeriodPageAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }));

drawThePeriodPageAtTheLargestTextSize('es');
