import { drawEditPeriodAtTheLargestTextSize } from '../fixtures/theEditPeriodAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }));

drawEditPeriodAtTheLargestTextSize('es');
