# The mark

Three files, all drawn by one program from one set of numbers.

    brand/logo/emi-wordmark.svg   the word, with the ring as the dot of the i
    brand/logo/emi-ring.svg       the ring on its own, square, which the icon uses
    brand/logo/emi-lockup.svg     the word on the stone ground, with its air

Redraw them after any change to the geometry or the letters:

    npm run generate:logo

A test compares each committed file against what the program draws now, so a file that was
edited by hand, or left behind after a change, fails the build.

## What the numbers are

The word is `emi` in Fraunces, lowercase, in ember on stone.

The dot of the i is gone. In its place is a ring, stroked as thick as the stem of the i, so the
ring carries the weight of ink the letter carries. Its centre line radius is 1.7 stroke widths,
which leaves a hole wider than the stroke around it. Below about 1.5 the hole is narrower than
the stroke and the mark reads as a thick crescent.

The ring sits one stroke of air above the top of the stem, which is close to the air the dot had.
The lockup keeps two strokes of air on all four sides.

The gap is 40 degrees wide and it opens at the upper left, so the eye reads a motion that
continues rather than a circle that broke. Nothing else in the wordmark is drawn.

## Why the letters are outlines

`brand/logo/letters.ts` holds the three letters as outlines rather than as a font name. An svg
that names a font renders in whatever face the reader happens to have, which for a logo is a
different logo.

The outlines came from Fraunces 144pt Soft Regular. The file, its commit and its sha256 are in
the header of `letters.ts`. The licence is the SIL Open Font License 1.1.

To draw them again from the font:

1. Take `fonts/ttf/Fraunces144ptSoft-Regular.ttf` from `github.com/undercasetype/Fraunces` at the
   commit named in `letters.ts`, and check its sha256 against the one recorded there.
2. Read the outlines of `e`, `m` and `i` at their pen positions, with the kerning the font gives.
   All three kerns are zero in this cut.
3. Keep font units, the baseline at y zero, y rising, and the word starting at x zero.
4. Drop the contour of the dot of the i. The ring replaces it.
5. Write the same constants the file exports: the units per em, the x height, the top of the
   stem, where the dot sat, and the advance of the word.

The step that drew this used opentype.js to read the font. It is not a dependency of this
repository, because nothing in the build needs to open a font: the outlines are data now.

## What proves it

`brand/tests/1.3.test.ts` rasterises the mark at 16, 64 and 512 points, at four alignments
against the pixel grid, and asks whether the ground still runs through the gap into the hole. At
16 points, the smallest the mark is drawn, the channel of ground through the gap is 1.26 pixels
wide. A channel under one pixel cannot come out as ground anywhere, so the test refuses it.
