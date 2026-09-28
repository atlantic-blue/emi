import { resolve } from 'node:path';

import { mockupProblems, mockupsIn, screenKeysNamedUnder, testFilesOf } from './mockups.ts';

// The tooling lives in this repository. The stage being checked need not, so a fixture repository
// can be handed to the same command the pipeline runs.
const given = process.argv[2];
const root = given === undefined ? resolve(import.meta.dirname, '..', '..') : resolve(given);

const checked = mockupProblems(mockupsIn(root), screenKeysNamedUnder(root, testFilesOf(root)));

for (const problem of checked.problems) {
  process.stderr.write(`${problem}\n`);
}

process.stdout.write(`${checked.said}\n`);

if (checked.problems.length > 0) {
  process.stderr.write(`\n${checked.problems.length} problem(s) in the mockups stage.\n`);
  process.exit(1);
}
