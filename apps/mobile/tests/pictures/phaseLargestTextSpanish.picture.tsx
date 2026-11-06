import { drawThePhasePageAtTheLargestTextSize } from '../fixtures/thePhasePageAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }));

drawThePhasePageAtTheLargestTextSize('es');
