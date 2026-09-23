# The prototype

The markup here is the source of truth for what Emi looks like. It is the Warm Editorial Journal
style, exported from Google Stitch on 2026-09-23.
`docs/design/prototype-design-system.md` is written from it, and every later step of the style
feature builds from that document. So a value that moves here moves everything, and a value that
moves anywhere else has left the prototype behind.

Each screen carries the configuration it draws with, in a script element with the id
`tailwind-config`. All six carry the same one. `tools/pipeline/prototype.test.ts` reads it out of
`screen-0-style-sheet.html` and compares it with the front matter of the design system document,
value for value: the colours, the spacing and the thirteen type roles with their sizes, line
heights, tracking and weights. The corners do not agree yet, and the decision is
https://github.com/atlantic-blue/emi/issues/159.

The eight phase colours are the one thing the configuration does not name. The screens draw the four
arcs and the four labels beside them as plain values inside the ring, so the front matter names the
eight and the check reads them back out of `screen-0-style-sheet.html`.

## The six screens

`screen-0-style-sheet` is the style sheet. It draws the palette, the ring, the type scale, every
component and the grid on one page. It is the screen the configuration and the phase colours are
read from.

`tour-card-1` is the first card of the opening tour. It carries the ring, the cycle day and the
phase name.

`tour-card-4` is the last card of the tour. It carries the price.

`welcome` is the privacy screen of the first run.

`name` asks what Emi should call her.

`year-of-birth` asks the year she was born.

## Copy on these screens that must never be built, because it is false

The tool wrote words that Emi cannot say. Each one is recorded here so that a later step reads the
shape and the spacing off these screens and never the sentences.

`AES-256` and `AES-256-GCM`, on tour card 4 and on the welcome screen. The envelope is
XChaCha20-Poly1305. See `packages/crypto`.

`100% Local Storage` and `Nothing is sent anywhere`, on the welcome screen. Feature 6 sends sealed
days to the server. The server holds ciphertext and no key, which is a different sentence and a true
one.

`local device KeyStore` and `Hardware Keystore`, on the name screen and the welcome screen. The
phone keeps the keys in the keychain, through expo-secure-store.

`Used strictly for age-adjusted cycle variance algorithms`, on the year of birth screen. Nothing in
Emi reads her age. The prediction is the median of her own cycle lengths and the spread of them.

The stock photographs. The welcome screen draws one as a background image, the year of birth screen
draws one as an image element, and the style sheet draws two more. Every one of them is a hosted
file that is not in this repository. The design refuses a body, a face, a flower, a droplet and
blood, and illustration here is abstract.

The account avatar in the header, on the welcome screen, the name screen and the year of birth
screen. There is no account in Emi and no picture of her anywhere.

Four different step counters. Tour card 1 says `1 of 4`, the welcome screen says `01 / 12`, the name
screen says `Step 04 · 15`, and the year of birth screen says `Step 05 / 15`. The tour is four cards
and the first run is three screens, so three of the four counters count something that does not
exist.

The contrast ratios on the style sheet. It prints a figure beside each phase and calls the set
compliant with level AAA and level AA. Those figures are for an ink read against the canvas, not
against the fill the same panel pairs it with. Three of the four inks fail the floor on their own
fill, which is the whole reason no text is ever drawn on a fill. The measured numbers are in the
step that moves the tokens.

## Six values the markup draws that the palette does not hold

The export disagrees with itself in its markup as well as in its prose. Outside the configuration
element, the six screens draw `#faf8f5`, `#f4efea`, `#262220`, `#b83a2a`, `#fbebe8` and `#ede6de`,
and the front matter holds none of them. They are the prose's own palette, and most of them sit on
the swatch panel of the style sheet, which prints them as labels. The canvas value is the one that
travels furthest: the style sheet and tour card 1 both draw it inside the ring.

Read a colour from the front matter and never off the markup. This is recorded rather than gated,
because the markup is committed exactly as the tool wrote it and nothing here may be edited to make
a check pass.

## What the check does not hold

The check reads the configuration, the eight phase colours and nothing else. The words on these
screens are not approved copy, the numbers are invented for the drawing, and several pieces are not
in version 1. Read the markup for the shape, the spacing and the colour, and read `.krewe/design.md`
for what Emi builds.
