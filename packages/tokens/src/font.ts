import type { TypeWeight } from './type';

/** Where the font files sit, as a path from the root of the repository. */
export const fontsRoot = 'apps/mobile/assets/fonts';

/**
 * The two weights that ship. A style that names a weight no file carries leaves the platform to
 * imitate it, so a third weight arrives as a file first.
 */
export type FontWeightName = 'regular' | 'semiBold';

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
 * The families this repository redistributes. Only the first one is drawn: step 9.1 put the whole
 * product in one face. The other two keep their files and their licence records, because they are
 * still here and a reader of a public repository is owed the terms of everything in it.
 */
export type FontFamilyName = 'plusJakartaSans' | 'fraunces' | 'ibmPlexMono';

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
  readonly files: Readonly<Record<FontWeightName, FontFile>>;
}

/**
 * The only terms Emi accepts for a face, because this repository is public and the files ship
 * inside the application.
 */
export const OPEN_FONT_LICENCE = 'SIL Open Font License, Version 1.1';

/**
 * Two weights for each face: one for running text and one for emphasis. A third weight is bytes
 * in the download that no screen in version 1 asks for.
 */
export const fonts: Readonly<Record<FontFamilyName, FontFamily>> = {
  plusJakartaSans: {
    family: 'Plus Jakarta Sans',
    licence: OPEN_FONT_LICENCE,
    licencePath: 'plus-jakarta-sans/OFL.txt',
    copyright:
      'Copyright 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans)',
    source: 'https://github.com/tokotype/PlusJakartaSans',
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
  fraunces: {
    family: 'Fraunces 72pt Soft',
    licence: OPEN_FONT_LICENCE,
    licencePath: 'fraunces/OFL.txt',
    copyright:
      'Copyright 2018 The Fraunces Project Authors (https://github.com/undercasetype/Fraunces)',
    source: 'https://github.com/undercasetype/Fraunces',
    files: {
      regular: {
        name: 'Fraunces72ptSoft-Regular',
        weight: 400,
        path: 'fraunces/Fraunces72ptSoft-Regular.ttf',
      },
      semiBold: {
        name: 'Fraunces72ptSoft-SemiBold',
        weight: 600,
        path: 'fraunces/Fraunces72ptSoft-SemiBold.ttf',
      },
    },
  },
  ibmPlexMono: {
    family: 'IBM Plex Mono',
    licence: OPEN_FONT_LICENCE,
    licencePath: 'ibm-plex-mono/OFL.txt',
    copyright: 'Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"',
    reservedName: 'Plex',
    source: 'https://github.com/google/fonts/tree/main/ofl/ibmplexmono',
    files: {
      regular: {
        name: 'IBMPlexMono-Regular',
        weight: 400,
        path: 'ibm-plex-mono/IBMPlexMono-Regular.ttf',
      },
      semiBold: {
        name: 'IBMPlexMono-SemiBold',
        weight: 600,
        path: 'ibm-plex-mono/IBMPlexMono-SemiBold.ttf',
      },
    },
  },
};

/** The families as data. A test walks this to prove each has its files and its licence on disk. */
export const fontFamilyNames: readonly FontFamilyName[] = [
  'plusJakartaSans',
  'fraunces',
  'ibmPlexMono',
];

/** The one family every screen is drawn in. */
export const DRAWN_FAMILY: FontFamilyName = 'plusJakartaSans';

/** The weights as data, so the list of files is built from the faces rather than typed twice. */
export const fontWeightNames: readonly FontWeightName[] = ['regular', 'semiBold'];

/**
 * The six files that ship. A test reads the assets directory against this list, so a file that
 * nobody names is found rather than carried.
 */
export const fontFiles: readonly FontFile[] = fontFamilyNames.flatMap((name) =>
  fontWeightNames.map((weight) => fonts[name].files[weight]),
);

/**
 * The files the application loads, which is the drawn family and nothing else. Two files rather
 * than six is four fewer in the download, and four fewer faces a screen could reach for.
 */
export const applicationFontFiles: readonly FontFile[] = fontWeightNames.map(
  (weight) => fonts[DRAWN_FAMILY].files[weight],
);

/**
 * Which file carries a weight. The design system asks for 400, 500, 600 and 700, and this
 * repository holds the regular and the semibold cut, so 500 and 700 are drawn in the semibold file
 * rather than left to the renderer to thicken. The two missing files are named in
 * docs/licences.md.
 */
export const weightFiles: Readonly<Record<TypeWeight, FontWeightName>> = {
  400: 'regular',
  500: 'semiBold',
  600: 'semiBold',
  700: 'semiBold',
};

/** The name a style uses to reach the drawn family at the weight a role asks for. */
export function fontNameFor(weight: TypeWeight): string {
  return fonts[DRAWN_FAMILY].files[weightFiles[weight]].name;
}
