import { drawTheSexAndFiguresAtTheLargestTextSize } from '../fixtures/theSexAndFiguresAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));

drawTheSexAndFiguresAtTheLargestTextSize('ru');
