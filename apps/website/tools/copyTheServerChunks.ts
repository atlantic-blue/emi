#!/usr/bin/env -S node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON
/**
 * Puts the server chunks of the build into the package the server function runs from.
 *
 * Next.js writes the pages of an application compiled by Turbopack as chunks under
 * `.next/server/chunks/ssr`, and a page loads them by name at the first request. The standalone
 * output, which is what `output: 'standalone'` traces and what OpenNext copies into the package,
 * carries about half of them. Measured on Next.js 16.4.3 with OpenNext 4.1.14: the build wrote 22
 * and the package held 11, and one of the eleven it dropped is the chunk of the page a woman
 * reaches by accident. So every address answered 500 with a ChunkLoadError, from a package that
 * built, packaged and uploaded without a complaint.
 *
 * Building with webpack instead is not a way round it here. This application has no page of its
 * own yet, only `app/not-found.tsx`, and a webpack build writes no route for it at all: every
 * address then answers 500 even under `next start`.
 *
 * So the chunks are copied in after the package is made. The copy is whole rather than a list of
 * what was missing, because the names carry a hash of their content and a list would go stale on
 * the next build.
 *
 * Each file is given read permission as it is copied. The runtime unpacks the archive and loads
 * the code as a user of its own, so a file that arrives write only is a file no page can load,
 * and the mode a copy ends up with is the business of whichever file system the build machine
 * happens to have.
 */

import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const workspace = resolve(import.meta.dirname, '..');

const chunksOfTheBuild = join(workspace, '.next', 'server', 'chunks');

const theServerFunction = join(workspace, '.open-next', 'server-functions', 'default');

/**
 * Where the pages sit inside the package. OpenNext keeps the shape of the repository under the
 * root of the package, so a workspace of a monorepo keeps its path.
 */
const chunksOfThePackage = join(
  theServerFunction,
  relative(resolve(workspace, '..', '..'), workspace),
  '.next',
  'server',
  'chunks',
);

function filesUnder(directory: string, root: string = directory): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    return entry.isDirectory() ? filesUnder(path, root) : [relative(root, path)];
  });
}

const code = (files: string[]): string[] => files.filter((file) => file.endsWith('.js'));

if (!existsSync(theServerFunction)) {
  process.stderr.write(
    `no server function package at ${theServerFunction}, so there is nothing to complete\n`,
  );
  process.exit(1);
}

const built = code(filesUnder(chunksOfTheBuild));

if (built.length === 0) {
  process.stderr.write(
    `the build wrote no server chunk under ${chunksOfTheBuild}, so this step would copy nothing\n`,
  );
  process.exit(1);
}

const missing = built.filter((file) => !existsSync(join(chunksOfThePackage, file)));

for (const file of filesUnder(chunksOfTheBuild)) {
  const to = join(chunksOfThePackage, file);

  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(chunksOfTheBuild, file), to);
  chmodSync(to, 0o644);
}

const after = code(filesUnder(chunksOfThePackage)).length;

process.stdout.write(
  `the server function package holds ${after} of the ${built.length} server chunk(s) the build ` +
    `wrote, ${missing.length} of which the package was missing\n`,
);

if (after < built.length) {
  process.stderr.write(`the copy into ${dirname(chunksOfThePackage)} did not complete\n`);
  process.exit(1);
}
