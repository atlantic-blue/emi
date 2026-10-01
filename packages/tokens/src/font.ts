import type { FaceName, TypeWeight } from './type';

/** Where the font files sit, as a path from the root of the repository. */
export const fontsRoot = 'apps/mobile/assets/fonts';

/**
 * The weights that ship. A style that names a weight no file carries leaves the platform to
 * imitate it, so a weight arrives as a file first.
 */
export type FontWeightName = 'regular' | 'medium' | 'semiBold' | 'bold' | 'extraBold';

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

/**
 * The two families this repository redistributes. One carries every word of the application and the
 * other carries the recovery code, where a reader has to tell one character from another.
 */
export type FontFamilyName = 'figtree' | 'jetBrainsMono';

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
 * Figtree ships as a variable font and as static cuts. The static cuts ship here, because React
 * Native reaches only the default instance of a variable file, and the redesign asks for four
 * weights.
 */
export const fonts: Readonly<Record<FontFamilyName, FontFamily>> = {
  figtree: {
    family: 'Figtree',
    licence: OPEN_FONT_LICENCE,
    licencePath: 'figtree/OFL.txt',
    copyright:
      'Copyright 2022 The Figtree Project Authors (https://github.com/erikdkennedy/figtree)',
    source: 'https://github.com/erikdkennedy/figtree',
    weights: ['regular', 'semiBold', 'bold', 'extraBold'],
    files: {
      regular: { name: 'Figtree-Regular', weight: 400, path: 'figtree/Figtree-Regular.ttf' },
      semiBold: { name: 'Figtree-SemiBold', weight: 600, path: 'figtree/Figtree-SemiBold.ttf' },
      bold: { name: 'Figtree-Bold', weight: 700, path: 'figtree/Figtree-Bold.ttf' },
      extraBold: {
        name: 'Figtree-ExtraBold',
        weight: 800,
        path: 'figtree/Figtree-ExtraBold.ttf',
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
export const fontFamilyNames: readonly FontFamilyName[] = ['figtree', 'jetBrainsMono'];

/** Which family draws each face of the design system. Every face has one and every family is drawn. */
export const faceFamily: Readonly<Record<FaceName, FontFamilyName>> = {
  display: 'figtree',
  text: 'figtree',
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

/**
 * A cut that ships while no role of the design system asks for its weight.
 *
 * No role of the redesign asks for JetBrains Mono at 400: the recovery code is set in the medium
 * cut. The regular cut stays because the type specimen draws it: its stacked digits panel is set in
 * the regular cut, so a shifting digit is read at the weight a reader of the specimen compares
 * against. `brand/tests/specimen.test.tsx` holds that page to it, so a specimen that stopped drawing
 * the cut reddens rather than leaving this entry standing.
 *
 * The application still loads it, which is a file on the phone no screen draws. Whether the phone
 * keeps carrying it is a decision about the bundle, and it is recorded here one cut at a time rather
 * than allowed as a class, so a cut added on either side reddens the check that reads them.
 */
export const cutsNoRoleAsksFor: readonly string[] = ['JetBrainsMono-Regular'];

/** The files the application loads, which is every file that ships, because every face is drawn. */
export const applicationFontFiles: readonly FontFile[] = fontFiles;

/** Which file carries a weight, for any family. The three weights map onto the three cuts. */
export const weightFiles: Readonly<Record<TypeWeight, FontWeightName>> = {
  400: 'regular',
  500: 'medium',
  600: 'semiBold',
  700: 'bold',
  800: 'extraBold',
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
