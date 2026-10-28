// The three capitals of the icon, taken from Figtree and kept as outlines, because an svg that
// names a font renders in whatever face the reader happens to have.
//
// Source: Figtree ExtraBold, version 2.001, the file the application ships at
// apps/mobile/assets/fonts/figtree/Figtree-ExtraBold.ttf
// sha256: c86cc3d813f6af7723474ff78ba1d1351254d1f4d4bfeedf58d9e8ed389b1dc4
// Licence: SIL Open Font License 1.1, in apps/mobile/assets/fonts/figtree/OFL.txt.
//
// Coordinates are font units with the baseline at y zero and y rising, each letter starting at x
// zero. The font kerns none of the two pairs, so each letter starts at the advance of the one before.

import type { Letter } from './letters.ts';

export const CAPITALS_UNITS_PER_EM = 1000;

/** The cap height of the cut, which the icon centres the word on. */
export const CAP_HEIGHT = 700;

export interface Capital extends Letter {
  readonly advance: number;
}

export const capitals: readonly Capital[] = [
  {
    character: 'E',
    advance: 587,
    contours: [
      [
        { type: 'M', x: 529, y: 0 },
        { type: 'L', x: 68, y: 0 },
        { type: 'L', x: 68, y: 700 },
        { type: 'L', x: 524, y: 700 },
        { type: 'L', x: 524, y: 552 },
        { type: 'L', x: 229, y: 552 },
        { type: 'L', x: 229, y: 424 },
        { type: 'L', x: 476, y: 424 },
        { type: 'L', x: 476, y: 281 },
        { type: 'L', x: 229, y: 281 },
        { type: 'L', x: 229, y: 148 },
        { type: 'L', x: 529, y: 148 },
        { type: 'L', x: 529, y: 0 },
        { type: 'Z' },
      ],
    ],
  },
  {
    character: 'M',
    advance: 863,
    contours: [
      [
        { type: 'M', x: 229, y: 0 },
        { type: 'L', x: 68, y: 0 },
        { type: 'L', x: 68, y: 700 },
        { type: 'L', x: 245, y: 700 },
        { type: 'L', x: 431, y: 424 },
        { type: 'L', x: 618, y: 700 },
        { type: 'L', x: 795, y: 700 },
        { type: 'L', x: 795, y: 0 },
        { type: 'L', x: 634, y: 0 },
        { type: 'L', x: 634, y: 450 },
        { type: 'L', x: 432, y: 154 },
        { type: 'L', x: 229, y: 450 },
        { type: 'L', x: 229, y: 0 },
        { type: 'Z' },
      ],
    ],
  },
  {
    character: 'I',
    advance: 297,
    contours: [
      [
        { type: 'M', x: 229, y: 0 },
        { type: 'L', x: 68, y: 0 },
        { type: 'L', x: 68, y: 700 },
        { type: 'L', x: 229, y: 700 },
        { type: 'L', x: 229, y: 0 },
        { type: 'Z' },
      ],
    ],
  },
];
