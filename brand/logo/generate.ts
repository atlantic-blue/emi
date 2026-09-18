#!/usr/bin/env -S node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { drawings } from './geometry.ts';

const here = dirname(fileURLToPath(import.meta.url));

for (const drawing of drawings) {
  const drawn = drawing.draw();
  writeFileSync(join(here, drawing.file), drawn.svg);
  process.stdout.write(
    `${drawing.file}  ${Math.round(drawn.width)} by ${Math.round(drawn.height)} units\n`,
  );
}
