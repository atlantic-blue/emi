#!/usr/bin/env -S node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types
/**
 * Draws the square that says a page is Emi, at every size a browser asks for, from the one
 * approved icon the application ships.
 *
 * Each file is drawn from the vector at the size it is wanted at. Nothing here resamples a bigger
 * picture, because the mark is a ring with a gap in it and scaling a picture of it closes the gap
 * long before the eye stops seeing it.
 *
 * The files are committed rather than built by the pipeline. The pipeline builds the site with no
 * rasteriser of its own, and a build that had to draw them would fail on a machine that cannot.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

import { APPROVED_ICON, ICON_FOLDER, iconFiles, type IconFile } from './theIcons.ts';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const DEFAULT_ICON = join(repositoryRoot, APPROVED_ICON);

export const DEFAULT_OUTPUT = join(repositoryRoot, ICON_FOLDER);

export class IconError extends Error {}

const ICO_HEADER_BYTES = 6;

const ICO_ENTRY_BYTES = 16;

/** The widest an ico entry can declare, because the field that carries it is one byte. */
const ICO_WIDEST = 256;

function renderPng(drawing: string, pixels: number): Buffer {
  return new Resvg(drawing, { fitTo: { mode: 'width', value: pixels } }).render().asPng();
}

/**
 * One png wrapped in the container a browser asks for at `/favicon.ico`. The container carries a
 * header, one directory entry naming the size and where the image sits, and then the image. Every
 * browser since Internet Explorer 9 reads a png inside this container, and a png is what the
 * rasteriser writes, so the image is not converted to the older bitmap form.
 */
export function icoAround(png: Uint8Array, pixels: number): Buffer {
  if (pixels < 1 || pixels > ICO_WIDEST) {
    throw new IconError(`an ico entry cannot declare ${String(pixels)} pixels`);
  }

  const ico = Buffer.alloc(ICO_HEADER_BYTES + ICO_ENTRY_BYTES + png.length);

  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(1, 4);
  ico.writeUInt8(pixels === ICO_WIDEST ? 0 : pixels, ICO_HEADER_BYTES);
  ico.writeUInt8(pixels === ICO_WIDEST ? 0 : pixels, ICO_HEADER_BYTES + 1);
  // No palette and no colour plane, because the image carries its own, and 32 bits a pixel, which
  // is what the rasteriser writes.
  ico.writeUInt8(0, ICO_HEADER_BYTES + 2);
  ico.writeUInt8(0, ICO_HEADER_BYTES + 3);
  ico.writeUInt16LE(1, ICO_HEADER_BYTES + 4);
  ico.writeUInt16LE(32, ICO_HEADER_BYTES + 6);
  ico.writeUInt32LE(png.length, ICO_HEADER_BYTES + 8);
  ico.writeUInt32LE(ICO_HEADER_BYTES + ICO_ENTRY_BYTES, ICO_HEADER_BYTES + 12);
  ico.set(png, ICO_HEADER_BYTES + ICO_ENTRY_BYTES);

  return ico;
}

export function contentsFor(drawing: string, file: IconFile): Buffer {
  const png = renderPng(drawing, file.pixels);

  return file.container === 'ico' ? icoAround(png, file.pixels) : png;
}

export interface Report {
  readonly icon: string;
  readonly output: string;
  readonly written: readonly string[];
}

export function writeIcons(iconPath: string, outputPath: string): Report {
  let drawing: string;

  try {
    drawing = readFileSync(iconPath, 'utf8');
  } catch {
    throw new IconError(
      `there is no icon to draw at ${iconPath}. The application ships it as ${APPROVED_ICON}, and this program reads it.`,
    );
  }

  mkdirSync(outputPath, { recursive: true });

  const written: string[] = [];

  for (const file of iconFiles) {
    writeFileSync(join(outputPath, file.name), contentsFor(drawing, file));
    written.push(file.name);
  }

  return { icon: iconPath, output: outputPath, written };
}

function valueAfter(flag: string, argv: readonly string[], fallback: string): string {
  const at = argv.indexOf(flag);

  if (at === -1) {
    return fallback;
  }

  const value = argv[at + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new IconError(`${flag} needs a path after it`);
  }

  return resolve(value);
}

function main(argv: readonly string[]): void {
  const report = writeIcons(
    valueAfter('--icon', argv, DEFAULT_ICON),
    valueAfter('--out', argv, DEFAULT_OUTPUT),
  );

  process.stdout.write(`read ${report.icon}\n`);
  for (const file of iconFiles) {
    process.stdout.write(`${file.name}: ${String(file.pixels)} pixels, ${file.asks.join(', ')}\n`);
  }
  process.stdout.write(`wrote ${String(report.written.length)} squares to ${report.output}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
