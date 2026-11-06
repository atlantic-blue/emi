import { drawTheGuideAtTheLargestTextSize } from '../fixtures/theGuideAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-GB' }] }));

drawTheGuideAtTheLargestTextSize('en');
