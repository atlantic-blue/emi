import { type FontFile, applicationFontFiles, russianStandIns } from '@emi/tokens';

import type { Language } from '../../language/language';

/**
 * Each file the application can draw in, mapped from the path the token package names to the
 * module the bundler resolves. The bundler reads a path out of the source, so the paths are written
 * here and nowhere else, and the map is built from the token package rather than typed beside it: a
 * file added there fails this module rather than being quietly left unloaded.
 */

const modules: Readonly<Record<string, number>> = {
  'figtree/Figtree-Regular.ttf': require('../../../assets/fonts/figtree/Figtree-Regular.ttf'),
  'figtree/Figtree-SemiBold.ttf': require('../../../assets/fonts/figtree/Figtree-SemiBold.ttf'),
  'figtree/Figtree-Bold.ttf': require('../../../assets/fonts/figtree/Figtree-Bold.ttf'),
  'figtree/Figtree-ExtraBold.ttf': require('../../../assets/fonts/figtree/Figtree-ExtraBold.ttf'),
  'jetbrains-mono/JetBrainsMono-Regular.ttf': require('../../../assets/fonts/jetbrains-mono/JetBrainsMono-Regular.ttf'),
  'jetbrains-mono/JetBrainsMono-Medium.ttf': require('../../../assets/fonts/jetbrains-mono/JetBrainsMono-Medium.ttf'),
  'mulish/Mulish-Medium.ttf': require('../../../assets/fonts/mulish/Mulish-Medium.ttf'),
  'mulish/Mulish-Bold.ttf': require('../../../assets/fonts/mulish/Mulish-Bold.ttf'),
  'mulish/Mulish-ExtraBold.ttf': require('../../../assets/fonts/mulish/Mulish-ExtraBold.ttf'),
  'mulish/Mulish-Black.ttf': require('../../../assets/fonts/mulish/Mulish-Black.ttf'),
};

export interface RegisteredFile {
  readonly name: string;
  readonly file: FontFile;
}

/** Every style names the same six faces in every language. Only the file behind a name changes. */
export function registeredFilesIn(language: Language): readonly RegisteredFile[] {
  return applicationFontFiles.map((file) => ({
    name: file.name,
    file: language === 'ru' ? (russianStandIns[file.name] ?? file) : file,
  }));
}

/** What the loader is handed: the registered name of each file against the file itself. */
export function fontsToLoadIn(language: Language): Readonly<Record<string, number>> {
  return Object.fromEntries(
    registeredFilesIn(language).map(({ name, file }) => {
      const module = modules[file.path];

      if (module === undefined) {
        throw new Error(
          `${file.path} is named in @emi/tokens and no module here carries it, so ${name} would never load`,
        );
      }

      return [name, module];
    }),
  );
}
