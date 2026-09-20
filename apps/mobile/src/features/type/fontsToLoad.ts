import { applicationFontFiles } from '@emi/tokens';

/**
 * The four files the application draws in, each mapped from the path the token package names to the
 * module the bundler resolves. The bundler reads a path out of the source, so the paths are written
 * here and nowhere else, and the map is built from the token package rather than typed beside it: a
 * file added there fails this module rather than being quietly left unloaded.
 */

const modules: Readonly<Record<string, number>> = {
  'plus-jakarta-sans/PlusJakartaSans-Regular.ttf': require('../../../assets/fonts/plus-jakarta-sans/PlusJakartaSans-Regular.ttf'),
  'plus-jakarta-sans/PlusJakartaSans-Medium.ttf': require('../../../assets/fonts/plus-jakarta-sans/PlusJakartaSans-Medium.ttf'),
  'plus-jakarta-sans/PlusJakartaSans-SemiBold.ttf': require('../../../assets/fonts/plus-jakarta-sans/PlusJakartaSans-SemiBold.ttf'),
  'plus-jakarta-sans/PlusJakartaSans-Bold.ttf': require('../../../assets/fonts/plus-jakarta-sans/PlusJakartaSans-Bold.ttf'),
};

/** What the loader is handed: the registered name of each file against the file itself. */
export const fontsToLoad: Readonly<Record<string, number>> = Object.fromEntries(
  applicationFontFiles.map((file) => {
    const module = modules[file.path];

    if (module === undefined) {
      throw new Error(
        `${file.path} is named in @emi/tokens and no module here carries it, so ${file.name} would never load`,
      );
    }

    return [file.name, module];
  }),
);
