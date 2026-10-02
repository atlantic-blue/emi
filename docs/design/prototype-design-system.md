---
name: The approved redesign of 2026-10-01
colors:
  ground: '#FFF8F3'
  card: '#FFFFFF'
  field: '#FFF2EB'
  line: '#F1E1D6'
  dark-card: '#4A2A2E'
  text: '#2E2224'
  secondary-text: '#76625F'
  on-accent: '#FFFFFF'
  accent: '#B8434E'
  accent-pressed: '#8E2F3A'
  accent-soft: '#FFDCDC'
  accent-soft-ink: '#AF404A'
  accent-tile: '#F9E3E1'
  dock-quiet: '#826F69'
  picker-near: '#866E65'
  picker-far: '#906B59'
  disabled-label: '#C9B4AA'
  quiet-icon: '#B49F96'
  warm-icon: '#A0521A'
  dot-off: '#EFDCCF'
  step-track: '#F3E2D6'
  empty-ring: '#E6CFC2'
  unchecked-ring: '#D9C2B6'
  period: '#B8434E'
  period-ink: '#8E2F3A'
  follicular: '#F5DCCB'
  follicular-ink: '#2E2224'
  ovulation: '#E9A15F'
  ovulation-ink: '#8A4A1C'
  luteal: '#C27E86'
  luteal-ink: '#7E3E48'
  wash-warm: '#FFE8CD'
  wash-amber: '#FFD6BA'
  wash-rose: '#F6D3D0'
  wash-blush: '#FBE6E2'
  wash-pink: '#FFE6EE'
  notification-middle: '#8A4A52'
  notification-end: '#E9A07A'
  platform-line: '#E6D6CC'
  platform-blue: '#1F6FD1'
raised:
  accent-soft-ink:
    prototype: '#B8434E'
    on: accent-soft
    reason: the ink on an accent soft chip, 4.18 on that chip, under the floor of 4.5
  dock-quiet:
    prototype: '#94807A'
    on: ground
    reason: the dock label and icon of a tab she is not on, 3.55 on the ground
  picker-near:
    prototype: '#A48F87'
    on: ground
    reason: the number next to the one she chose in a picker, 2.91 on the ground
  picker-far:
    prototype: '#D4C2B9'
    on: ground
    reason: the number two away from the one she chose, 1.63 on the ground
wash:
  soft:
    - '#FFE8CD'
    - '#FFDCDC'
    - '#FFF2EB'
    - '#FFF8F3'
  period:
    - '#FFD6BA'
    - '#FFDCDC'
    - '#FFDCDC'
    - '#FFF8F3'
  ovulation:
    - '#FFD6BA'
    - '#FFE8CD'
    - '#FFE8CD'
    - '#FFF8F3'
  luteal:
    - '#FFDCDC'
    - '#F6D3D0'
    - '#FBE6E2'
    - '#FFF8F3'
rounded:
  sm: '10px'
  DEFAULT: '12px'
  md: '14px'
  lg: '16px'
  xl: '18px'
  xxl: '28px'
  full: '999px'
spacing:
  space-xs: '4px'
  space-sm: '8px'
  space-md: '12px'
  space-lg: '16px'
  margin: '20px'
  space-xl: '24px'
  margin-md: '28px'
  margin-lg: '56px'
typography:
  display-lg:
    fontFamily: 'Figtree'
    fontSize: '50px'
    fontWeight: '800'
    lineHeight: '60px'
    letterSpacing: '-0.02em'
  display-lg-mobile:
    fontFamily: 'Figtree'
    fontSize: '34px'
    fontWeight: '800'
    lineHeight: '42px'
    letterSpacing: '-0.02em'
  headline-lg:
    fontFamily: 'Figtree'
    fontSize: '28px'
    fontWeight: '800'
    lineHeight: '34px'
    letterSpacing: '-0.02em'
  headline-md:
    fontFamily: 'Figtree'
    fontSize: '22px'
    fontWeight: '800'
    lineHeight: '28px'
    letterSpacing: '-0.01em'
  headline-sm:
    fontFamily: 'Figtree'
    fontSize: '18px'
    fontWeight: '800'
    lineHeight: '24px'
  body-lg:
    fontFamily: 'Figtree'
    fontSize: '16px'
    fontWeight: '400'
    lineHeight: '24px'
  body-sm:
    fontFamily: 'Figtree'
    fontSize: '14px'
    fontWeight: '400'
    lineHeight: '20px'
  button-lg:
    fontFamily: 'Figtree'
    fontSize: '16px'
    fontWeight: '700'
    lineHeight: '22px'
  button-md:
    fontFamily: 'Figtree'
    fontSize: '15px'
    fontWeight: '700'
    lineHeight: '21px'
  choice-lg:
    fontFamily: 'Figtree'
    fontSize: '15px'
    fontWeight: '600'
    lineHeight: '21px'
  choice-sm:
    fontFamily: 'Figtree'
    fontSize: '14px'
    fontWeight: '700'
    lineHeight: '20px'
  label-md:
    fontFamily: 'Figtree'
    fontSize: '13px'
    fontWeight: '700'
    lineHeight: '18px'
  label-sm:
    fontFamily: 'Figtree'
    fontSize: '11px'
    fontWeight: '600'
    lineHeight: '15px'
    letterSpacing: '0.02em'
  data-lg:
    fontFamily: 'JetBrains Mono'
    fontSize: '24px'
    fontWeight: '500'
    lineHeight: '30px'
    letterSpacing: '-0.02em'
  data-sm:
    fontFamily: 'JetBrains Mono'
    fontSize: '12px'
    fontWeight: '500'
    lineHeight: '16px'
    letterSpacing: '0.02em'
---

The prototype this document describes is in `docs/design/prototype/`. The front matter is read
against all fifty two screens by `tools/pipeline/prototype.test.ts`: every colour a screen paints
with has a name above, and every name above is painted by a screen. The screens carry no
configuration of their own, so each one writes its colours straight into the markup, and a
translucent value is held to the opaque colour underneath it.

Four names carry two values. Each one is a colour the prototype paints below the contrast floor,
and the `raised` block records what the prototype paints, the ground it was measured on and the
reason it moved. The screens are read against the painted value and the token package builds the
raised one, so neither half of the document has to lie about the other.

Every paragraph below names a role. None of them names a value. The front matter above is the only
place a colour, a size or a step is written, so this document describes one palette.

## Brand and style

This design system is a calm, warm, adult private journal. It rejects the hyper feminine and
cartoonish habits of the category: no bodies, no floral pastels, no droplets. It treats cyclical
health as an intimate editorial practice. The tone is reassuring, dignified and private.

The movement is warm minimalism with the refinement of good stationery.

- Generous space, on a warm paper ground, with a soft wash at the top of each screen.
- One face for every word, in four weights, with monospaced figures for the recovery code.
- Low contrast hairlines and soft card surfaces, rather than dramatic shadows.
- A lowercase wordmark, `emi`, which reads as quiet rather than institutional.
- Abstract continuous line work and circular phase ribbons. No anatomical or floral drawing.

## Colours

The palette comes from unbleached paper, earth pigments and natural textiles.

### The canvas and the surfaces

The ground is the warm paper every screen sits on. The card is the plain surface a section is
raised onto, and the field is the quieter surface a control sits in. The line is the hairline
between a row and the row under it. The dark card is the one surface that reverses, and it carries
the white that the accent carries.

Each screen draws a soft wash across its top, tinted by the phase she is in. The wash is four
gradients, one for the period, one for the days after it, one for ovulation and one for the luteal
phase, and each runs from a warm stop through a rose or an amber stop to the ground. A gradient is
never a ground for text, because it has no one value to measure. Where a part paints one stop of a
wash flat, that surface does have one value, so its pair is measured like any other: the warm stop
is the ground of the status pill that says how much Emi knows about a figure.

### The accents and the states

The accent is the one colour that acts. It carries white text, it fills the button that writes, and
it draws the period arc. The pressed accent is the same hue, darker, for the moment a control is
held and for the ink of a phase name. The accent soft is the tint behind a chip, and the chip's own
ink is a darker shade of the accent, because the accent itself does not clear the floor on it.

The quiet label is the only text colour that is allowed under the floor, and it is allowed there
because it labels a control that cannot be pressed. The dock draws the tab she is not on in its own
quiet colour, which is raised above the floor from what the prototype paints.

Two screens draw the operating system rather than Emi: the notification on the lock screen and the
dialog the phone puts up to ask about notifications. The platform's own line and blue are named so
the check can read them, and no pair on a platform surface is measured, because Emi never paints
those surfaces.

### The four phases, and the ink beside each one

Each phase has a fill and an ink. The fill draws the arc of the ring, and the ink writes the name of
the phase. The ink is never written on its own fill, which is contract SEE-2, and it is never equal
to its fill, so the ring that writes a phase name on the ground stays readable. Every ink clears the
contrast floor on the ground.

## Typography

One face carries every word of the application, in four weights: regular for running text, semibold
for a quiet label, bold for a heading inside a card, and extra bold for a number and a screen title.
A monospaced face carries the recovery code, where a reader has to tell one character from another.

The scale runs from the label the dock draws up to the cycle day inside the ring. Every role names
its own line height, and no role is set below the line height floor.

## Layout and spacing

A screen is 390 by 844 points. Its horizontal padding is the margin, and never a spacing step. A
screen's content begins at the top, and no screen centres its body.

The spacing steps run from the gap inside a chip up to the gap between one section and the next.
The largest step separates a section from a section, never a sentence from the button under it.

## Shapes

A control is rounded on a scale of its own, from the small corner of a field up to the large corner
of a card, with the full corner reserved for anything circular: an avatar, a chip, a dot, a tab
target and the ring itself.

## Elevation and depth

Depth is a shadow of the text colour at a few parts in a hundred, and never a darker surface. A card
lifts off the ground by one or two points. Nothing in this design system drops a hard shadow.

## What this document does not hold

It does not hold a component library, a motion specification or an illustration set. The screens of
the prototype are the reference for each of those, and the steps that follow this one build them one
surface at a time.
