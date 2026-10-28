import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Fonts } from '../../../src/features/type/Fonts';
import * as fontsToLoad from '../../../src/features/type/fontsToLoad';
import { registeredFilesIn } from '../../../src/features/type/fontsToLoad';
import { forgetLanguage } from '../../../src/language/words';
import { russian } from '../../../src/language/russian';
import { theFaceAt } from '../../fixtures/theWidthOfWords';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ru-RU' }] }));
jest.mock('expo-font', () => ({ useFonts: (): [boolean, null] => [true, null] }));

function lettersOfTheRussianWords(): string[] {
  const sentences = Object.values(russian).flatMap((words) =>
    typeof words === 'string' ? [words] : Object.values(words),
  );

  return [...new Set(sentences.join(''))].filter((letter) => !/\s/.test(letter)).sort();
}

describe('Russian is drawn in one face that holds every letter of it', () => {
  it('loads a Cyrillic face under each Figtree name when she reads Russian', () => {
    expect(registeredFilesIn('ru').map(({ name, file }) => [name, file.name])).toEqual([
      ['Figtree-Regular', 'Mulish-Medium'],
      ['Figtree-SemiBold', 'Mulish-Bold'],
      ['Figtree-Bold', 'Mulish-ExtraBold'],
      ['Figtree-ExtraBold', 'Mulish-Black'],
      ['JetBrainsMono-Regular', 'JetBrainsMono-Regular'],
      ['JetBrainsMono-Medium', 'JetBrainsMono-Medium'],
    ]);
  });

  it.each(['en', 'es'] as const)('keeps Figtree behind every name in %s', (language) => {
    const swapped = registeredFilesIn(language).filter(({ name, file }) => name !== file.name);

    expect(swapped).toEqual([]);
  });

  it.each(registeredFilesIn('ru').map(({ name, file }) => [name, file.path] as const))(
    'draws every letter of the Russian words in the file behind %s',
    (_name, path) => {
      const face = theFaceAt(path);
      const missing = lettersOfTheRussianWords().filter(
        (letter) => face.advanceOf(letter.codePointAt(0) ?? 0) === undefined,
      );

      expect(lettersOfTheRussianWords()).toContain('Ж');
      expect(missing).toEqual([]);
    },
  );

  it('hands the loader the files of the language her phone reads', async () => {
    forgetLanguage();
    const chosen = jest.spyOn(fontsToLoad, 'fontsToLoadIn');

    await render(
      <Fonts>
        <Text>Привет</Text>
      </Fonts>,
    );

    expect(chosen).toHaveBeenCalledWith('ru');
    chosen.mockRestore();
    forgetLanguage();
  });
});
