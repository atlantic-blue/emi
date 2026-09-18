/**
 * The drawn files the sheet shows. They are read from the repository rather than drawn again, so
 * the page shows what the application ships and an edit to one of those files changes the page.
 *
 * The root is passed in rather than reached for, because this module is read both by a command
 * that runs from the repository and by a test that runs from its own directory.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { colour } from '../../packages/tokens/src/colour.ts';

export interface SheetAssets {
  /** The word, with the ring as the dot of the i. */
  readonly wordmark: string;
  /** The ring on its own, square. */
  readonly ring: string;
  /** The word on the stone ground, with its air. */
  readonly lockup: string;
  /** The application icon, composed here from the ring, because no generated icon exists yet. */
  readonly icon: string;
}

export type MarkName = 'wordmark' | 'ring' | 'lockup';

export const markNames: readonly MarkName[] = ['wordmark', 'ring', 'lockup'];

export const markFiles: Readonly<Record<MarkName, string>> = {
  wordmark: 'brand/logo/emi-wordmark.svg',
  ring: 'brand/logo/emi-ring.svg',
  lockup: 'brand/logo/emi-lockup.svg',
};

/** The largest asset either store asks for, and the size the icon is drawn at. */
export const APPLICATION_ICON_SIZE = 1024;

/** Design section 9.2. The ring alone, at this share of the icon width. */
export const RING_SHARE_OF_ICON = 0.56;

/**
 * Section 9.2 asks for the ring to be optically centred, which sits it above the middle. The eye
 * reads the centre of a square lower than the square's own centre, so a ring on the middle line
 * looks as if it has slipped.
 */
export const OPTICAL_RISE = 0.015;

export interface Canvas {
  readonly width: number;
  readonly height: number;
}

/** The markup between the opening and the closing svg tag, so a drawing can be placed in another. */
export function insideOf(svg: string): string {
  const opened = svg.indexOf('>');
  const closed = svg.lastIndexOf('</svg>');

  if (opened === -1 || closed === -1) {
    throw new Error('a drawing with no svg element');
  }

  return svg.slice(opened + 1, closed).trim();
}

export function canvasOf(svg: string): Canvas {
  const found = /viewBox="0 0 ([0-9.]+) ([0-9.]+)"/.exec(svg);

  if (found === null) {
    throw new Error('a drawing with no view box, so nothing knows how big it is');
  }

  return { width: Number(found[1]), height: Number(found[2]) };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * The icon: the ring alone, in ember on the stone ground. The ring is placed rather than redrawn,
 * so the mark on the home screen and the mark in the word are the same drawing.
 */
export function iconSquare(ring: string): string {
  const canvas = canvasOf(ring);
  const scale = (APPLICATION_ICON_SIZE * RING_SHARE_OF_ICON) / canvas.width;
  const drawn = canvas.width * scale;
  const left = (APPLICATION_ICON_SIZE - drawn) / 2;
  const top = left - APPLICATION_ICON_SIZE * OPTICAL_RISE;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${APPLICATION_ICON_SIZE} ${APPLICATION_ICON_SIZE}"`,
    ` width="${APPLICATION_ICON_SIZE}" height="${APPLICATION_ICON_SIZE}">`,
    `<rect width="${APPLICATION_ICON_SIZE}" height="${APPLICATION_ICON_SIZE}" fill="${colour.stone}" />`,
    `<g transform="translate(${round(left)} ${round(top)}) scale(${round(scale)})">`,
    insideOf(ring),
    '</g></svg>',
  ].join('');
}

export function assetsFrom(root: string): SheetAssets {
  const read = (name: MarkName): string => readFileSync(join(root, markFiles[name]), 'utf8').trim();
  const ring = read('ring');

  return { wordmark: read('wordmark'), ring, lockup: read('lockup'), icon: iconSquare(ring) };
}
