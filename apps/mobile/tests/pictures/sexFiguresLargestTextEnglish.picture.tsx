import { drawTheSexAndFiguresAtTheLargestTextSize } from '../fixtures/theSexAndFiguresAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-GB' }] }));

drawTheSexAndFiguresAtTheLargestTextSize('en');
