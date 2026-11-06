import { drawTheFocusAtTheLargestTextSize } from '../fixtures/theFocusAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }));

drawTheFocusAtTheLargestTextSize('es');
