# The icon set

Twenty eight line symbols at one weight, so the interface reads as one hand drew it.

## The rules every drawing follows

- A 24 by 24 grid, and nothing is drawn outside it.
- Stroke 1.75, the `stroke.icon` token, on every element. There is one weight and no second one.
- Round caps and round joins.
- A corner radius of 2, the `radius.icon` token, on any rectangle.
- No fill. The drawing is the line.
- The colour is `currentColor`, so the screen that names the icon sets it from the tokens.

## The set

drop, calendar, ring, mood, energy, pain, sleep, temperature, weight, note, lock, export, delete,
settings, chevron, close, plus, check, search, spotting, sun, edit, chart, shield, skin, digestion,
headache, bloating.

`spotting` is the mark for unexpected bleeding: a smaller drop with three marks beside it, so it
reads apart from `drop` at 24 points.

`mood` is a circle with one curve in it, and no eyes. A face in an icon is a picture a stranger can
read over her shoulder, which the design refuses.

`settings` is two sliders rather than a gear, because a gear at this weight on this grid loses its
teeth.

The last four are the symptom tiles the first run asks for, and each one draws the sensation rather
than the part of her it happens to. `skin` is a patch of surface with a texture on it. `digestion`
is a folded tube. `headache` is a circle with a crack through it. `bloating` is a form with the
ground pushed out on both sides. None of them draws a body, a face, a flower, a droplet or blood,
which is the refusal in BRAND-4.

## Adding one

Draw the file, then run the generator:

    node brand/icons/generate.ts

It writes `packages/tokens/src/icons.ts` and `brand/icons/contact-sheet.svg`. Do not edit either by
hand. A drawing that breaks one of the rules above is refused by the generator, which names the
file and what it found and writes nothing at all. A name in the module with no file, a file with no
name, or a second stroke weight anywhere also fails the test in
`apps/mobile/tests/integration/1.5.test.ts`.

The generator reads this directory and writes those two files. Give it `--from`, `--module` and
`--sheet` to point it at a directory of its own, which is how the test drives it over a drawing
that has to be refused.

## The picture

`contact-sheet.png` is `contact-sheet.svg` drawn at 24 points in a headless browser, at 480 by 576:

    chrome --headless --screenshot=contact-sheet.png --window-size=480,576 <a page holding the sheet at its natural size>

Regenerate the sheet whenever a drawing changes. The sheet is five columns wide, so its height
moves every time the set crosses a row.
