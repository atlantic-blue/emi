# The brand

This document is generated from the token package. Nobody writes it by hand. Every value here is the
value the application uses. Run `npm run generate:brand` after a token changes. The pipeline runs
`npm run check:brand`. It fails when the committed copy and the generator disagree by one character.

## The palette

Status: built

The token package declares 40 colours, in this order. A role says where a colour can go. A ground is
a surface to sit on. A text colour carries words. A fill paints an arc of the ring. A line draws a
hairline.

- `ground` is `#FFF8F3` and carries the role ground.
- `card` is `#FFFFFF` and carries the role ground.
- `field` is `#FFF2EB` and carries the role ground.
- `line` is `#F1E1D6` and carries the role line.
- `darkCard` is `#4A2A2E` and carries the roles ground and fill.
- `text` is `#2E2224` and carries the role text.
- `secondaryText` is `#76625F` and carries the role text.
- `onAccent` is `#FFFFFF` and carries the role text.
- `accent` is `#B8434E` and carries the roles ground, fill and text.
- `accentPressed` is `#8E2F3A` and carries the roles ground, fill and text.
- `accentSoft` is `#FFDCDC` and carries the roles ground and fill.
- `accentSoftInk` is `#AF404A` and carries the role text.
- `accentTile` is `#F9E3E1` and carries the roles ground and fill.
- `dockQuiet` is `#826F69` and carries the role text.
- `pickerNear` is `#866E65` and carries the role text.
- `pickerFar` is `#906B59` and carries the role text.
- `disabledLabel` is `#C9B4AA` and carries the role line.
- `quietIcon` is `#B49F96` and carries the role line.
- `warmIcon` is `#A0521A` and carries the role text.
- `dotOff` is `#EFDCCF` and carries the role fill.
- `stepTrack` is `#F3E2D6` and carries the role fill.
- `emptyRing` is `#E6CFC2` and carries the role line.
- `uncheckedRing` is `#D9C2B6` and carries the role line.
- `period` is `#B8434E` and carries the role fill.
- `periodInk` is `#8E2F3A` and carries the role text.
- `follicular` is `#F5DCCB` and carries the role fill.
- `follicularInk` is `#2E2224` and carries the role text.
- `ovulation` is `#E9A15F` and carries the role fill.
- `ovulationInk` is `#8A4A1C` and carries the role text.
- `luteal` is `#C27E86` and carries the role fill.
- `lutealInk` is `#7E3E48` and carries the role text.
- `washWarm` is `#FFE8CD` and carries the roles ground and fill.
- `washAmber` is `#FFD6BA` and carries the roles ground and fill.
- `washRose` is `#F6D3D0` and carries the role fill.
- `washBlush` is `#FBE6E2` and carries the role fill.
- `washPink` is `#FFE6EE` and carries the role fill.
- `notificationMiddle` is `#8A4A52` and carries the role fill.
- `notificationEnd` is `#E9A07A` and carries the role fill.
- `platformLine` is `#E6D6CC` and carries the role line.
- `platformBlue` is `#1F6FD1` and carries the role text.

## Colour, measured

Status: built

The function `contrastRatio` in `packages/tokens/src/colour.ts` measures every ratio below. The
contrast test reads the same function. Level AA of the Web Content Accessibility Guidelines asks for
4.5 to 1 for normal text. A pair below 4.5 is refused here, and the test refuses it too.

These 34 pairs are approved:

- text on ground is 14.57 to 1
- text on card is 15.32 to 1
- text on field is 13.98 to 1
- secondaryText on ground is 5.42 to 1
- secondaryText on card is 5.70 to 1
- secondaryText on field is 5.20 to 1
- onAccent on accent is 5.32 to 1
- onAccent on darkCard is 12.64 to 1
- accent on ground is 5.06 to 1
- accent on card is 5.32 to 1
- accent on field is 4.85 to 1
- accentPressed on ground is 7.63 to 1
- accentPressed on card is 8.02 to 1
- accentPressed on field is 7.32 to 1
- accentPressed on accentSoft is 6.31 to 1
- accentSoftInk on accentSoft is 4.52 to 1
- dockQuiet on ground is 4.51 to 1
- dockQuiet on card is 4.74 to 1
- pickerNear on ground is 4.51 to 1
- pickerNear on card is 4.74 to 1
- pickerFar on ground is 4.51 to 1
- pickerFar on card is 4.74 to 1
- warmIcon on ground is 5.37 to 1
- warmIcon on card is 5.65 to 1
- warmIcon on field is 5.15 to 1
- periodInk on ground is 7.63 to 1
- periodInk on card is 8.02 to 1
- follicularInk on ground is 14.57 to 1
- follicularInk on card is 15.32 to 1
- ovulationInk on ground is 6.49 to 1
- ovulationInk on card is 6.82 to 1
- lutealInk on ground is 7.48 to 1
- lutealInk on card is 7.87 to 1
- platformBlue on card is 4.94 to 1

These 75 pairs are refused, in order of ratio. A text colour is approved only on the grounds above.
The nearest misses come first.

- secondaryText on accentSoft is 4.49 to 1
- accent on washWarm is 4.47 to 1
- warmIcon on accentSoft is 4.45 to 1
- accent on accentTile is 4.33 to 1
- dockQuiet on field is 4.33 to 1
- pickerNear on field is 4.32 to 1
- pickerFar on field is 4.32 to 1
- accentSoftInk on washAmber is 4.26 to 1
- secondaryText on washAmber is 4.23 to 1
- warmIcon on washAmber is 4.19 to 1
- accent on accentSoft is 4.18 to 1
- platformBlue on washWarm is 4.16 to 1
- platformBlue on accentTile is 4.02 to 1
- dockQuiet on washWarm is 3.99 to 1
- pickerNear on washWarm is 3.99 to 1
- pickerFar on washWarm is 3.99 to 1
- accent on washAmber is 3.94 to 1
- platformBlue on accentSoft is 3.89 to 1
- dockQuiet on accentTile is 3.86 to 1
- pickerNear on accentTile is 3.86 to 1
- pickerFar on accentTile is 3.86 to 1
- dockQuiet on accentSoft is 3.73 to 1
- pickerNear on accentSoft is 3.73 to 1
- pickerFar on accentSoft is 3.73 to 1
- platformBlue on washAmber is 3.66 to 1
- dockQuiet on washAmber is 3.52 to 1
- pickerNear on washAmber is 3.52 to 1
- pickerFar on washAmber is 3.51 to 1
- text on accent is 2.88 to 1
- follicularInk on accent is 2.88 to 1
- pickerFar on darkCard is 2.67 to 1
- pickerNear on darkCard is 2.67 to 1
- dockQuiet on darkCard is 2.66 to 1
- platformBlue on darkCard is 2.56 to 1
- accent on darkCard is 2.38 to 1
- warmIcon on darkCard is 2.24 to 1
- secondaryText on darkCard is 2.22 to 1
- accentSoftInk on darkCard is 2.20 to 1
- text on accentPressed is 1.91 to 1
- follicularInk on accentPressed is 1.91 to 1
- ovulationInk on darkCard is 1.85 to 1
- pickerFar on accentPressed is 1.69 to 1
- pickerNear on accentPressed is 1.69 to 1
- dockQuiet on accentPressed is 1.69 to 1
- platformBlue on accentPressed is 1.62 to 1
- lutealInk on darkCard is 1.61 to 1
- accentPressed on darkCard is 1.58 to 1
- periodInk on darkCard is 1.58 to 1
- accent on accentPressed is 1.51 to 1
- accentPressed on accent is 1.51 to 1
- periodInk on accent is 1.51 to 1
- lutealInk on accent is 1.48 to 1
- warmIcon on accentPressed is 1.42 to 1
- secondaryText on accentPressed is 1.41 to 1
- accentSoftInk on accentPressed is 1.40 to 1
- onAccent on washAmber is 1.35 to 1
- ovulationInk on accent is 1.28 to 1
- onAccent on accentSoft is 1.27 to 1
- onAccent on accentTile is 1.23 to 1
- text on darkCard is 1.21 to 1
- follicularInk on darkCard is 1.21 to 1
- onAccent on washWarm is 1.19 to 1
- ovulationInk on accentPressed is 1.18 to 1
- pickerFar on accent is 1.12 to 1
- pickerNear on accent is 1.12 to 1
- dockQuiet on accent is 1.12 to 1
- onAccent on field is 1.10 to 1
- accentSoftInk on accent is 1.08 to 1
- platformBlue on accent is 1.08 to 1
- secondaryText on accent is 1.07 to 1
- warmIcon on accent is 1.06 to 1
- onAccent on ground is 1.05 to 1
- lutealInk on accentPressed is 1.02 to 1
- onAccent on card is 1.00 to 1
- periodInk on accentPressed is 1.00 to 1

A phase fill carries no text. Each one has an ink partner that carries the text instead. On the
stone ground they measure:

- period on ground is 5.06 to 1, so `periodInk` carries the text.
- follicular on ground is 1.25 to 1, so `follicularInk` carries the text.
- ovulation on ground is 2.05 to 1, so `ovulationInk` carries the text.
- luteal on ground is 3.02 to 1, so `lutealInk` carries the text.

The fill `period` measures above the floor. It still carries no text. The rule is the same for every
fill.

## The type scale

Status: built

The scale has 11 roles in three faces. The headings are set in Figtree, the words she reads at
length are set in Figtree, and every number is set in JetBrains Mono. A line height below 1.2 times
the size fails the token test, and the role that sits under it is named with the rest.

- `display-lg` is 50 points over 60 at weight 800, letter spacing -1, which is 1.20 times the size, set in Figtree.
- `display-lg-mobile` is 34 points over 42 at weight 800, letter spacing -0.68, which is 1.24 times the size, set in Figtree.
- `headline-lg` is 28 points over 34 at weight 800, letter spacing -0.56, which is 1.21 times the size, set in Figtree.
- `headline-md` is 22 points over 28 at weight 800, letter spacing -0.22, which is 1.27 times the size, set in Figtree.
- `headline-sm` is 18 points over 24 at weight 800, which is 1.33 times the size, set in Figtree.
- `body-lg` is 16 points over 24 at weight 400, which is 1.50 times the size, set in Figtree.
- `body-sm` is 14 points over 20 at weight 400, which is 1.43 times the size, set in Figtree.
- `label-md` is 13 points over 18 at weight 700, which is 1.38 times the size, set in Figtree.
- `label-sm` is 11 points over 15 at weight 600, letter spacing 0.22, which is 1.36 times the size, set in Figtree.
- `data-lg` is 24 points over 30 at weight 500, letter spacing -0.48, which is 1.25 times the size, set in JetBrains Mono.
- `data-sm` is 12 points over 16 at weight 500, letter spacing 0.24, which is 1.33 times the size, set in JetBrains Mono.

## Space, radius and stroke

Status: built

The spacing scale, in points:

- `spaceXs` is 4.
- `spaceSm` is 8.
- `spaceMd` is 12.
- `spaceLg` is 16.
- `margin` is 20.
- `spaceXl` is 24.
- `marginMd` is 28.
- `marginLg` is 56.

The corner radii, in points:

- `sm` is 10.
- `DEFAULT` is 12.
- `md` is 14.
- `lg` is 16.
- `xl` is 18.
- `xxl` is 28.
- `full` is 999.

The strokes, in points:

- `hairline` is 1.
- `icon` is 1.75.

The smallest tap target is 44 points square.
