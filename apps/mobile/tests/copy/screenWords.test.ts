import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  describeScreenWord,
  keysReadUnder,
  screenFilesOf,
  wordsInScreensUnder,
  wordsInTextElements,
} from '../../../../tools/pipeline/screenWords';
import { interfaceFilesOf } from '../../../../tools/pipeline/singleDayForecast';
import { wordKeys } from '../../src/language';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

const aScreen = 'apps/mobile/src/features/home/HomeScreen.tsx';

describe('every word she reads comes from the catalogue', () => {
  describe('the screens as they stand today', () => {
    const screens = screenFilesOf(repositoryRoot);

    it('write no word into a Text element, and say how many screens were read', () => {
      expect(wordsInScreensUnder(repositoryRoot, screens).map(describeScreenWord)).toEqual([]);
      expect(screens.length).toBeGreaterThan(20);
    });

    it('are read screen by screen, the home screen among them', () => {
      expect(screens).toContain(aScreen);
      expect(screens).toContain('apps/mobile/src/features/log/LogSheet.tsx');
    });
  });

  describe('a word put back into a screen', () => {
    it('is refused, and the file and the line are named', () => {
      const screen = ['export const Screen = () => (', '  <Text>Your flow</Text>', ');', ''].join(
        '\n',
      );
      const [described] = wordsInTextElements(aScreen, screen).map(describeScreenWord);

      expect(described).toContain(aScreen);
      expect(described).toContain(':2');
      expect(described).toContain('Your flow');
    });

    it('is refused where a string sits in an expression rather than in the markup', () => {
      const screen = `export const Screen = () => <Text>{'Your flow'}</Text>;\n`;

      expect(wordsInTextElements(aScreen, screen)).toHaveLength(1);
    });

    it('is refused inside a Text element nested in something else', () => {
      const screen = `export const Screen = () => (\n  <View>\n    <Text>\n      Your flow\n    </Text>\n  </View>\n);\n`;

      expect(wordsInTextElements(aScreen, screen)).toHaveLength(1);
    });
  });

  describe('what is not a word', () => {
    it('leaves a key named in an expression alone', () => {
      const screen = `export const Screen = () => <Text>{words('log.flow.title')}</Text>;\n`;

      expect(wordsInTextElements(aScreen, screen)).toEqual([]);
    });

    it('leaves a sign with no letters in it alone, which is the stepper', () => {
      const screen = `export const Screen = () => <Text>-</Text>;\n`;

      expect(wordsInTextElements(aScreen, screen)).toEqual([]);
    });

    it('leaves a word outside a Text element alone, because nobody reads a style', () => {
      const screen = `export const Screen = () => <View accessibilityRole="header">Nothing</View>;\n`;

      expect(wordsInTextElements(aScreen, screen)).toEqual([]);
    });
  });

  describe('the keys and the catalogue', () => {
    const sources = interfaceFilesOf(repositoryRoot).filter(
      (file) => file !== 'apps/mobile/src/language/english.ts',
    );
    const read = new Set(keysReadUnder(repositoryRoot, sources));

    it('reads every key the catalogue holds, and holds more than a hundred', () => {
      expect(wordKeys.filter((key) => !read.has(key))).toEqual([]);
      expect(wordKeys.length).toBeGreaterThan(100);
    });

    it('reads no key the catalogue does not hold', () => {
      const held = new Set<string>(wordKeys);

      expect([...read].filter((key) => !held.has(key)).sort()).toEqual([]);
      expect(read.size).toBe(wordKeys.length);
    });

    it('is read from the source and not from a list somebody keeps in step by hand', () => {
      const catalogue = readFileSync(
        join(repositoryRoot, 'apps/mobile/src/language/english.ts'),
        'utf8',
      );

      for (const key of wordKeys) {
        expect(catalogue).toContain(`'${key}'`);
      }
    });
  });
});
