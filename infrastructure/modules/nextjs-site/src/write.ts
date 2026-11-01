/**
 * Writes the artifacts of `code/` from the TypeScript in `src/`, or with `--check` reads them and
 * refuses a difference. Run it after changing either source.
 *
 * The directory it reads can be given as an argument, so a test can point it at a copy and prove
 * the check fails on a stale artifact without touching the committed one. The formatting still
 * comes from the repository's own prettier configuration, because this file stays where it is.
 *
 * Run it with:
 *   node --disable-warning=ExperimentalWarning --experimental-strip-types \
 *     infrastructure/modules/nextjs-site/src/write.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { artifactsOf } from './generate.ts';

const asked = process.argv.slice(2);
const checking = asked.includes('--check');
const given = asked.find((argument) => !argument.startsWith('--'));
const moduleDirectory = given === undefined ? join(import.meta.dirname, '..') : given;

const artifacts = await artifactsOf(join(import.meta.dirname, '..'), moduleDirectory);
const stale: string[] = [];

for (const artifact of artifacts) {
  const path = join(moduleDirectory, artifact.file);

  if (!checking) {
    writeFileSync(path, artifact.contents);
    process.stdout.write(`wrote ${artifact.file}\n`);
    continue;
  }

  if (readFileSync(path, 'utf8') !== artifact.contents) {
    stale.push(artifact.file);
  }
}

if (stale.length > 0) {
  for (const file of stale) {
    process.stderr.write(`${file} is not what src/ says it is\n`);
  }
  process.stderr.write('Write it again with src/write.ts\n');
  process.exit(1);
}

if (checking) {
  process.stdout.write(`${artifacts.length} artifact(s) match the TypeScript beside them\n`);
}
