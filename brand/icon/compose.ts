import type { Artwork } from './sizes.ts';

/** The composed icon is drawn on this square and rasterised down to each size the stores ask for. */
export const CANVAS = 1000;

/** Section 9.2 of the design: the ring occupies 56 percent of the icon width. */
export const RING_FRACTION_OF_WIDTH = 0.56;

/**
 * The gap in the ring opens at the upper left, so the mark carries less ink at the top than at the
 * bottom and reads low when it sits on the geometric centre. It is raised by this much of the
 * width. The design asks for "slightly above" and names no number, so this one is a choice.
 */
export const OPTICAL_RISE_OF_WIDTH = 0.02;

/**
 * An Android adaptive icon is drawn on 108 density independent pixels. The launcher keeps the outer
 * 18 on each side, so it shows about the middle 72 behind a mask it chooses. The ring is sized and
 * raised inside that visible square, so the icon reads the same on both stores, and at 56 percent
 * of it the mark stays well inside the 66 the launcher never clips.
 */
export const ADAPTIVE_VISIBLE_FRACTION = 72 / 108;

export interface RingSource {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
  /** Everything inside the root element of the source file, carried across untouched. */
  readonly inner: string;
}

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export class RingSourceError extends Error {}

const ROOT = /<svg\b([^>]*)>/i;
const VIEW_BOX = /viewBox\s*=\s*["']([^"']+)["']/i;

export function readRingSource(text: string): RingSource {
  const root = ROOT.exec(text);
  if (root === null) {
    throw new RingSourceError('the ring source holds no svg element');
  }

  const viewBox = VIEW_BOX.exec(root[1] ?? '');
  if (viewBox === null) {
    throw new RingSourceError(
      'the ring source carries no viewBox, so there is no box to fit the mark into',
    );
  }

  const numbers = (viewBox[1] ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (numbers.length !== 4 || numbers.some((number) => !Number.isFinite(number))) {
    throw new RingSourceError(`the viewBox "${String(viewBox[1])}" is not four numbers`);
  }

  const [minX = 0, minY = 0, width = 0, height = 0] = numbers;
  if (width <= 0 || height <= 0) {
    throw new RingSourceError(`the viewBox "${String(viewBox[1])}" has no area`);
  }

  const opens = (root.index ?? 0) + root[0].length;
  const closes = text.lastIndexOf('</svg>');
  const inner = closes > opens ? text.slice(opens, closes).trim() : '';
  if (inner.length === 0) {
    throw new RingSourceError('the ring source draws nothing inside its svg element');
  }

  return { minX, minY, width, height, inner };
}

/** The square the ring is drawn into, and where its centre sits, both in canvas units. */
export function placementFor(artwork: Artwork): {
  readonly size: number;
  readonly centreX: number;
  readonly centreY: number;
} {
  const visible = artwork === 'icon' ? 1 : ADAPTIVE_VISIBLE_FRACTION;

  return {
    size: RING_FRACTION_OF_WIDTH * visible * CANVAS,
    centreX: CANVAS / 2,
    centreY: CANVAS / 2 - OPTICAL_RISE_OF_WIDTH * visible * CANVAS,
  };
}

function round(value: number): string {
  return Number(value.toFixed(4)).toString();
}

export function ringOnly(ring: RingSource): string {
  const viewBox = [ring.minX, ring.minY, ring.width, ring.height].map(round).join(' ');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`,
    ring.inner,
    '</svg>',
  ].join('\n');
}

/**
 * The mark is fitted by the ink the rasteriser actually puts down, not by the box the source
 * declares, so padding around the drawing cannot quietly shrink the ring below the fraction the
 * design asks for.
 */
export function composeIcon(ring: RingSource, artwork: Artwork, ink: Box, ground: string): string {
  const place = placementFor(artwork);
  const scale = place.size / Math.max(ink.width, ink.height);
  const left = place.centreX - (ink.left + ink.width / 2) * scale;
  const top = place.centreY - (ink.top + ink.height / 2) * scale;

  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">`,
  ];

  if (artwork !== 'adaptiveForeground') {
    lines.push(`  <rect width="${CANVAS}" height="${CANVAS}" fill="${ground}"/>`);
  }

  if (artwork !== 'adaptiveBackground') {
    lines.push(`  <g transform="translate(${round(left)} ${round(top)}) scale(${round(scale)})">`);
    lines.push(ring.inner);
    lines.push('  </g>');
  }

  lines.push('</svg>');

  return lines.join('\n');
}
