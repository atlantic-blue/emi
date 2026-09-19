import { resolve } from 'node:path';

import { coverageOf } from './featureCoverage.ts';

// The tooling lives in this repository. The features being read need not, so a fixture repository
// can be handed to the same command the pipeline runs.
const here = resolve(import.meta.dirname, '..', '..');
const root = process.argv[2] === undefined ? here : resolve(process.argv[2]);

const result = coverageOf(root);

for (const note of result.notes) {
  process.stdout.write(`not covered yet: ${note}\n`);
}

for (const problem of result.problems) {
  process.stderr.write(`${problem}\n`);
}

if (result.problems.length > 0) {
  process.stderr.write(`\n${result.problems.length} problem(s) in the behaviour tier.\n`);
  process.exit(1);
}

process.stdout.write(
  `${result.featuresCovered} of ${result.featuresTotal} feature(s) covered, ` +
    `${result.scenarios} scenario(s) naming ${result.contractsNamed} contract(s).\n`,
);
