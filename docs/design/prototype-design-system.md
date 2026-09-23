---
name: Warm Editorial Journal
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d5'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ee'
  surface-container: '#f5ece8'
  surface-container-high: '#efe6e3'
  surface-container-highest: '#eae1dd'
  on-surface: '#1f1b19'
  on-surface-variant: '#56423d'
  inverse-surface: '#342f2d'
  inverse-on-surface: '#f8efeb'
  outline: '#89726c'
  outline-variant: '#dcc1b9'
  surface-tint: '#9c4327'
  primary: '#843117'
  on-primary: '#ffffff'
  primary-container: '#a3482c'
  on-primary-container: '#ffd8ce'
  inverse-primary: '#ffb59f'
  secondary: '#625e58'
  on-secondary: '#ffffff'
  secondary-container: '#e8e1d9'
  on-secondary-container: '#68645e'
  tertiary: '#921f12'
  on-tertiary: '#ffffff'
  tertiary-container: '#b43727'
  on-tertiary-container: '#ffd8d2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb59f'
  on-primary-fixed: '#3a0a00'
  on-primary-fixed-variant: '#7d2c12'
  secondary-fixed: '#e8e1d9'
  secondary-fixed-dim: '#ccc5be'
  on-secondary-fixed: '#1e1b17'
  on-secondary-fixed-variant: '#4a4641'
  tertiary-fixed: '#ffdad4'
  tertiary-fixed-dim: '#ffb4a8'
  on-tertiary-fixed: '#410100'
  on-tertiary-fixed-variant: '#8b190e'
  background: '#fff8f5'
  on-background: '#1f1b19'
  surface-variant: '#eae1dd'
  period: '#d97d6e'
  period-ink: '#5c2018'
  follicular: '#e5a96d'
  follicular-ink: '#5e3b10'
  ovulation: '#a8a663'
  ovulation-ink: '#404218'
  luteal: '#9b849e'
  luteal-ink: '#433246'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 3rem
    fontWeight: '400'
    lineHeight: 3.5rem
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Newsreader
    fontSize: 2.25rem
    fontWeight: '400'
    lineHeight: 2.75rem
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 2rem
    fontWeight: '400'
    lineHeight: 2.5rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 1.5rem
    fontWeight: '500'
    lineHeight: 2rem
  headline-sm:
    fontFamily: Newsreader
    fontSize: 1.25rem
    fontWeight: '500'
    lineHeight: 1.75rem
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 1.75rem
    fontWeight: '500'
    lineHeight: 2.25rem
    letterSpacing: -0.03em
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.02em
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 2rem
  margin-lg: 3.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

The prototype this document describes is in `docs/design/prototype/`. The front matter is read out of
`screen-0-style-sheet.html`, which carries the configuration all six screens draw with, and it is not
written by hand. The four phase fills and the four inks beside them are the one addition: the screens
draw those eight as plain values inside the ring rather than through the configuration, so the front
matter names them and `tools/pipeline/prototype.test.ts` reads them back out of the style sheet
screen. That check also holds every other value the two sides share. The corners are the one block
the two sides do not agree about. Emi draws the scale in the front matter here, which answers
https://github.com/atlantic-blue/emi/issues/159, and the export keeps its own because it is an export.

Every paragraph below names a role. None of them names a value. The front matter above is the only
place a colour, a size or a step is written, so this document describes one palette.

## Brand and style

This design system is a calm, warm, adult private journal. It rejects the hyper feminine and
cartoonish habits of the category: no bodies, no floral pastels, no droplets. It treats cyclical
health as an intimate editorial practice. The tone is reassuring, dignified and private, closer to
writing in a linen bound notebook than to using an application.

The movement is warm editorial minimalism with the refinement of good stationery.

- Generous space, on a paper toned ground.
- Bookish serif headings, with a legible geometric body face and monospaced figures for data.
- Low contrast hairlines and soft card surfaces, rather than dramatic shadows.
- A lowercase wordmark, `emi`, which reads as quiet rather than institutional.
- Abstract continuous line work and circular phase ribbons. No anatomical or floral drawing.

## Colours

The palette comes from unbleached paper, earth pigments and natural textiles.

### The canvas and the surfaces

- **Canvas**: `surface`. The ground the whole application sits on.
- **Card**: `surface-container-lowest`. Panels and the focused entry card.
- **Recessed surface**: `surface-container`. Inset metrics, inactive day wells and secondary cards.
- **Containers between them**: `surface-container-low` and `surface-container-high`. The step
  between a card and the ground it sits on.
- **Body text**: `on-surface`. Editorial headings and interface words alike. It is never pure black.
- **Secondary text**: `on-surface-variant`. Metadata, footnotes and supporting lines.
- **Hairline**: `outline-variant`. A one point border that defines structure without a shadow.

### The accents and the states

- **Primary action**: `primary-container`, with `on-primary` on top of it. Affirmative actions,
  primary chips and the active bead on the ring. The pressed state steps to `primary`.
- **Selected well**: `surface-container-high`, with `on-surface` on top of it. Selected dates,
  active toggle chips and pressed states.
- **Alert**: `error`, with `on-error` on top of it, and `error-container` behind a longer message.

### The four phases, and the ink beside each one

A phase is drawn in its own fill. The words about that phase are written in the ink beside it,
because a fill is too light to carry text. Colour alone never carries the meaning: the ring also
leaves a gap of ground at every boundary and writes the phase name in words.

- **Period**: fill `period`, ink `period-ink`.
- **Follicular**: fill `follicular`, ink `follicular-ink`.
- **Ovulation**: fill `ovulation`, ink `ovulation-ink`.
- **Luteal**: fill `luteal`, ink `luteal-ink`.

An ink is measured against the surface it is written on, never against its own fill. Three of the
four inks fail the contrast floor on their own fill, which is why no text is ever drawn on a fill.

## Typography

Three faces, and the front matter names the size, the line height, the tracking and the weight of
every role.

- **Display and headlines**: Newsreader. An editorial serif with warmth. It carries the daily
  reflection, the entry date, a cycle milestone and a section title. The roles are `display-lg`,
  `display-lg-mobile`, `headline-lg`, `headline-md` and `headline-sm`.
- **Body and controls**: Plus Jakarta Sans. A geometric sans with open tracking, for symptom notes,
  insights and button text. The roles are `body-lg`, `body-md`, `body-sm`, `label-md` and
  `label-sm`.
- **Numbers and measurements**: JetBrains Mono. Monospaced figures for a cycle day, a calendar grid,
  a temperature and a duration. The roles are `data-lg`, `data-md` and `data-sm`. A figure that is
  monospaced does not move as it changes.
- **The wordmark**: always lowercase, `emi`, set in Newsreader. Never in capitals.

## Layout and spacing

The layout sits on an eight point grid. The front matter names every step.

- **Phone**: one column, fluid cards, `margin` around the canvas, and `gutter` between cards. Every
  interactive element is at least 44 points on both axes.
- **Tablet**: six columns, with `margin-md` around the canvas. The ring and the journal entry sit
  side by side or stack.
- **Desktop**: twelve columns, with `margin-lg` around the canvas, held to a reading width so the
  page does not spread.

Space between components is `space-xs` through `space-xl`. The scale prefers room over density.

## Elevation and depth

There are no deep shadows, no blur and no glass. Depth comes from a tonal step and a hairline.

- **Layer 0, the canvas**: `surface`.
- **Layer 1, cards and inset containers**: `surface-container-lowest` or `surface-container`, each
  bound by a one point border in `outline-variant`.
- **Layer 2, a floating sheet**: `surface-container-lowest`, a one point border in `outline-variant`,
  and one ambient shadow: `on-surface` at 5 per cent, offset 4 points down, blurred 20 points, drawn
  2 points inside the edge.

Focus is commanded by contrast and by a change of surface tone, never by an artificial light.

## Shapes

Two corners carry the interface, and both are named in the `rounded` block of the front matter.

- **Cards and containers**: the `xl` corner.
- **Buttons, fields and chips**: the `lg` corner.
- **The ring and any circular node**: a true circle, drawn in a single stroke.
- **Illustration**: never representational. Looping continuous paths, orbital rings and lunar
  geometry. No anatomical drawing, no droplets, no botanical pastels.

## Components

### Buttons

- **Primary**: a `primary-container` ground with `on-primary` words, the `lg` corner, at least 48
  points high and at least 44 points of tap target. The pressed state steps to `primary`.
- **Secondary**: a `surface-container-lowest` ground, a one point border in `outline-variant`, and
  `on-surface` words. The pressed state steps to `surface-container`.
- **Text button**: `on-surface` words with an underline four points below them. No ground and no
  border.

### The four phase ring

- One continuous vector ring, divided into four arcs.
- Each arc is stroked in its own phase fill, at a stroke the front matter does not name and the
  component holds.
- A metric or a label inside or beside an arc is written in that phase's ink.
- The cycle day at the centre is set in `data-lg`.

### Cards and inset panels

- **Card**: a `surface-container-lowest` ground, the `xl` corner, a one point border in
  `outline-variant`, and `space-lg` of padding inside it.
- **Recessed card**: a `surface-container` ground, for a historical day and a supplementary note.

### Chips and symptom selectors

- **Resting**: a `surface-container` ground, a one point border in `outline-variant`, `on-surface`
  words, the `lg` corner, and padding of `space-sm` by `space-md`.
- **Selected**: a `surface-container-high` ground, a border in `primary-container`, and `on-surface`
  words.

### Fields and journal text areas

- A `surface-container-lowest` ground, the `lg` corner, a one point border in `outline-variant`, and
  `space-md` of padding inside it.
- The focused state draws a one point ring in `primary-container`.
- The text she types is `body-md`. The prompt above it is a headline role, so it is set in
  Newsreader.

### Checkboxes and radio controls

- A radio control is two circles, 20 points across, inside a 44 point tap target. The selected core
  is `primary-container`.
- A checkbox is a rounded square at the `sm` corner, with its mark in `primary-container`.
