---
name: Warm Humanist Editorial
colors:
  surface: '#fcf9f4'
  surface-dim: '#dcdad5'
  surface-bright: '#fcf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ee'
  surface-container: '#f0ede9'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e5e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#56423e'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f3f0eb'
  outline: '#89726c'
  outline-variant: '#ddc0ba'
  surface-tint: '#9f402a'
  primary: '#9c3e28'
  on-primary: '#ffffff'
  primary-container: '#bc553e'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a3'
  secondary: '#8c4d43'
  on-secondary: '#ffffff'
  secondary-container: '#feaca0'
  on-secondary-container: '#7a3d35'
  tertiary: '#645863'
  on-tertiary: '#ffffff'
  tertiary-container: '#7e717c'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#ffb4a3'
  on-primary-fixed: '#3d0600'
  on-primary-fixed-variant: '#802916'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4a8'
  on-secondary-fixed: '#390c07'
  on-secondary-fixed-variant: '#70362d'
  tertiary-fixed: '#eedeeb'
  tertiary-fixed-dim: '#d2c2cf'
  on-tertiary-fixed: '#221922'
  on-tertiary-fixed-variant: '#4e434e'
  background: '#fcf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e5e2dd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

The design system embodies the presence of an intelligent, discerning companion: grounded, discreet, warm, and unapologetically adult. Built specifically for privacy-conscious European women, it completely rejects the paternalistic cliches of typical femtech—eliminating cartoonish pastels, glitter accents, baby-talk microcopy, and clinical starkness. Instead, the design language communicates intimate health through biological honesty, tactile elegance, and thoughtful restraint.

The aesthetic philosophy bridges **Warm Editorial Minimalism** with **Organic Tactility**. Visual hierarchy is governed by deliberate proportions, generous breathing space, and an editorial rhythm reminiscent of contemporary independent health journals. The interface respects the user's emotional state across shifting hormonal landscapes, using reassuring earthy undertones, soothing ceramic surfaces, and subtle, tactile transitions to foster emotional sovereignty and privacy peace of mind.

## Colors

The palette draws entirely from natural minerals, unbleached fibers, terracotta clays, and sun-warmed linen. Every colour it holds is named in the front matter above, and every paragraph below names one of those roles rather than a value of its own, so this document describes one palette and not two.

### Application Guidelines

- **Primary (`primary`)**: Applied deliberately to focal interactions, primary actions, current day indicators, and confident brand moments. Anything sitting on it carries `on-primary`.
- **Secondary (`secondary`, `secondary-container`)**: Utilized for supportive graphical highlights, trend visualizations, and micro-interactions, with `on-secondary-container` for words on the container.
- **Cycle Phase Tones**: The palette holds no colour for a cycle phase, and this paragraph used to name four that are drawn nowhere. The prototype does not colour the four phases at all: it marks the one she is in with `primary-fixed` and leaves the rest on `surface-container-low`. The application draws them from four roles it chose for itself in `packages/tokens/src/ring.ts`. Which of those the design system means is a decision nobody has taken, and it is https://github.com/atlantic-blue/emi/issues/157.
- **Neutrals & Canvas Layers**: The application is strictly light-first to emulate tactile stationery. The canvas sits on `surface`, moving to `surface-container-lowest` for cards and floating sheets, with the containers between them stepping through `surface-container-low`, `surface-container` and `surface-container-high`. Structural delineations rely on `outline-variant`.
- **Text & Hierarchy**: Contrast adheres strictly to WCAG AA/AAA against the canvas, using `on-surface` for headings and `on-surface-variant` for body narratives. Metadata and captions take the same `on-surface-variant` at the smaller label roles, because the palette names no third text colour.

## Typography

The typography uses **Plus Jakarta Sans** uniformly across display, body, and UI labeling. Its wide geometric foundation, blended with warm humanist letter terminals, provides clarity and an approachable, unhurried cadence.

### Typographic Principles

- **Editorial Proportioning**: Generous line-heights are maintained on all running narrative and clinical insights (`1.5x` to `1.6x` line height) to prevent visual fatigue and support relaxed scanning.
- **Restrained Headings**: Never use pure black. `on-surface` ensures that even large display headers feel organic, like ink on warm handmade paper.
- **Numerics & Cycle Telemetry**: Key health statistics, cycle day counts, and timeline days utilize medium and semibold weights with tabular alignment properties enabled to maintain symmetry within circular trackers and calendar matrices.

## Layout & Spacing

The layout is architected iOS-first, built upon a single-column fluid card layout anchored to a 4pt/8pt harmonic baseline.

### Screen Structure & Safe Areas

- **Top Canvas & Status Area**: An integrated 48px to 56px top clearance ensures breathing room below the iOS dynamic island/status indicator. Navigation headers sit embedded inside fluid page titles rather than boxed native bars.
- **Side Margins**: Strict `1.25rem` (20px) outer margins on mobile devices prevent edge crowding while keeping cards comfortably actionable with single-handed thumb interaction.
- **Bottom Navigation Clearance**: All scrollable views terminate with an explicit `6rem` (96px) padding reserve to ensure full clearance above the floating bottom navigation bar.
- **Vertical Rhythm**: Content blocks cluster into cohesive modular cards separated by `space-lg` (24px), preserving a calm, uncluttered scroll experience without sensory overload.

## Elevation & Depth

Visual hierarchy rejects heavy, industrial drop-shadows and skeuomorphic bevels. Instead, elevation relies on **chromatic layering** and **warm ambient halos**.

### Surface Strategy

- **Layer 0 (Canvas Base)**: `surface`. Static background for the global application shell.
- **Layer 1 (Cards & Modules)**: `surface-container-lowest` paired with a 1px structural outline in `outline-variant`. This provides tactile definition on OLED and LCD screens without visual harshness.
- **Layer 2 (Interactive Floating Elements & Modals)**: `surface-container-lowest` resting on an extra-diffuse warm shadow: `box-shadow: 0 12px 32px -4px rgba(43, 37, 35, 0.05), 0 4px 12px -2px rgba(217, 107, 82, 0.06)`. Those two tints are the one colour written as a value anywhere below the front matter, because the front matter holds no shadow block and the prototype draws this shadow exactly as it is written here. The warm tint in the ambient shadow keeps the component tied to the natural color spectrum.
- **Sheet Overlays**: Contextual health logging drawers and deep-dive analytics utilize an organic backdrop blur: `backdrop-filter: blur(16px)` over `surface` at 80 per cent.

## Shapes

The interface embraces generous, organic curves that feel soft and inviting to the touch. The baseline token system anchors at level `2` (8px base), with interactive surface containers expanding outward to `rounded-2xl` (16px) and `rounded-3xl` (24px).

### Curvature Architecture

- **Interactive Badges & Phase Indicators**: Full pill geometry (`rounded-full`, 9999px) to communicate self-contained states and continuous flow.
- **Cards, Logging Blocks, and Dialogs**: Sculpted with `1.25rem` (20px) to `1.5rem` (24px) corner radii (`rounded-2xl` / `rounded-3xl`), evoking ceramic dishes or polished river stones.
- **Action Buttons & Form Controls**: Standardized at `0.875rem` (14px) or continuous pill contours, preventing sharp apexes anywhere in the primary user path.

## Components

### Buttons

- **Primary**: Solid `primary` ground with `on-primary` typography, 52px height for accessibility, full pill radius (`rounded-full`). Soft inner highlight on active press.
- **Secondary / Ghost**: `surface-container-low` ground with `on-surface` typography and no border, stepping to `surface-container` on press.
- **Tertiary Utility**: Borderless, subtle `on-surface-variant` text with `0.5rem` padding for auxiliary operations.

### Cycle Wheel & Phase Ring (Specialized)

- A prominent circular visualization that sits centered on the dashboard. Employs soft, fluid segment boundaries between the four phases, which take the colours named under Cycle Phase Tones above. The current day sits within an elevated ceramic bead with an ambient `primary` glow.

### Cards & Content Containers

- Ground `surface-container-lowest`, a 1px outline in `outline-variant`, radius `1.5rem`. Internal padding is fixed at `1.25rem` (20px). Content sections within cards are delineated by hairline dividers in `outline-variant`.

### Chips & Symptom Tags

- Pill-shaped (`rounded-full`), minimum tap target 40px height.
- **Unselected**: `surface-container-high` ground, `on-surface-variant` text, no border.
- **Selected**: `primary` ground, text transitions to `on-primary`, subtle scale transformation (`transform: scale(1.02)`).

### Form Inputs & Text Fields

- Minimum height 48px, ground `surface-container-low`, a 1px outline in `outline-variant`. Text sits in `on-surface` with the placeholder in `on-surface-variant`. Active focus state transitions the outline to `primary` with zero harsh box-shadows.

### Lists & Symptom Rows

- Flat, seamless stack styling. Rows feature 56px minimum height, separated by gentle inset divider rules. Right-aligned affordances use subdued chevron icons in `on-surface-variant`.

### Checkboxes & Segmented Selectors

- Custom circular selectors in place of boxy checkmarks. Selection state fills smoothly with `primary`, featuring a centered dot in `on-primary`.

### Bottom Navigation Bar

- Elevated translucent dock suspended 16px above the home indicator. Ground `surface-container-lowest` at 92 per cent with `backdrop-filter: blur(20px)`, rounded-full pill silhouette, outlined by 1px of `outline-variant`. Icons dynamically shift from `on-surface-variant` (inactive) to `primary` (active), accompanied by a micro dot indicator underneath.
