import { drawTheLogAtTheLargestTextSize } from '../fixtures/theLogAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-GB' }] }));

drawTheLogAtTheLargestTextSize('en');
