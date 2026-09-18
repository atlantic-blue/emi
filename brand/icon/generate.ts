#!/usr/bin/env -S node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

// The token package imports its own files without an extension, which Node's type stripping cannot
// follow, so the one colour this program needs is read from the file that holds it.
import { colour } from '../../packages/tokens/src/colour.ts';

import {
  CANVAS,
  RING_FRACTION_OF_WIDTH,
  composeIcon,
  readRingSource,
  ringOnly,
  type Box,
  type RingSource,
} from './compose.ts';
import { colourFromHex, decodePng, inkBox } from './png.ts';
import { iconFiles, type Artwork } from './sizes.ts';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DEFAULT_RING_SOURCE = join(repositoryRoot, 'brand', 'logo', 'emi-ring.svg');
export const DEFAULT_OUTPUT = join(repositoryRoot, 'apps', 'mobile', 'assets', 'icon');
export const MASTER_NAME = 'emi-icon.svg';

/** The ring is measured on a render this wide, in pixels, before it is placed on the canvas. */
const PROBE_WIDTH = 2048;

/** The measured fraction may miss the asked for one by this much of the icon width. */
const FRACTION_TOLERANCE = 0.005;

export class IconError extends Error {}

function renderPng(svg: string, pixels: number): Buffer {
  return new Resvg(svg, { fitTo: { mode: 'width', value: pixels } }).render().asPng();
}

/** Where the drawing really sits inside the source box, in the units the source box is written in. */
function inkOfRing(ring: RingSource): Box {
  const probe = decodePng(renderPng(ringOnly(ring), PROBE_WIDTH));
  const box = inkBox(probe, 'nothing');
  const unit = ring.width / probe.width;

  return {
    left: ring.minX + box.left * unit,
    top: ring.minY + box.top * unit,
    width: box.width * unit,
    height: box.height * unit,
  };
}

function measuredFraction(icon: string): number {
  const rendered = decodePng(renderPng(icon, CANVAS));
  const box = inkBox(rendered, colourFromHex(colour.stone));

  return Math.max(box.width, box.height) / rendered.width;
}

export interface Report {
  readonly ringSource: string;
  readonly output: string;
  readonly written: readonly string[];
  readonly fraction: number;
}

export function generate(ringSourcePath: string, outputPath: string): Report {
  let text: string;
  try {
    text = readFileSync(ringSourcePath, 'utf8');
  } catch {
    throw new IconError(
      `there is no ring to draw at ${ringSourcePath}. Feature 1 step 3 draws it, and this program reads it.`,
    );
  }

  const ring = readRingSource(text);
  const ink = inkOfRing(ring);

  const icons = new Map<Artwork, string>();
  for (const artwork of ['icon', 'adaptiveForeground', 'adaptiveBackground'] as const) {
    icons.set(artwork, composeIcon(ring, artwork, ink, colour.stone));
  }

  const square = icons.get('icon') ?? '';
  const fraction = measuredFraction(square);
  if (Math.abs(fraction - RING_FRACTION_OF_WIDTH) > FRACTION_TOLERANCE) {
    throw new IconError(
      `the ring measures ${(fraction * 100).toFixed(2)} percent of the icon width, and the design asks for ${(RING_FRACTION_OF_WIDTH * 100).toFixed(2)}`,
    );
  }

  mkdirSync(outputPath, { recursive: true });
  for (const stale of readdirSync(outputPath)) {
    if (stale.endsWith('.png') || stale === MASTER_NAME) {
      rmSync(join(outputPath, stale));
    }
  }

  const written: string[] = [];
  for (const file of iconFiles) {
    writeFileSync(
      join(outputPath, file.name),
      renderPng(icons.get(file.artwork) ?? '', file.pixels),
    );
    written.push(file.name);
  }

  writeFileSync(join(outputPath, MASTER_NAME), `${square}\n`);

  return { ringSource: ringSourcePath, output: outputPath, written, fraction };
}

function valueAfter(flag: string, argv: readonly string[], fallback: string): string {
  const at = argv.indexOf(flag);
  if (at === -1) return fallback;

  const value = argv[at + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new IconError(`${flag} needs a path after it`);
  }

  return resolve(value);
}

function main(argv: readonly string[]): void {
  const report = generate(
    valueAfter('--ring', argv, DEFAULT_RING_SOURCE),
    valueAfter('--out', argv, DEFAULT_OUTPUT),
  );

  const byStore = new Map<string, number>();
  for (const file of iconFiles) {
    byStore.set(file.store, (byStore.get(file.store) ?? 0) + 1);
  }

  process.stdout.write(`read ${report.ringSource}\n`);
  process.stdout.write(
    `the ring measures ${(report.fraction * 100).toFixed(2)} percent of the width\n`,
  );
  for (const [store, count] of byStore) {
    process.stdout.write(`${store}: ${String(count)} icons\n`);
  }
  process.stdout.write(`wrote ${String(report.written.length)} icons to ${report.output}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
