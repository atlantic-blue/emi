import { drawTheAnswerAtTheLargestTextSize } from '../fixtures/theAnswerAtTheLargestTextSize';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-GB' }] }));

drawTheAnswerAtTheLargestTextSize('en');
