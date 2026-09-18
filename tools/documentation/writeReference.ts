import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import {
  checkCommand,
  generateCommand,
  referenceResult,
  referenceSummary,
  stalenessProblems,
} from './generateReference.ts';

// The packages live in this repository. The pages being written need not, so a fixture directory
// can be handed to the same command the pipeline runs.
const here = resolve(import.meta.dirname, '..', '..');
const args = process.argv.slice(2);
const checking = args.includes('--check');
const given = args.find((argument) => !argument.startsWith('--'));
const root = given === undefined ? here : resolve(given);

const result = referenceResult(here);
const summary = referenceSummary(result.counts);

if (!checking) {
  for (const page of result.pages) {
    const file = join(root, page.path);

    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, page.contents);
  }

  process.stdout.write(`wrote ${result.pages.length} pages from the source: ${summary}.\n`);
  process.stdout.write(`${checkCommand} reads them back.\n`);
} else {
  const problems = result.pages.flatMap((page) => {
    const file = join(root, page.path);
    const committed = existsSync(file) ? readFileSync(file, 'utf8') : null;

    return stalenessProblems(page.path, committed, page.contents);
  });

  for (const problem of [...problems, ...result.problems]) {
    process.stderr.write(`${problem}\n`);
  }

  if (problems.length + result.problems.length > 0) {
    process.stderr.write(`Run ${generateCommand} after fixing what is named above.\n`);
    process.exit(1);
  }

  process.stdout.write(`${result.pages.length} pages are what the source generates: ${summary}.\n`);
}
