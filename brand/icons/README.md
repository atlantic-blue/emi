# The first twenty icons

Twenty line symbols at one weight, so the interface reads as one hand drew it.

## The rules every drawing follows

- A 24 by 24 grid, and nothing is drawn outside it.
- Stroke 1.75, the `stroke.icon` token, on every element. There is one weight and no second one.
- Round caps and round joins.
- A corner radius of 2, the `radius.icon` token, on any rectangle.
- No fill. The drawing is the line.
- The colour is `currentColor`, so the screen that names the icon sets it from the tokens.

## The set

drop, calendar, ring, mood, energy, pain, sleep, temperature, weight, note, lock, export, delete,
settings, chevron, close, plus, check, search, spotting.

`spotting` is the mark for unexpected bleeding: a smaller drop with three marks beside it, so it
reads apart from `drop` at 24 points.

`mood` is a circle with one curve in it, and no eyes. A face in an icon is a picture a stranger can
read over her shoulder, which the design refuses.

`settings` is two sliders rather than a gear, because a gear at this weight on this grid loses its
teeth.

## Adding one

Draw the file, then run the generator:

    node brand/icons/generate.ts

It writes `packages/tokens/src/icons.ts` and `brand/icons/contact-sheet.svg`. Do not edit either by
hand. A name in the module with no file, a file with no name, or a second stroke weight anywhere
fails the test in `apps/mobile/tests/integration/1.5.test.ts`.

## The picture

`contact-sheet.png` is `contact-sheet.svg` drawn at 24 points in a headless browser, at 480 by 384:

    chrome --headless --screenshot=contact-sheet.png <a page holding the sheet at its natural size>

Regenerate the sheet whenever a drawing changes.
