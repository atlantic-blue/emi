import { resolve } from 'node:path';

import { featureDocument, storyDocument, storyProblems } from './story.ts';

// The tooling lives in this repository. The documents being checked need not, so a fixture
// repository can be handed to the same command the pipeline runs.
const given = process.argv[2];
const root = given === undefined ? resolve(import.meta.dirname, '..', '..') : resolve(given);

const result = storyProblems(root);

for (const note of result.notes) {
  process.stdout.write(`${note}\n`);
}

for (const problem of result.problems) {
  process.stderr.write(`${problem}\n`);
}

if (result.problems.length > 0) {
  process.stderr.write(`\n${result.problems.length} problem(s) in ${storyDocument}.\n`);
  process.exit(1);
}

const drawings = result.shown.length - result.shownScreens.length;

process.stdout.write(
  `${storyDocument} tells ${result.told.length} of the ${result.features.length} feature(s) in ` +
    `${featureDocument}, in ${result.beats} beat(s), showing ${result.shown.length} picture(s): ` +
    `${result.shownScreens.length} of the ${result.onDisk.length} in brand/screens, and ` +
    `${drawings} drawn elsewhere.\n`,
);
