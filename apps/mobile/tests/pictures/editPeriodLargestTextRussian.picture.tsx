import { drawEditPeriodAtTheLargestTextSize } from '../fixtures/theEditPeriodAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));

drawEditPeriodAtTheLargestTextSize('ru');
