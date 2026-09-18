# brand

Everything that is drawn rather than written: the mark, the icon set and the tests that keep both
honest. Nothing here ships to a phone as source. The drawings are the source, and the application
reads what they generate.

## What is inside

`logo/` holds the wordmark, the ring and the lockup, all three drawn by one program from one set of
numbers. `logo/README.md` says what the numbers are.

`icons/` holds the first twenty line symbols and the contact sheet. `icons/README.md` says the rules
every drawing follows. Running `icons/generate.ts` reads the directory and writes
`packages/tokens/src/icons.ts`, so adding an icon means adding one file and running it again.

`tests/` reads the three logo files and compares each one against what the generator draws now, so
a file edited by hand, or left behind after a change to the geometry, fails the run. The icon set is
checked from `packages/tokens/tests/icons.test.ts`, beside the module it writes.

## How to run it

From the root of the repository:

    npm run generate:logo
    npm run test:workspace

The icon set has its own generator, which needs no install of its own:

    node --experimental-strip-types brand/icons/generate.ts

## The trap

A drawing is generated and never edited. An svg file in this directory is output, so a hand edit is
overwritten the next time somebody runs the generator, and the test fails before that anyway. Change
the numbers in `logo/geometry.ts`, or the drawing in the icon source, and generate again.

The second rule is the colour. A generator imports `packages/tokens`, and an icon leaves its colour
as `currentColor` so the screen that names it sets the value. Nobody types a hex value into a source
file here, and the lint rule refuses one.
