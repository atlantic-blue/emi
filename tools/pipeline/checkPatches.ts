import { resolve } from 'node:path';

import { patchProblems, patchedPackages } from './nativePatches.ts';

// The tooling lives in this repository. The tree being read need not, so a fixture tree can be
// handed to the same command the pipeline runs.
const given = process.argv[2];
const root = given === undefined ? resolve(import.meta.dirname, '..', '..') : resolve(given);

const result = patchProblems(root);

for (const problem of result.problems) {
  process.stderr.write(`${problem}\n`);
}

if (result.problems.length > 0) {
  process.stderr.write(
    `\n${result.problems.length} problem(s). Install again with npm ci, and read what ` +
      'patch-package says while it runs.\n',
  );
  process.exit(1);
}

const changes = patchedPackages.reduce((total, entry) => total + entry.changes.length, 0);

process.stdout.write(
  `${result.applied} of ${changes} change(s) are in the installed tree, across ` +
    `${patchedPackages.length} package(s), read as ${result.rules} rule(s).\n`,
);
