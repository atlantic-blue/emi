import { drawThePhasePageAtTheLargestTextSize } from '../fixtures/thePhasePageAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-GB' }] }));

drawThePhasePageAtTheLargestTextSize('en');
