# brand

Everything that is drawn rather than written: the mark, the icon set, the type specimen and the
tests that keep them honest. Nothing here ships to a phone as source. The drawings are the source, and the application
reads what they generate.

## What is inside

`logo/` holds the wordmark, the ring and the lockup, all three drawn by one program from one set of
numbers. `logo/README.md` says what the numbers are.

`icon/` holds the application icon generator. It reads `logo/emi-ring.svg`, puts the ring on the
stone ground at 56 percent of the width, and writes every size both stores ask for into
`apps/mobile/assets/icon`. `icon/sizes.ts` holds the two lists, with the reason beside each size.
It measures its own result and refuses to write when the ring misses the fraction.

`icons/` holds the first twenty line symbols and the contact sheet. `icons/README.md` says the rules
every drawing follows. Running `icons/generate.ts` reads the directory and writes
`packages/tokens/src/icons.ts`, so adding an icon means adding one file and running it again.

`specimen/` draws one page of the three faces at all six sizes, in sentences Emi writes. It reads
the type scale and the font files from `packages/tokens`, so the page cannot name a size or a file
the application does not have. The fonts themselves live in `apps/mobile/assets/fonts`, because they
ship inside the application, and `docs/licences.md` names the licence each one travels under.

`jsx/` is the markup a page is written in. A generator writes a page as markup and gets a string of
html back, which a browser then draws. `jsx/register.ts` is what lets Node read a `.tsx` file at all,
because Node strips types from a `.ts` file on its own and does nothing with the markup in a `.tsx`
one.

`tests/` reads the three logo files and compares each one against what the generator draws now, so
a file edited by hand, or left behind after a change to the geometry, fails the run. The icon set is
checked from `packages/tokens/tests/icons.test.ts`, beside the module it writes.

## How to run it

From the root of the repository:

    npm run generate:app-icon
    npm run generate:logo
    npm run generate:specimen
    npm run test:workspace

The icon set has its own generator, which needs no install of its own:

    node --experimental-strip-types brand/icons/generate.ts

## The trap

A drawing is generated and never edited. An svg file in this directory is output, so a hand edit is
overwritten the next time somebody runs the generator, and the test fails before that anyway. Change
the numbers in `logo/geometry.ts`, or the drawing in the icon source, and generate again.

The specimen has a trap of its own. It draws through a browser, so it needs one, and it looks for
a Chromium or Chrome binary in the usual places. Set `EMI_BROWSER` to the binary when it cannot find
yours.

The second rule is the colour. A generator imports `packages/tokens`, and an icon leaves its colour
as `currentColor` so the screen that names it sets the value. Nobody types a hex value into a source
file here, and the lint rule refuses one.
