import { drawTheFocusAtTheLargestTextSize } from '../fixtures/theFocusAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-GB' }] }));

drawTheFocusAtTheLargestTextSize('en');
