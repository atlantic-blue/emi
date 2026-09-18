# The brand

This document is generated from the token package. Nobody writes it by hand. Every value here is the
value the application uses. Run `npm run generate:brand` after a token changes. The pipeline runs
`npm run check:brand`. It fails when the committed copy and the generator disagree by one character.

## The palette

Status: built

The token package declares 18 colours, in this order. A role says where a colour can go. A ground is
a surface to sit on. A text colour carries words. A fill paints an arc of the ring. A line draws a
hairline.

- `stone` is `#F7F3EE` and carries the role ground.
- `surface` is `#FFFCF8` and carries the roles ground and text.
- `sunk` is `#F1EBE4` and carries the role ground.
- `ink` is `#241F1C` and carries the role text.
- `body` is `#5C534E` and carries the role text.
- `muted` is `#756A64` and carries the role text.
- `hairline` is `#241F1C1A` and carries the role line.
- `ember` is `#A8452C` and carries the roles text, fill and ground.
- `emberPressed` is `#8E3823` and carries the roles fill and ground.
- `emberTint` is `#F6E7E1` and carries the role ground.
- `period` is `#E05A4E` and carries the role fill.
- `follicular` is `#E0913A` and carries the role fill.
- `ovulation` is `#2E8C93` and carries the role fill.
- `luteal` is `#7A5B8C` and carries the role fill.
- `periodInk` is `#B03A32` and carries the role text.
- `follicularInk` is `#8A5416` and carries the role text.
- `ovulationInk` is `#1F6B71` and carries the role text.
- `lutealInk` is `#5E4470` and carries the role text.

## Colour, measured

Status: built

The function `contrastRatio` in `packages/tokens/src/colour.ts` measures every ratio below. The
contrast test reads the same function. Level AA of the Web Content Accessibility Guidelines asks for
4.5 to 1 for normal text. A pair below 4.5 is refused here, and the test refuses it too.

These 32 pairs are approved:

- surface on ember is 5.78 to 1
- surface on emberPressed is 7.49 to 1
- ink on stone is 14.76 to 1
- ink on surface is 15.94 to 1
- ink on sunk is 13.78 to 1
- ink on emberTint is 13.54 to 1
- body on stone is 6.78 to 1
- body on surface is 7.33 to 1
- body on sunk is 6.33 to 1
- body on emberTint is 6.22 to 1
- muted on stone is 4.75 to 1
- muted on surface is 5.13 to 1
- ember on stone is 5.35 to 1
- ember on surface is 5.78 to 1
- ember on sunk is 4.99 to 1
- ember on emberTint is 4.91 to 1
- periodInk on stone is 5.44 to 1
- periodInk on surface is 5.87 to 1
- periodInk on sunk is 5.07 to 1
- periodInk on emberTint is 4.99 to 1
- follicularInk on stone is 5.66 to 1
- follicularInk on surface is 6.11 to 1
- follicularInk on sunk is 5.28 to 1
- follicularInk on emberTint is 5.19 to 1
- ovulationInk on stone is 5.59 to 1
- ovulationInk on surface is 6.04 to 1
- ovulationInk on sunk is 5.22 to 1
- ovulationInk on emberTint is 5.13 to 1
- lutealInk on stone is 7.49 to 1
- lutealInk on surface is 8.09 to 1
- lutealInk on sunk is 6.99 to 1
- lutealInk on emberTint is 6.87 to 1

These 20 pairs are refused, in order of ratio. A text colour is approved only on the grounds above.
The two near misses come first.

- muted on sunk is 4.43 to 1
- muted on emberTint is 4.36 to 1
- ink on ember is 2.76 to 1
- ink on emberPressed is 2.13 to 1
- muted on emberPressed is 1.46 to 1
- lutealInk on ember is 1.40 to 1
- ember on emberPressed is 1.30 to 1
- periodInk on emberPressed is 1.28 to 1
- body on ember is 1.27 to 1
- ovulationInk on emberPressed is 1.24 to 1
- follicularInk on emberPressed is 1.23 to 1
- surface on emberTint is 1.18 to 1
- surface on sunk is 1.16 to 1
- muted on ember is 1.13 to 1
- lutealInk on emberPressed is 1.08 to 1
- surface on stone is 1.08 to 1
- follicularInk on ember is 1.06 to 1
- ovulationInk on ember is 1.04 to 1
- body on emberPressed is 1.02 to 1
- periodInk on ember is 1.02 to 1

A phase fill carries no text. Each one has an ink partner that carries the text instead. On the
stone ground they measure:

- period on stone is 3.31 to 1, so `periodInk` carries the text.
- follicular on stone is 2.30 to 1, so `follicularInk` carries the text.
- ovulation on stone is 3.59 to 1, so `ovulationInk` carries the text.
- luteal on stone is 5.13 to 1, so `lutealInk` carries the text.

The fill `luteal` measures above the floor. It still carries no text. The rule is the same for every
fill.

## The type scale

Status: built

The scale has 6 sizes. The three faces are Fraunces, Plus Jakarta Sans and IBM Plex Mono. A line
height below 1.2 times the size fails the token test.

- `display` is 34 points over 41, in Fraunces, which is 1.21 times the size.
- `title` is 26 points over 32, in Fraunces, which is 1.23 times the size.
- `heading` is 20 points over 26, in Fraunces, which is 1.30 times the size.
- `body` is 16 points over 24, in Plus Jakarta Sans, which is 1.50 times the size.
- `small` is 14 points over 20, in Plus Jakarta Sans, which is 1.43 times the size.
- `label` is 12 points over 16, in IBM Plex Mono, letter spacing 0.48, which is 1.33 times the size.

## Space, radius and stroke

Status: built

The spacing scale, in points:

- `hair` is 4.
- `tight` is 8.
- `snug` is 16.
- `base` is 24.
- `roomy` is 32.
- `loose` is 48.
- `section` is 64.

The corner radii, in points:

- `icon` is 2.
- `chip` is 10.
- `card` is 16.
- `sheet` is 24.
- `round` is 999.

The strokes, in points:

- `hairline` is 1.
- `icon` is 1.75.

The smallest tap target is 44 points square.
