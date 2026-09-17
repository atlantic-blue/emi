/**
 * Both stores publish a list of icon sizes and both lists move. They live here as data so that a
 * size arriving or leaving is one edit in one file, and the generator never learns a number.
 */

export type Store = 'apple' | 'google';

/**
 * `icon` is the mark on its ground. The two adaptive kinds are the Android pair: the ring alone on
 * nothing, over a ground the launcher masks and moves behind it.
 */
export type Artwork = 'icon' | 'adaptiveForeground' | 'adaptiveBackground';

export interface IconFile {
  readonly store: Store;
  readonly name: string;
  readonly pixels: number;
  readonly artwork: Artwork;
  /** What the store asks this size for, one entry for each use. */
  readonly asks: readonly string[];
}

function appleIcon(pixels: number, asks: readonly string[]): IconFile {
  return { store: 'apple', name: `apple-${pixels}.png`, pixels, artwork: 'icon', asks };
}

function googleIcon(kind: string, artwork: Artwork, pixels: number, asks: string[]): IconFile {
  return { store: 'google', name: `google-${kind}-${pixels}.png`, pixels, artwork, asks };
}

/**
 * The iPhone asset catalogue, in pixels, for an application that does not support the tablet. A
 * size serves more than one use when the points and the scale multiply out the same, and one file
 * answers both.
 *
 * Apple has asked only for the 1024 since Xcode 14 and derives the rest at build time. Emi draws
 * every size itself, because the mark is a thin ring with a gap in it and a resample closes the gap
 * long before the eye stops seeing it.
 */
export const appleIcons: readonly IconFile[] = [
  appleIcon(40, ['notification, 20 points at scale 2']),
  appleIcon(58, ['settings, 29 points at scale 2']),
  appleIcon(60, ['notification, 20 points at scale 3']),
  appleIcon(80, ['spotlight, 40 points at scale 2']),
  appleIcon(87, ['settings, 29 points at scale 3']),
  appleIcon(120, ['spotlight, 40 points at scale 3', 'home screen, 60 points at scale 2']),
  appleIcon(180, ['home screen, 60 points at scale 3']),
  appleIcon(1024, ['the App Store listing, 1024 points at scale 1']),
];

const densities: readonly { readonly name: string; readonly scale: number }[] = [
  { name: 'mdpi', scale: 1 },
  { name: 'hdpi', scale: 1.5 },
  { name: 'xhdpi', scale: 2 },
  { name: 'xxhdpi', scale: 3 },
  { name: 'xxxhdpi', scale: 4 },
];

function atEveryDensity(kind: string, artwork: Artwork, points: number): IconFile[] {
  return densities.map((density) =>
    googleIcon(kind, artwork, points * density.scale, [
      `${kind === 'launcher' ? 'the launcher' : 'the adaptive icon'} at ${points} density independent pixels, ${density.name}`,
    ]),
  );
}

/**
 * The launcher square is 48 density independent pixels and the adaptive canvas is 108. The launcher
 * keeps the outer 18 on each side for its mask and its movement, so it shows about the middle 72,
 * and it never clips the middle 66. The listing icon is 512 by 512.
 */
export const googleIcons: readonly IconFile[] = [
  ...atEveryDensity('launcher', 'icon', 48),
  ...atEveryDensity('adaptive-foreground', 'adaptiveForeground', 108),
  ...atEveryDensity('adaptive-background', 'adaptiveBackground', 108),
  googleIcon('play', 'icon', 512, ['the Google Play listing, 512 by 512']),
];

export const iconFiles: readonly IconFile[] = [...appleIcons, ...googleIcons];

export function iconFilesFor(store: Store): readonly IconFile[] {
  return iconFiles.filter((file) => file.store === store);
}
