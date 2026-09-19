import { resolve } from 'node:path';

import {
  architectureDocument,
  documentProblems,
  featureDocument,
  markdownFilesOf,
} from './documentation.ts';

// The tooling lives in this repository. The documents being checked need not, so a fixture
// repository can be handed to the same command the pipeline runs.
const here = resolve(import.meta.dirname, '..', '..');
const root = process.argv[2] === undefined ? here : resolve(process.argv[2]);

const result = documentProblems(root, here);

for (const problem of result.problems) {
  process.stderr.write(`${problem}\n`);
}

if (result.problems.length > 0) {
  process.stderr.write(`\n${result.problems.length} problem(s) in the documents.\n`);
  process.exit(1);
}

const documents = markdownFilesOf(root).length;

process.stdout.write(
  `${result.diagrams} diagram(s) rendered across ${documents} document(s), ` +
    `${result.contracts} contract(s) mapped to a feature in ${featureDocument}, ` +
    `${result.refusals} refusal(s) named there, ` +
    `${result.longTerm} item(s) on the long term list, ` +
    `and every section of ${architectureDocument} says built or designed, ` +
    `read against the packages it names.\n`,
);
