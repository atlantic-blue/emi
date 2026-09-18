// The three letters of the wordmark, taken from Fraunces and kept as outlines, because an
// svg that names a font renders in whatever face the reader happens to have.
//
// Source: Fraunces 144pt Soft Regular, version 1.003
// File: fonts/ttf/Fraunces144ptSoft-Regular.ttf in github.com/undercasetype/Fraunces
// Commit: ea507ccb0a2a8a3f8644385c4de7fa3fa1078ffe
// sha256: 69049e704813a805b88023b17a193e297bc20763109f3988ca90868ec2ce8c5d
// Licence: SIL Open Font License 1.1. Designers: Phaedra Charles and Flavia Zimbardi.
//
// Coordinates are font units with the baseline at y zero and y rising, the word starting
// at x zero. The dot of the i is not here: the ring in geometry.ts replaces it.
// brand/logo/README.md says how to draw these again.

export type Command =
  | { readonly type: 'M'; readonly x: number; readonly y: number }
  | { readonly type: 'L'; readonly x: number; readonly y: number }
  | {
      readonly type: 'Q';
      readonly x1: number;
      readonly y1: number;
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: 'Z' };

export interface Letter {
  readonly character: string;
  readonly contours: readonly (readonly Command[])[];
}

export const UNITS_PER_EM = 2000;

/** The x height of the cut, which the lockup uses to measure its air. */
export const X_HEIGHT = 868;

/** The top of the i, where the stem ends and the dot used to start. */
export const STEM_TOP = 882;

/** Where the dot sat, so the ring can take the same place on the line. */
export const DOT = {
  centreX: 2646.5,
  centreY: 1167.5,
  width: 243,
  height: 241,
  bottom: 1047,
} as const;

/** The advance of the whole word, before the ring is drawn. */
export const WORD_ADVANCE = 2873;

export const letters: readonly Letter[] = [
  {
    character: 'e',
    contours: [
      [
        { type: 'M', x: 808, y: 542 },
        { type: 'Q', x1: 808, y1: 475, x: 739, y: 475 },
        { type: 'L', x: 211, y: 475 },
        { type: 'Q', x1: 215, y1: 292, x: 299, y: 196 },
        { type: 'Q', x1: 383, y1: 100, x: 516, y: 100 },
        { type: 'Q', x1: 611, y1: 100, x: 678, y: 151.5 },
        { type: 'Q', x1: 745, y1: 203, x: 766, y: 282 },
        { type: 'Q', x1: 777, y1: 300, x: 789, y: 300 },
        { type: 'Q', x1: 808, y1: 300, x: 806, y: 275 },
        { type: 'Q', x1: 798, y1: 194, x: 751.5, y: 127 },
        { type: 'Q', x1: 705, y1: 60, x: 627, y: 20 },
        { type: 'Q', x1: 549, y1: -20, x: 448, y: -20 },
        { type: 'Q', x1: 325, y1: -20, x: 234, y: 35 },
        { type: 'Q', x1: 143, y1: 90, x: 93, y: 189 },
        { type: 'Q', x1: 43, y1: 288, x: 43, y: 421 },
        { type: 'Q', x1: 43, y1: 556, x: 94, y: 661.5 },
        { type: 'Q', x1: 145, y1: 767, x: 238.5, y: 828 },
        { type: 'Q', x1: 332, y1: 889, x: 461, y: 889 },
        { type: 'Q', x1: 565, y1: 889, x: 643, y: 844 },
        { type: 'Q', x1: 721, y1: 799, x: 764.5, y: 721 },
        { type: 'Q', x1: 808, y1: 643, x: 808, y: 542 },
        { type: 'Z' },
      ],
      [
        { type: 'M', x: 438, y: 831 },
        { type: 'Q', x1: 340, y1: 831, x: 279, y: 750 },
        { type: 'Q', x1: 218, y1: 669, x: 211, y: 523 },
        { type: 'L', x: 587, y: 523 },
        { type: 'Q', x1: 623, y1: 523, x: 623, y: 558 },
        { type: 'Q', x1: 623, y1: 688, x: 571, y: 759.5 },
        { type: 'Q', x1: 519, y1: 831, x: 438, y: 831 },
        { type: 'Z' },
      ],
    ],
  },
  {
    character: 'm',
    contours: [
      [
        { type: 'M', x: 1178, y: 849 },
        { type: 'L', x: 1178, y: 725 },
        { type: 'Q', x1: 1271, y1: 814, x: 1349.5, y: 851 },
        { type: 'Q', x1: 1428, y1: 888, x: 1501, y: 888 },
        { type: 'Q', x1: 1583, y1: 888, x: 1641.5, y: 847 },
        { type: 'Q', x1: 1700, y1: 806, x: 1723, y: 725 },
        { type: 'Q', x1: 1808, y1: 813, x: 1877.5, y: 850.5 },
        { type: 'Q', x1: 1947, y1: 888, x: 2018, y: 888 },
        { type: 'Q', x1: 2212, y1: 888, x: 2246, y: 637 },
        { type: 'L', x: 2317, y: 112 },
        { type: 'Q', x1: 2321, y1: 87, x: 2328, y: 75 },
        { type: 'Q', x1: 2335, y1: 63, x: 2354, y: 59 },
        { type: 'L', x: 2395, y: 51 },
        { type: 'Q', x1: 2416, y1: 42, x: 2416, y: 24 },
        { type: 'Q', x1: 2416, y1: 0, x: 2388, y: 0 },
        { type: 'L', x: 2058, y: 0 },
        { type: 'Q', x1: 2030, y1: 0, x: 2030, y: 24 },
        { type: 'Q', x1: 2030, y1: 41, x: 2050, y: 49 },
        { type: 'L', x: 2099, y: 58 },
        { type: 'Q', x1: 2140, y1: 68, x: 2134, y: 114 },
        { type: 'L', x: 2069, y: 593 },
        { type: 'Q', x1: 2055, y1: 686, x: 2019, y: 733 },
        { type: 'Q', x1: 1983, y1: 780, x: 1916, y: 780 },
        { type: 'Q', x1: 1838, y1: 780, x: 1743, y: 690 },
        { type: 'L', x: 1732, y: 678 },
        { type: 'Q', x1: 1735, y1: 653, x: 1735, y: 626 },
        { type: 'L', x: 1735, y: 111 },
        { type: 'Q', x1: 1735, y1: 66, x: 1771, y: 57 },
        { type: 'L', x: 1813, y: 49 },
        { type: 'Q', x1: 1832, y1: 41, x: 1832, y: 24 },
        { type: 'Q', x1: 1832, y1: 0, x: 1804, y: 0 },
        { type: 'L', x: 1480, y: 0 },
        { type: 'Q', x1: 1452, y1: 0, x: 1452, y: 24 },
        { type: 'Q', x1: 1452, y1: 42, x: 1472, y: 49 },
        { type: 'L', x: 1521, y: 58 },
        { type: 'Q', x1: 1556, y1: 67, x: 1556, y: 116 },
        { type: 'L', x: 1556, y: 593 },
        { type: 'Q', x1: 1556, y1: 686, x: 1511.5, y: 733 },
        { type: 'Q', x1: 1467, y1: 780, x: 1397, y: 780 },
        { type: 'Q', x1: 1348, y1: 780, x: 1297, y: 757 },
        { type: 'Q', x1: 1246, y1: 734, x: 1191, y: 683 },
        { type: 'L', x: 1178, y: 670 },
        { type: 'L', x: 1178, y: 109 },
        { type: 'Q', x1: 1178, y1: 67, x: 1210, y: 58 },
        { type: 'L', x: 1260, y: 49 },
        { type: 'Q', x1: 1279, y1: 42, x: 1279, y: 24 },
        { type: 'Q', x1: 1279, y1: 0, x: 1252, y: 0 },
        { type: 'L', x: 922, y: 0 },
        { type: 'Q', x1: 893, y1: 0, x: 893, y: 24 },
        { type: 'Q', x1: 893, y1: 42, x: 915, y: 51 },
        { type: 'L', x: 965, y: 61 },
        { type: 'Q', x1: 997, y1: 68, x: 997, y: 108 },
        { type: 'L', x: 997, y: 725 },
        { type: 'Q', x1: 997, y1: 756, x: 974, y: 761 },
        { type: 'L', x: 907, y: 762 },
        { type: 'Q', x1: 886, y1: 768, x: 886, y: 785 },
        { type: 'Q', x1: 886, y1: 804, x: 914, y: 814 },
        { type: 'L', x: 1099, y: 871 },
        { type: 'Q', x1: 1118, y1: 878, x: 1129, y: 880 },
        { type: 'Q', x1: 1140, y1: 882, x: 1149, y: 882 },
        { type: 'Q', x1: 1178, y1: 882, x: 1178, y: 849 },
        { type: 'Z' },
      ],
    ],
  },
  {
    character: 'i',
    contours: [
      [
        { type: 'M', x: 2746, y: 850 },
        { type: 'L', x: 2746, y: 110 },
        { type: 'Q', x1: 2746, y1: 69, x: 2778, y: 61 },
        { type: 'L', x: 2828, y: 52 },
        { type: 'Q', x1: 2849, y1: 44, x: 2849, y: 24 },
        { type: 'Q', x1: 2849, y1: 0, x: 2821, y: 0 },
        { type: 'L', x: 2489, y: 0 },
        { type: 'Q', x1: 2461, y1: 0, x: 2461, y: 24 },
        { type: 'Q', x1: 2461, y1: 43, x: 2482, y: 51 },
        { type: 'L', x: 2533, y: 61 },
        { type: 'Q', x1: 2565, y1: 69, x: 2565, y: 109 },
        { type: 'L', x: 2565, y: 726 },
        { type: 'Q', x1: 2565, y1: 756, x: 2542, y: 761 },
        { type: 'L', x: 2476, y: 762 },
        { type: 'Q', x1: 2454, y1: 768, x: 2454, y: 785 },
        { type: 'Q', x1: 2454, y1: 804, x: 2482, y: 814 },
        { type: 'L', x: 2666, y: 871 },
        { type: 'Q', x1: 2700, y1: 882, x: 2717, y: 882 },
        { type: 'Q', x1: 2746, y1: 882, x: 2746, y: 850 },
        { type: 'Z' },
      ],
    ],
  },
];
