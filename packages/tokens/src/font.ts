import type { FaceName, TypeWeight } from './type';

/** Where the font files sit, as a path from the root of the repository. */
export const fontsRoot = 'apps/mobile/assets/fonts';

/**
 * The weights that ship. A style that names a weight no file carries leaves the platform to
 * imitate it, so a weight arrives as a file first.
 */
export type FontWeightName = 'regular' | 'medium' | 'semiBold';

/**
 * One file on disk, and the name the application registers it under. The two strings differ, so a
 * style names the registered name and never the path.
 */
export interface FontFile {
  /** The name the application registers the file under, and the one a style names. */
  readonly name: string;
  readonly weight: number;
  /** The file, as a path under `fontsRoot`. */
  readonly path: string;
}

/** The three families this repository redistributes, one for each face of the design system. */
export type FontFamilyName = 'newsreader' | 'plusJakartaSans' | 'jetBrainsMono';

/**
 * A family, its files, and the terms they travel under. A test reads the licence fields against the
 * file on disk, so a family cannot ship without its licence beside it.
 */
export interface FontFamily {
  /** What the foundry calls the cut that ships, which can be narrower than the design's name. */
  readonly family: string;
  readonly licence: string;
  /** The licence file, as a path under `fontsRoot`. */
  readonly licencePath: string;
  /** The first line of that file, so a swapped licence is caught rather than trusted. */
  readonly copyright: string;
  /** A name the licence reserves, which a modified build may not keep. Absent when it reserves none. */
  readonly reservedName?: string;
  readonly source: string;
  /** The weights this family ships, lightest first. A family carries the cuts a screen asks of it. */
  readonly weights: readonly FontWeightName[];
  readonly files: Readonly<Partial<Record<FontWeightName, FontFile>>>;
}

/**
 * The only terms Emi accepts for a face, because this repository is public and the files ship
 * inside the application.
 */
export const OPEN_FONT_LICENCE = 'SIL Open Font License, Version 1.1';

/**
 * Each family ships the cuts its own roles ask for and no others, because a weight nobody asks for
 * is bytes in the download.
 *
 * Newsreader carries an optical size axis and the repository ships one static cut of it. The cut is
 * `16pt`. The display roles run from 20 to 48 points, and the 72pt cut is drawn for sizes far above
 * that, so it reads thin where most of Emi's headlines sit. The two cuts were not compared on a
 * device; if the 16pt cut reads heavy at 48 points, the replacement is the 72pt cut at the same two
 * weights.
 */
export const fonts: Readonly<Record<FontFamilyName, FontFamily>> = {
  newsreader: {
    family: 'Newsreader 16pt',
    licence: OPEN_FONT_LICENCE,
    licencePath: 'newsreader/OFL.txt',
    copyright:
      'Copyright 2020 The Newsreader Project Authors (http://github.com/productiontype/Newsreader)',
    source: 'https://github.com/productiontype/Newsreader',
    weights: ['regular', 'medium'],
    files: {
      regular: {
        name: 'Newsreader16pt-Regular',
        weight: 400,
        path: 'newsreader/Newsreader16pt-Regular.ttf',
      },
      medium: {
        name: 'Newsreader16pt-Medium',
        weight: 500,
        path: 'newsreader/Newsreader16pt-Medium.ttf',
      },
    },
  },
  plusJakartaSans: {
    family: 'Plus Jakarta Sans',
    licence: OPEN_FONT_LICENCE,
    licencePath: 'plus-jakarta-sans/OFL.txt',
    copyright:
      'Copyright 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans)',
    source: 'https://github.com/tokotype/PlusJakartaSans',
    weights: ['regular', 'semiBold'],
    files: {
      regular: {
        name: 'PlusJakartaSans-Regular',
        weight: 400,
        path: 'plus-jakarta-sans/PlusJakartaSans-Regular.ttf',
      },
      semiBold: {
        name: 'PlusJakartaSans-SemiBold',
        weight: 600,
        path: 'plus-jakarta-sans/PlusJakartaSans-SemiBold.ttf',
      },
    },
  },
  jetBrainsMono: {
    family: 'JetBrains Mono',
    licence: OPEN_FONT_LICENCE,
    licencePath: 'jetbrains-mono/OFL.txt',
    copyright:
      'Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)',
    source: 'https://github.com/JetBrains/JetBrainsMono',
    weights: ['regular', 'medium'],
    files: {
      regular: {
        name: 'JetBrainsMono-Regular',
        weight: 400,
        path: 'jetbrains-mono/JetBrainsMono-Regular.ttf',
      },
      medium: {
        name: 'JetBrainsMono-Medium',
        weight: 500,
        path: 'jetbrains-mono/JetBrainsMono-Medium.ttf',
      },
    },
  },
};

/** The families as data. A test walks this to prove each has its files and its licence on disk. */
export const fontFamilyNames: readonly FontFamilyName[] = [
  'newsreader',
  'plusJakartaSans',
  'jetBrainsMono',
];

/** Which family draws each face of the design system. Every face has one and every family is drawn. */
export const faceFamily: Readonly<Record<FaceName, FontFamilyName>> = {
  display: 'newsreader',
  text: 'plusJakartaSans',
  data: 'jetBrainsMono',
};

/**
 * One file of one family, by name. A family carries only the cuts it ships, so asking it for a
 * weight it never had is a mistake worth stopping on rather than an empty answer to carry forward.
 */
export function fontFile(family: FontFamilyName, weight: FontWeightName): FontFile {
  const file = fonts[family].files[weight];

  if (file === undefined) {
    throw new Error(`${fonts[family].family} ships no ${weight} cut`);
  }

  return file;
}

/**
 * The six files that ship. A test reads the assets directory against this list, so a file that
 * nobody names is found rather than carried.
 */
export const fontFiles: readonly FontFile[] = fontFamilyNames.flatMap((name) =>
  fonts[name].weights.map((weight) => fontFile(name, weight)),
);

/** The files the application loads, which is every file that ships, because every face is drawn. */
export const applicationFontFiles: readonly FontFile[] = fontFiles;

/** Which file carries a weight, for any family. The three weights map onto the three cuts. */
export const weightFiles: Readonly<Record<TypeWeight, FontWeightName>> = {
  400: 'regular',
  500: 'medium',
  600: 'semiBold',
};

/**
 * The file one face draws at the weight a role asks for.
 *
 * This took a weight alone while the product was drawn in one family. A call that still passes one
 * would have reached whatever family sorted first, so it is refused by name rather than answered.
 */
export function fontFileFor(faceName: FaceName, weight: TypeWeight): FontFile {
  if (typeof faceName !== 'string') {
    throw new TypeError(
      'a font is asked for by face and then weight, as in fontFileFor("text", 400). Emi draws in three families, so a weight on its own names no file.',
    );
  }

  return fontFile(faceFamily[faceName], weightFiles[weight]);
}

/** The name a style uses to reach that file. A style names the registered name and never the path. */
export function fontNameFor(faceName: FaceName, weight: TypeWeight): string {
  return fontFileFor(faceName, weight).name;
}
