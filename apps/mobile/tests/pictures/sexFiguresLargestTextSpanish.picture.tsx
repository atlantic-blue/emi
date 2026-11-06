import { drawTheSexAndFiguresAtTheLargestTextSize } from '../fixtures/theSexAndFiguresAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }));

drawTheSexAndFiguresAtTheLargestTextSize('es');
