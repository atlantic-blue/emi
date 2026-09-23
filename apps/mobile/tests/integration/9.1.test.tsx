import { join } from 'node:path';

import {
  applicationFontFiles,
  face,
  faceFamily,
  fonts,
  typeRoleNames,
  typeScale,
} from '@emi/tokens';
import { render, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { Fonts } from '../../src/features/type/Fonts';
import { fontsToLoad } from '../../src/features/type/fontsToLoad';
import { resetExpoSqlite } from '../data/expoSqlite';
import { drawnRuns, registeredFaces, runsDrawnInAnUnloadedFace } from '../fixtures/drawnFaces';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { herPhoneHolds } from '../fixtures/herPhone';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/** What the loader was handed, and whether it says the files are in memory yet. */
let mockFilesAreLoaded = true;
const mockLoaderWasHanded: Record<string, unknown>[] = [];

jest.mock('expo-font', () => ({
  useFonts: (map: Record<string, unknown>): [boolean, Error | null] => {
    mockLoaderWasHanded.push(map);

    return [mockFilesAreLoaded, null];
  },
}));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, away from any summer time change, so her calendar reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

beforeEach(() => {
  mockFilesAreLoaded = true;
  mockLoaderWasHanded.length = 0;
  resetExpoSqlite();
  resetExpoSecureStore();
});

describe('three typefaces across the whole product', () => {
  describe('the files the application loads', () => {
    it('loads each family the design system names, at every weight it ships', () => {
      expect(applicationFontFiles.map((file) => file.name)).toEqual([
        'Newsreader16pt-Regular',
        'Newsreader16pt-Medium',
        'PlusJakartaSans-Regular',
        'PlusJakartaSans-SemiBold',
        'JetBrainsMono-Regular',
        'JetBrainsMono-Medium',
      ]);
      expect(face.display).toBe('Newsreader');
      expect(face.text).toBe('Plus Jakarta Sans');
      expect(face.data).toBe('JetBrains Mono');
    });

    it('hands the loader those files and no others', async () => {
      await render(
        <Fonts>
          <Text>anything at all</Text>
        </Fonts>,
      );

      expect(Object.keys(mockLoaderWasHanded[0] ?? {})).toEqual([...registeredFaces]);
    });

    it('loads no file of the two families the design system replaced', async () => {
      await render(
        <Fonts>
          <Text>anything at all</Text>
        </Fonts>,
      );

      const handed = Object.keys(mockLoaderWasHanded[0] ?? {}).join(' ');

      expect(handed).not.toContain('Fraunces');
      expect(handed).not.toContain('IBMPlexMono');
      expect(Object.keys(fontsToLoad)).toHaveLength(6);
      expect(Object.values(faceFamily).map((name) => fonts[name].family)).toEqual([
        'Newsreader 16pt',
        'Plus Jakarta Sans',
        'JetBrains Mono',
      ]);
    });
  });

  describe('what she sees while the files arrive', () => {
    it('draws nothing at all, so no word is drawn twice in two faces', async () => {
      mockFilesAreLoaded = false;

      await render(
        <Fonts>
          <Text>Emi learns your cycle</Text>
        </Fonts>,
      );

      expect(screen.queryByText('Emi learns your cycle')).toBeNull();
    });

    it('draws the screen once they are in memory', async () => {
      await render(
        <Fonts>
          <Text>Emi learns your cycle</Text>
        </Fonts>,
      );

      expect(screen.getByText('Emi learns your cycle')).toBeTruthy();
    });
  });

  describe('the face every screen is drawn in', () => {
    it('draws every word of the first screen in the family that loaded', async () => {
      const app = renderRouter(appDirectory, { initialUrl: '/' });
      await app;

      expect(runsDrawnInAnUnloadedFace(screen.toJSON())).toEqual([]);
    });

    it('measures something, so a screen that drew no words is not read as a pass', async () => {
      const app = renderRouter(appDirectory, { initialUrl: '/' });
      await app;

      const measured = drawnRuns(screen.toJSON()).filter(
        (run) => run.text.trim().length > 0 && run.points !== undefined,
      );

      expect(measured.length).toBeGreaterThan(5);
      expect(measured.every((run) => registeredFaces.includes(String(run.family)))).toBe(true);
    });

    it('draws every word of the home screen in the family that loaded', async () => {
      await herPhoneHolds(whenSheOpensIt, [
        { day: '2026-05-10', flow: 'medium', recordedAt: '2026-05-10T08:00:00.000Z' },
      ]);

      const app = renderRouter(appDirectory, { initialUrl: '/' });
      await app;

      expect(runsDrawnInAnUnloadedFace(screen.toJSON())).toEqual([]);
    });

    it('draws every size it draws at one of the thirteen roles', async () => {
      const app = renderRouter(appDirectory, { initialUrl: '/' });
      await app;

      const sizes = new Set(typeRoleNames.map((role) => typeScale[role].size));
      const drawn = drawnRuns(screen.toJSON())
        .filter((run) => run.text.trim().length > 0 && run.points !== undefined)
        .map((run) => run.points)
        .filter((points): points is number => points !== undefined);

      expect(drawn.length).toBeGreaterThan(5);
      expect([...new Set(drawn)].filter((points) => !sizes.has(points))).toEqual([]);
    });
  });
});
