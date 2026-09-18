#!/usr/bin/env -S node --experimental-strip-types
/**
 * Writes the three pieces from the numbers in pieces.ts. A piece that breaks the style is refused
 * by drawingOf before anything reaches the disk.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { drawingOf, fileOf, pieces } from './pieces.ts';

const here = dirname(fileURLToPath(import.meta.url));

for (const piece of pieces) {
  writeFileSync(join(here, fileOf(piece)), drawingOf(piece), 'utf8');
}

process.stdout.write(
  `${pieces.length} pieces, ${pieces.flatMap((piece) => piece.shapes).length} shapes, ` +
    `written to brand/illustration\n`,
);
