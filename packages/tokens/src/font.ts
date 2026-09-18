import type { FaceName } from './type';

/** Where the font files sit, as a path from the root of the repository. */
export const fontsRoot = 'apps/mobile/assets/fonts';

export type FontWeightName = 'regular' | 'semiBold';

export interface FontFile {
  /** The name the application registers the file under, and the one a style names. */
  readonly name: string;
  readonly weight: number;
  /** The file, as a path under `fontsRoot`. */
  readonly path: string;
}

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

export const OPEN_FONT_LICENCE = 'SIL Open Font License, Version 1.1';

// Two weights for each face: one for running text and one for emphasis. A third weight is bytes
// in the download that no screen in version 1 asks for.
export const fonts: Readonly<Record<FaceName, FontFamily>> = {
  heading: {
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
  text: {
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
  numeric: {
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

export const faceNames: readonly FaceName[] = ['heading', 'text', 'numeric'];

export const fontWeightNames: readonly FontWeightName[] = ['regular', 'semiBold'];

export const fontFiles: readonly FontFile[] = faceNames.flatMap((name) =>
  fontWeightNames.map((weight) => fonts[name].files[weight]),
);

/** The name a style uses to reach one face at one weight. */
export function fontNameFor(face: FaceName, weight: FontWeightName = 'regular'): string {
  return fonts[face].files[weight].name;
}
