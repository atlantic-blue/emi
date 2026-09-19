# The brand

This document is generated from the token package. Nobody writes it by hand. Every value here is the
value the application uses. Run `npm run generate:brand` after a token changes. The pipeline runs
`npm run check:brand`. It fails when the committed copy and the generator disagree by one character.

## The palette

Status: built

The token package declares 47 colours, in this order. A role says where a colour can go. A ground is
a surface to sit on. A text colour carries words. A fill paints an arc of the ring. A line draws a
hairline.

- `surface` is `#FCF9F4` and carries the role ground.
- `surfaceDim` is `#DCDAD5` and carries the role ground.
- `surfaceBright` is `#FCF9F4` and carries the role ground.
- `surfaceContainerLowest` is `#FFFFFF` and carries the role ground.
- `surfaceContainerLow` is `#F6F3EE` and carries the role ground.
- `surfaceContainer` is `#F0EDE9` and carries the role ground.
- `surfaceContainerHigh` is `#EBE8E3` and carries the role ground.
- `surfaceContainerHighest` is `#E5E2DD` and carries the role ground.
- `onSurface` is `#1C1C19` and carries the role text.
- `onSurfaceVariant` is `#56423E` and carries the role text.
- `inverseSurface` is `#31302D` and carries the role ground.
- `inverseOnSurface` is `#F3F0EB` and carries the role text.
- `outline` is `#89726C` and carries the role line.
- `outlineVariant` is `#DDC0BA` and carries the role line.
- `surfaceTint` is `#9F402A` and carries the roles ground and fill.
- `primary` is `#9C3E28` and carries the roles ground and fill.
- `onPrimary` is `#FFFFFF` and carries the role text.
- `primaryContainer` is `#BC553E` and carries the roles ground and fill.
- `onPrimaryContainer` is `#FFFBFF` and carries the role text.
- `inversePrimary` is `#FFB4A3` and carries the role text.
- `secondary` is `#8C4D43` and carries the roles ground, text and fill.
- `onSecondary` is `#FFFFFF` and carries the role text.
- `secondaryContainer` is `#FEACA0` and carries the roles ground and fill.
- `onSecondaryContainer` is `#7A3D35` and carries the role text.
- `tertiary` is `#645863` and carries the roles ground, text and fill.
- `onTertiary` is `#FFFFFF` and carries the role text.
- `tertiaryContainer` is `#7E717C` and carries the roles ground and fill.
- `onTertiaryContainer` is `#FFFBFF` and carries the role text.
- `error` is `#BA1A1A` and carries the roles ground, text and fill.
- `onError` is `#FFFFFF` and carries the role text.
- `errorContainer` is `#FFDAD6` and carries the roles ground and fill.
- `onErrorContainer` is `#93000A` and carries the role text.
- `primaryFixed` is `#FFDAD2` and carries the roles ground and fill.
- `primaryFixedDim` is `#FFB4A3` and carries the roles ground and fill.
- `onPrimaryFixed` is `#3D0600` and carries the role text.
- `onPrimaryFixedVariant` is `#802916` and carries the role text.
- `secondaryFixed` is `#FFDAD5` and carries the roles ground and fill.
- `secondaryFixedDim` is `#FFB4A8` and carries the roles ground and fill.
- `onSecondaryFixed` is `#390C07` and carries the role text.
- `onSecondaryFixedVariant` is `#70362D` and carries the role text.
- `tertiaryFixed` is `#EEDEEB` and carries the roles ground and fill.
- `tertiaryFixedDim` is `#D2C2CF` and carries the roles ground and fill.
- `onTertiaryFixed` is `#221922` and carries the role text.
- `onTertiaryFixedVariant` is `#4E434E` and carries the role text.
- `background` is `#FCF9F4` and carries the role ground.
- `onBackground` is `#1C1C19` and carries the role text.
- `surfaceVariant` is `#E5E2DD` and carries the roles ground and fill.

## Colour, measured

Status: built

The function `contrastRatio` in `packages/tokens/src/colour.ts` measures every ratio below. The
contrast test reads the same function. Level AA of the Web Content Accessibility Guidelines asks for
4.5 to 1 for normal text. A pair below 4.5 is refused here, and the test refuses it too.

These 165 pairs are approved:

- onSurface on surface is 16.26 to 1
- onSurface on surfaceDim is 12.23 to 1
- onSurface on surfaceBright is 16.26 to 1
- onSurface on surfaceContainerLowest is 17.08 to 1
- onSurface on surfaceContainerLow is 15.43 to 1
- onSurface on surfaceContainer is 14.64 to 1
- onSurface on surfaceContainerHigh is 13.98 to 1
- onSurface on surfaceContainerHighest is 13.22 to 1
- onSurface on background is 16.26 to 1
- onSurface on surfaceVariant is 13.22 to 1
- onSurfaceVariant on surface is 8.91 to 1
- onSurfaceVariant on surfaceDim is 6.70 to 1
- onSurfaceVariant on surfaceBright is 8.91 to 1
- onSurfaceVariant on surfaceContainerLowest is 9.36 to 1
- onSurfaceVariant on surfaceContainerLow is 8.45 to 1
- onSurfaceVariant on surfaceContainer is 8.02 to 1
- onSurfaceVariant on surfaceContainerHigh is 7.66 to 1
- onSurfaceVariant on surfaceContainerHighest is 7.24 to 1
- onSurfaceVariant on background is 8.91 to 1
- onSurfaceVariant on surfaceVariant is 7.24 to 1
- inverseOnSurface on inverseSurface is 11.61 to 1
- onPrimary on primary is 6.70 to 1
- onPrimary on primaryContainer is 4.66 to 1
- onPrimary on surfaceTint is 6.48 to 1
- onPrimaryContainer on primaryContainer is 4.55 to 1
- inversePrimary on inverseSurface is 7.74 to 1
- secondary on surface is 6.14 to 1
- secondary on surfaceDim is 4.61 to 1
- secondary on surfaceBright is 6.14 to 1
- secondary on surfaceContainerLowest is 6.45 to 1
- secondary on surfaceContainerLow is 5.82 to 1
- secondary on surfaceContainer is 5.52 to 1
- secondary on surfaceContainerHigh is 5.27 to 1
- secondary on surfaceContainerHighest is 4.99 to 1
- secondary on background is 6.14 to 1
- secondary on surfaceVariant is 4.99 to 1
- onSecondary on secondary is 6.45 to 1
- onSecondaryContainer on secondaryContainer is 4.56 to 1
- onSecondaryContainer on surface is 7.85 to 1
- onSecondaryContainer on surfaceDim is 5.90 to 1
- onSecondaryContainer on surfaceBright is 7.85 to 1
- onSecondaryContainer on surfaceContainerLowest is 8.25 to 1
- onSecondaryContainer on surfaceContainerLow is 7.45 to 1
- onSecondaryContainer on surfaceContainer is 7.07 to 1
- onSecondaryContainer on surfaceContainerHigh is 6.75 to 1
- onSecondaryContainer on surfaceContainerHighest is 6.38 to 1
- onSecondaryContainer on background is 7.85 to 1
- onSecondaryContainer on surfaceVariant is 6.38 to 1
- tertiary on surface is 6.41 to 1
- tertiary on surfaceDim is 4.82 to 1
- tertiary on surfaceBright is 6.41 to 1
- tertiary on surfaceContainerLowest is 6.74 to 1
- tertiary on surfaceContainerLow is 6.09 to 1
- tertiary on surfaceContainer is 5.77 to 1
- tertiary on surfaceContainerHigh is 5.51 to 1
- tertiary on surfaceContainerHighest is 5.21 to 1
- tertiary on background is 6.41 to 1
- tertiary on surfaceVariant is 5.21 to 1
- onTertiary on tertiary is 6.74 to 1
- onTertiary on tertiaryContainer is 4.63 to 1
- onTertiaryContainer on tertiaryContainer is 4.51 to 1
- error on surface is 6.15 to 1
- error on surfaceDim is 4.62 to 1
- error on surfaceBright is 6.15 to 1
- error on surfaceContainerLowest is 6.46 to 1
- error on surfaceContainerLow is 5.84 to 1
- error on surfaceContainer is 5.54 to 1
- error on surfaceContainerHigh is 5.29 to 1
- error on surfaceContainerHighest is 5.00 to 1
- error on background is 6.15 to 1
- error on surfaceVariant is 5.00 to 1
- onError on error is 6.46 to 1
- onErrorContainer on errorContainer is 7.24 to 1
- onErrorContainer on surface is 8.91 to 1
- onErrorContainer on surfaceDim is 6.70 to 1
- onErrorContainer on surfaceBright is 8.91 to 1
- onErrorContainer on surfaceContainerLowest is 9.35 to 1
- onErrorContainer on surfaceContainerLow is 8.45 to 1
- onErrorContainer on surfaceContainer is 8.02 to 1
- onErrorContainer on surfaceContainerHigh is 7.65 to 1
- onErrorContainer on surfaceContainerHighest is 7.24 to 1
- onErrorContainer on background is 8.91 to 1
- onErrorContainer on surfaceVariant is 7.24 to 1
- onPrimaryFixed on primaryFixed is 13.24 to 1
- onPrimaryFixed on primaryFixedDim is 10.05 to 1
- onPrimaryFixed on surface is 16.33 to 1
- onPrimaryFixed on surfaceDim is 12.28 to 1
- onPrimaryFixed on surfaceBright is 16.33 to 1
- onPrimaryFixed on surfaceContainerLowest is 17.15 to 1
- onPrimaryFixed on surfaceContainerLow is 15.50 to 1
- onPrimaryFixed on surfaceContainer is 14.70 to 1
- onPrimaryFixed on surfaceContainerHigh is 14.03 to 1
- onPrimaryFixed on surfaceContainerHighest is 13.27 to 1
- onPrimaryFixed on background is 16.33 to 1
- onPrimaryFixed on surfaceVariant is 13.27 to 1
- onPrimaryFixedVariant on primaryFixed is 7.22 to 1
- onPrimaryFixedVariant on primaryFixedDim is 5.48 to 1
- onPrimaryFixedVariant on surface is 8.90 to 1
- onPrimaryFixedVariant on surfaceDim is 6.69 to 1
- onPrimaryFixedVariant on surfaceBright is 8.90 to 1
- onPrimaryFixedVariant on surfaceContainerLowest is 9.35 to 1
- onPrimaryFixedVariant on surfaceContainerLow is 8.45 to 1
- onPrimaryFixedVariant on surfaceContainer is 8.01 to 1
- onPrimaryFixedVariant on surfaceContainerHigh is 7.65 to 1
- onPrimaryFixedVariant on surfaceContainerHighest is 7.24 to 1
- onPrimaryFixedVariant on background is 8.90 to 1
- onPrimaryFixedVariant on surfaceVariant is 7.24 to 1
- onSecondaryFixed on secondaryFixed is 13.21 to 1
- onSecondaryFixed on secondaryFixedDim is 10.04 to 1
- onSecondaryFixed on surface is 16.26 to 1
- onSecondaryFixed on surfaceDim is 12.23 to 1
- onSecondaryFixed on surfaceBright is 16.26 to 1
- onSecondaryFixed on surfaceContainerLowest is 17.08 to 1
- onSecondaryFixed on surfaceContainerLow is 15.43 to 1
- onSecondaryFixed on surfaceContainer is 14.63 to 1
- onSecondaryFixed on surfaceContainerHigh is 13.98 to 1
- onSecondaryFixed on surfaceContainerHighest is 13.22 to 1
- onSecondaryFixed on background is 16.26 to 1
- onSecondaryFixed on surfaceVariant is 13.22 to 1
- onSecondaryFixedVariant on secondaryFixed is 7.20 to 1
- onSecondaryFixedVariant on secondaryFixedDim is 5.48 to 1
- onSecondaryFixedVariant on surface is 8.87 to 1
- onSecondaryFixedVariant on surfaceDim is 6.67 to 1
- onSecondaryFixedVariant on surfaceBright is 8.87 to 1
- onSecondaryFixedVariant on surfaceContainerLowest is 9.31 to 1
- onSecondaryFixedVariant on surfaceContainerLow is 8.42 to 1
- onSecondaryFixedVariant on surfaceContainer is 7.98 to 1
- onSecondaryFixedVariant on surfaceContainerHigh is 7.62 to 1
- onSecondaryFixedVariant on surfaceContainerHighest is 7.21 to 1
- onSecondaryFixedVariant on background is 8.87 to 1
- onSecondaryFixedVariant on surfaceVariant is 7.21 to 1
- onTertiaryFixed on tertiaryFixed is 13.24 to 1
- onTertiaryFixed on tertiaryFixedDim is 10.05 to 1
- onTertiaryFixed on surface is 16.25 to 1
- onTertiaryFixed on surfaceDim is 12.22 to 1
- onTertiaryFixed on surfaceBright is 16.25 to 1
- onTertiaryFixed on surfaceContainerLowest is 17.07 to 1
- onTertiaryFixed on surfaceContainerLow is 15.42 to 1
- onTertiaryFixed on surfaceContainer is 14.63 to 1
- onTertiaryFixed on surfaceContainerHigh is 13.97 to 1
- onTertiaryFixed on surfaceContainerHighest is 13.21 to 1
- onTertiaryFixed on background is 16.25 to 1
- onTertiaryFixed on surfaceVariant is 13.21 to 1
- onTertiaryFixedVariant on tertiaryFixed is 7.28 to 1
- onTertiaryFixedVariant on tertiaryFixedDim is 5.52 to 1
- onTertiaryFixedVariant on surface is 8.94 to 1
- onTertiaryFixedVariant on surfaceDim is 6.72 to 1
- onTertiaryFixedVariant on surfaceBright is 8.94 to 1
- onTertiaryFixedVariant on surfaceContainerLowest is 9.39 to 1
- onTertiaryFixedVariant on surfaceContainerLow is 8.48 to 1
- onTertiaryFixedVariant on surfaceContainer is 8.05 to 1
- onTertiaryFixedVariant on surfaceContainerHigh is 7.68 to 1
- onTertiaryFixedVariant on surfaceContainerHighest is 7.27 to 1
- onTertiaryFixedVariant on background is 8.94 to 1
- onTertiaryFixedVariant on surfaceVariant is 7.27 to 1
- onBackground on surface is 16.26 to 1
- onBackground on surfaceDim is 12.23 to 1
- onBackground on surfaceBright is 16.26 to 1
- onBackground on surfaceContainerLowest is 17.08 to 1
- onBackground on surfaceContainerLow is 15.43 to 1
- onBackground on surfaceContainer is 14.64 to 1
- onBackground on surfaceContainerHigh is 13.98 to 1
- onBackground on surfaceContainerHighest is 13.22 to 1
- onBackground on background is 16.26 to 1
- onBackground on surfaceVariant is 13.22 to 1

These 274 pairs are refused, in order of ratio. A text colour is approved only on the grounds above.
The nearest misses come first.

- inverseOnSurface on primaryContainer is 4.10 to 1
- inverseOnSurface on tertiaryContainer is 4.07 to 1
- tertiary on tertiaryFixedDim is 3.96 to 1
- tertiary on secondaryFixedDim is 3.96 to 1
- inversePrimary on tertiary is 3.95 to 1
- tertiary on primaryFixedDim is 3.95 to 1
- inversePrimary on primary is 3.93 to 1
- error on tertiaryFixedDim is 3.80 to 1
- error on secondaryFixedDim is 3.80 to 1
- inversePrimary on surfaceTint is 3.80 to 1
- secondary on tertiaryFixedDim is 3.79 to 1
- secondary on secondaryFixedDim is 3.79 to 1
- inversePrimary on error is 3.79 to 1
- error on primaryFixedDim is 3.79 to 1
- inversePrimary on secondary is 3.78 to 1
- secondary on primaryFixedDim is 3.78 to 1
- tertiary on secondaryContainer is 3.73 to 1
- onPrimaryFixed on tertiaryContainer is 3.71 to 1
- onSurface on tertiaryContainer is 3.69 to 1
- onBackground on tertiaryContainer is 3.69 to 1
- onSecondaryFixed on tertiaryContainer is 3.69 to 1
- onTertiaryFixed on tertiaryContainer is 3.69 to 1
- onPrimaryFixed on primaryContainer is 3.68 to 1
- onSurface on primaryContainer is 3.67 to 1
- onBackground on primaryContainer is 3.67 to 1
- onSecondaryFixed on primaryContainer is 3.67 to 1
- onTertiaryFixed on primaryContainer is 3.66 to 1
- error on secondaryContainer is 3.58 to 1
- secondary on secondaryContainer is 3.57 to 1
- inversePrimary on primaryContainer is 2.73 to 1
- inversePrimary on tertiaryContainer is 2.71 to 1
- onPrimaryFixed on secondary is 2.66 to 1
- onPrimaryFixed on error is 2.65 to 1
- onSurface on secondary is 2.65 to 1
- onBackground on secondary is 2.65 to 1
- onSecondaryFixed on secondary is 2.65 to 1
- onTertiaryFixed on secondary is 2.65 to 1
- onPrimaryFixed on surfaceTint is 2.65 to 1
- onSurface on error is 2.64 to 1
- onBackground on error is 2.64 to 1
- onSecondaryFixed on error is 2.64 to 1
- onTertiaryFixed on error is 2.64 to 1
- onSurface on surfaceTint is 2.64 to 1
- onBackground on surfaceTint is 2.64 to 1
- onSecondaryFixed on surfaceTint is 2.64 to 1
- onTertiaryFixed on surfaceTint is 2.63 to 1
- onPrimaryFixed on primary is 2.56 to 1
- onSurface on primary is 2.55 to 1
- onBackground on primary is 2.55 to 1
- onSecondaryFixed on primary is 2.55 to 1
- onTertiaryFixed on primary is 2.55 to 1
- onPrimaryFixed on tertiary is 2.55 to 1
- onSurface on tertiary is 2.54 to 1
- onBackground on tertiary is 2.54 to 1
- onSecondaryFixed on tertiary is 2.54 to 1
- onTertiaryFixed on tertiary is 2.53 to 1
- secondary on inverseSurface is 2.05 to 1
- error on inverseSurface is 2.04 to 1
- onTertiaryFixedVariant on tertiaryContainer is 2.03 to 1
- onSurfaceVariant on tertiaryContainer is 2.02 to 1
- onErrorContainer on tertiaryContainer is 2.02 to 1
- onPrimaryFixedVariant on tertiaryContainer is 2.02 to 1
- onTertiaryFixedVariant on primaryContainer is 2.02 to 1
- onSecondaryFixedVariant on tertiaryContainer is 2.01 to 1
- onSurfaceVariant on primaryContainer is 2.01 to 1
- onErrorContainer on primaryContainer is 2.01 to 1
- onPrimaryFixedVariant on primaryContainer is 2.01 to 1
- onSecondaryFixedVariant on primaryContainer is 2.00 to 1
- tertiary on inverseSurface is 1.96 to 1
- onPrimary on secondaryContainer is 1.81 to 1
- onSecondary on secondaryContainer is 1.81 to 1
- onTertiary on secondaryContainer is 1.81 to 1
- onError on secondaryContainer is 1.81 to 1
- onSecondaryContainer on tertiaryContainer is 1.78 to 1
- onSecondaryContainer on primaryContainer is 1.77 to 1
- onPrimaryContainer on secondaryContainer is 1.76 to 1
- onTertiaryContainer on secondaryContainer is 1.76 to 1
- onPrimary on primaryFixedDim is 1.71 to 1
- inversePrimary on surfaceContainerLowest is 1.71 to 1
- onSecondary on primaryFixedDim is 1.71 to 1
- onTertiary on primaryFixedDim is 1.71 to 1
- onError on primaryFixedDim is 1.71 to 1
- onPrimary on secondaryFixedDim is 1.70 to 1
- onSecondary on secondaryFixedDim is 1.70 to 1
- onTertiary on secondaryFixedDim is 1.70 to 1
- onError on secondaryFixedDim is 1.70 to 1
- onPrimary on tertiaryFixedDim is 1.70 to 1
- onSecondary on tertiaryFixedDim is 1.70 to 1
- onTertiary on tertiaryFixedDim is 1.70 to 1
- onError on tertiaryFixedDim is 1.70 to 1
- onPrimaryContainer on primaryFixedDim is 1.66 to 1
- onTertiaryContainer on primaryFixedDim is 1.66 to 1
- onPrimaryContainer on secondaryFixedDim is 1.66 to 1
- onTertiaryContainer on secondaryFixedDim is 1.66 to 1
- onPrimaryContainer on tertiaryFixedDim is 1.66 to 1
- onTertiaryContainer on tertiaryFixedDim is 1.66 to 1
- inversePrimary on surface is 1.62 to 1
- inversePrimary on surfaceBright is 1.62 to 1
- inversePrimary on background is 1.62 to 1
- onSecondaryContainer on inverseSurface is 1.60 to 1
- inverseOnSurface on secondaryContainer is 1.59 to 1
- inversePrimary on surfaceContainerLow is 1.54 to 1
- inverseOnSurface on primaryFixedDim is 1.50 to 1
- inverseOnSurface on secondaryFixedDim is 1.50 to 1
- inverseOnSurface on tertiaryFixedDim is 1.49 to 1
- inversePrimary on surfaceContainer is 1.46 to 1
- onTertiaryFixedVariant on secondary is 1.46 to 1
- tertiary on tertiaryContainer is 1.46 to 1
- onTertiaryFixedVariant on error is 1.45 to 1
- onSurfaceVariant on secondary is 1.45 to 1
- onErrorContainer on secondary is 1.45 to 1
- onPrimaryFixedVariant on secondary is 1.45 to 1
- onTertiaryFixedVariant on surfaceTint is 1.45 to 1
- onSurfaceVariant on error is 1.45 to 1
- onErrorContainer on error is 1.45 to 1
- onPrimaryFixedVariant on error is 1.45 to 1
- tertiary on primaryContainer is 1.45 to 1
- onSecondaryFixedVariant on secondary is 1.44 to 1
- onSurfaceVariant on surfaceTint is 1.44 to 1
- onErrorContainer on surfaceTint is 1.44 to 1
- onPrimaryFixedVariant on surfaceTint is 1.44 to 1
- onSecondaryFixedVariant on error is 1.44 to 1
- onSecondaryFixedVariant on surfaceTint is 1.44 to 1
- onSecondaryFixedVariant on inverseSurface is 1.42 to 1
- onPrimaryFixedVariant on inverseSurface is 1.41 to 1
- onErrorContainer on inverseSurface is 1.41 to 1
- onSurfaceVariant on inverseSurface is 1.41 to 1
- onTertiaryFixedVariant on inverseSurface is 1.41 to 1
- onTertiaryFixedVariant on primary is 1.40 to 1
- onPrimary on surfaceDim is 1.40 to 1
- onSecondary on surfaceDim is 1.40 to 1
- onTertiary on surfaceDim is 1.40 to 1
- onError on surfaceDim is 1.40 to 1
- error on tertiaryContainer is 1.40 to 1
- inversePrimary on surfaceContainerHigh is 1.40 to 1
- onSurfaceVariant on primary is 1.40 to 1
- onErrorContainer on primary is 1.40 to 1
- onPrimaryFixedVariant on primary is 1.39 to 1
- onTertiaryFixedVariant on tertiary is 1.39 to 1
- secondary on tertiaryContainer is 1.39 to 1
- onSecondaryFixedVariant on primary is 1.39 to 1
- onSurfaceVariant on tertiary is 1.39 to 1
- onErrorContainer on tertiary is 1.39 to 1
- onPrimaryFixedVariant on tertiary is 1.39 to 1
- error on primaryContainer is 1.39 to 1
- secondary on primaryContainer is 1.38 to 1
- onSecondaryFixedVariant on tertiary is 1.38 to 1
- onPrimaryContainer on surfaceDim is 1.36 to 1
- onTertiaryContainer on surfaceDim is 1.36 to 1
- inversePrimary on tertiaryFixed is 1.32 to 1
- inversePrimary on surfaceContainerHighest is 1.32 to 1
- inversePrimary on surfaceVariant is 1.32 to 1
- inversePrimary on errorContainer is 1.32 to 1
- inversePrimary on secondaryFixed is 1.32 to 1
- inversePrimary on primaryFixed is 1.32 to 1
- onPrimaryFixed on inverseSurface is 1.30 to 1
- onPrimary on primaryFixed is 1.30 to 1
- onSecondary on primaryFixed is 1.30 to 1
- onTertiary on primaryFixed is 1.30 to 1
- onError on primaryFixed is 1.30 to 1
- onSurface on inverseSurface is 1.29 to 1
- onBackground on inverseSurface is 1.29 to 1
- onSecondaryFixed on inverseSurface is 1.29 to 1
- onTertiaryFixed on inverseSurface is 1.29 to 1
- onPrimary on secondaryFixed is 1.29 to 1
- onSecondary on secondaryFixed is 1.29 to 1
- onTertiary on secondaryFixed is 1.29 to 1
- onError on secondaryFixed is 1.29 to 1
- onPrimary on errorContainer is 1.29 to 1
- onSecondary on errorContainer is 1.29 to 1
- onTertiary on errorContainer is 1.29 to 1
- onError on errorContainer is 1.29 to 1
- onPrimary on surfaceContainerHighest is 1.29 to 1
- onPrimary on surfaceVariant is 1.29 to 1
- onSecondary on surfaceContainerHighest is 1.29 to 1
- onSecondary on surfaceVariant is 1.29 to 1
- onTertiary on surfaceContainerHighest is 1.29 to 1
- onTertiary on surfaceVariant is 1.29 to 1
- onError on surfaceContainerHighest is 1.29 to 1
- onError on surfaceVariant is 1.29 to 1
- onPrimary on tertiaryFixed is 1.29 to 1
- onSecondary on tertiaryFixed is 1.29 to 1
- onTertiary on tertiaryFixed is 1.29 to 1
- onError on tertiaryFixed is 1.29 to 1
- onSecondaryContainer on secondary is 1.28 to 1
- onSecondaryContainer on error is 1.28 to 1
- onSecondaryContainer on surfaceTint is 1.27 to 1
- onPrimaryContainer on primaryFixed is 1.26 to 1
- onTertiaryContainer on primaryFixed is 1.26 to 1
- onPrimaryContainer on secondaryFixed is 1.26 to 1
- onTertiaryContainer on secondaryFixed is 1.26 to 1
- onPrimaryContainer on errorContainer is 1.26 to 1
- onTertiaryContainer on errorContainer is 1.26 to 1
- onPrimaryContainer on surfaceContainerHighest is 1.26 to 1
- onPrimaryContainer on surfaceVariant is 1.26 to 1
- onTertiaryContainer on surfaceContainerHighest is 1.26 to 1
- onTertiaryContainer on surfaceVariant is 1.26 to 1
- onPrimaryContainer on tertiaryFixed is 1.26 to 1
- onTertiaryContainer on tertiaryFixed is 1.26 to 1
- onSecondaryContainer on primary is 1.23 to 1
- inverseOnSurface on surfaceDim is 1.23 to 1
- onSecondaryContainer on tertiary is 1.22 to 1
- onPrimary on surfaceContainerHigh is 1.22 to 1
- onSecondary on surfaceContainerHigh is 1.22 to 1
- onTertiary on surfaceContainerHigh is 1.22 to 1
- onError on surfaceContainerHigh is 1.22 to 1
- inversePrimary on surfaceDim is 1.22 to 1
- onPrimaryContainer on surfaceContainerHigh is 1.19 to 1
- onTertiaryContainer on surfaceContainerHigh is 1.19 to 1
- onPrimary on surfaceContainer is 1.17 to 1
- onSecondary on surfaceContainer is 1.17 to 1
- onTertiary on surfaceContainer is 1.17 to 1
- onError on surfaceContainer is 1.17 to 1
- inverseOnSurface on primaryFixed is 1.14 to 1
- onPrimaryContainer on surfaceContainer is 1.14 to 1
- onTertiaryContainer on surfaceContainer is 1.14 to 1
- inverseOnSurface on secondaryFixed is 1.14 to 1
- inverseOnSurface on errorContainer is 1.14 to 1
- inverseOnSurface on surfaceContainerLowest is 1.14 to 1
- inverseOnSurface on surfaceContainerHighest is 1.14 to 1
- inverseOnSurface on surfaceVariant is 1.14 to 1
- inverseOnSurface on tertiaryFixed is 1.13 to 1
- onPrimary on surfaceContainerLow is 1.11 to 1
- onSecondary on surfaceContainerLow is 1.11 to 1
- onTertiary on surfaceContainerLow is 1.11 to 1
- onError on surfaceContainerLow is 1.11 to 1
- inverseOnSurface on surface is 1.08 to 1
- inverseOnSurface on surfaceBright is 1.08 to 1
- inverseOnSurface on background is 1.08 to 1
- onPrimaryContainer on surfaceContainerLow is 1.08 to 1
- onTertiaryContainer on surfaceContainerLow is 1.08 to 1
- inverseOnSurface on surfaceContainerHigh is 1.08 to 1
- inversePrimary on secondaryContainer is 1.06 to 1
- onPrimary on surface is 1.05 to 1
- onPrimary on surfaceBright is 1.05 to 1
- onPrimary on background is 1.05 to 1
- onSecondary on surface is 1.05 to 1
- onSecondary on surfaceBright is 1.05 to 1
- onSecondary on background is 1.05 to 1
- onTertiary on surface is 1.05 to 1
- onTertiary on surfaceBright is 1.05 to 1
- onTertiary on background is 1.05 to 1
- onError on surface is 1.05 to 1
- onError on surfaceBright is 1.05 to 1
- onError on background is 1.05 to 1
- secondary on tertiary is 1.04 to 1
- tertiary on secondary is 1.04 to 1
- tertiary on error is 1.04 to 1
- error on tertiary is 1.04 to 1
- secondary on primary is 1.04 to 1
- tertiary on surfaceTint is 1.04 to 1
- error on primary is 1.04 to 1
- inverseOnSurface on surfaceContainerLow is 1.03 to 1
- inverseOnSurface on surfaceContainer is 1.03 to 1
- onPrimaryContainer on surface is 1.02 to 1
- onPrimaryContainer on surfaceBright is 1.02 to 1
- onPrimaryContainer on background is 1.02 to 1
- onTertiaryContainer on surface is 1.02 to 1
- onTertiaryContainer on surfaceBright is 1.02 to 1
- onTertiaryContainer on background is 1.02 to 1
- onPrimaryContainer on surfaceContainerLowest is 1.02 to 1
- onTertiaryContainer on surfaceContainerLowest is 1.02 to 1
- secondary on surfaceTint is 1.01 to 1
- tertiary on primary is 1.00 to 1
- inversePrimary on tertiaryFixedDim is 1.00 to 1
- inversePrimary on secondaryFixedDim is 1.00 to 1
- error on surfaceTint is 1.00 to 1
- secondary on error is 1.00 to 1
- error on secondary is 1.00 to 1
- onPrimary on surfaceContainerLowest is 1.00 to 1
- inversePrimary on primaryFixedDim is 1.00 to 1
- onSecondary on surfaceContainerLowest is 1.00 to 1
- onTertiary on surfaceContainerLowest is 1.00 to 1
- onError on surfaceContainerLowest is 1.00 to 1

A phase fill carries no text. Each one has an ink partner that carries the text instead. On the
stone ground they measure:

- primary on surface is 6.38 to 1, so `onPrimaryFixedVariant` carries the text.
- primaryContainer on surface is 4.44 to 1, so `onPrimaryFixedVariant` carries the text.
- secondaryContainer on surface is 1.72 to 1, so `onSecondaryContainer` carries the text.
- tertiaryContainer on surface is 4.40 to 1, so `onTertiaryFixedVariant` carries the text.

The fill `primary` measures above the floor. It still carries no text. The rule is the same for
every fill.

## The type scale

Status: built

The scale has 11 roles, and every one of them is set in Plus Jakarta Sans. A line height below 1.2
times the size fails the token test.

- `headline-xl` is 36 points over 44 at weight 700, letter spacing -1.08, which is 1.22 times the size.
- `headline-xl-mobile` is 30 points over 38 at weight 700, letter spacing -0.75, which is 1.27 times the size.
- `headline-lg` is 26 points over 34 at weight 600, letter spacing -0.52, which is 1.31 times the size.
- `headline-md` is 20 points over 28 at weight 600, letter spacing -0.3, which is 1.40 times the size.
- `headline-sm` is 18 points over 24 at weight 600, letter spacing -0.18, which is 1.33 times the size.
- `body-lg` is 17 points over 26 at weight 400, letter spacing -0.08, which is 1.53 times the size.
- `body-md` is 15 points over 22 at weight 400, which is 1.47 times the size.
- `body-sm` is 13 points over 18 at weight 400, which is 1.38 times the size.
- `label-lg` is 15 points over 20 at weight 600, letter spacing 0.15, which is 1.33 times the size.
- `label-md` is 13 points over 16 at weight 600, letter spacing 0.26, which is 1.23 times the size.
- `label-sm` is 11 points over 14 at weight 600, letter spacing 0.44, which is 1.27 times the size.

## Space, radius and stroke

Status: built

The spacing scale, in points:

- `spaceXs` is 4.
- `spaceSm` is 8.
- `gutter` is 16.
- `spaceMd` is 16.
- `margin` is 20.
- `spaceLg` is 24.
- `spaceXl` is 36.

The corner radii, in points:

- `sm` is 4.
- `DEFAULT` is 8.
- `md` is 12.
- `lg` is 16.
- `xl` is 24.
- `full` is 9999.

The strokes, in points:

- `hairline` is 1.
- `icon` is 1.75.

The smallest tap target is 44 points square.
