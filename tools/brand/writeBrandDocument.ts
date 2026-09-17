import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import {
  brandCounts,
  brandDocument,
  brandDocumentPath,
  stalenessProblems,
} from './generateBrandDocument.ts';

// The tokens live in this repository. The document being written need not, so a fixture directory
// can be handed to the same command the pipeline runs.
const here = resolve(import.meta.dirname, '..', '..');
const args = process.argv.slice(2);
const checking = args.includes('--check');
const given = args.find((argument) => !argument.startsWith('--'));
const root = given === undefined ? here : resolve(given);
const file = join(root, brandDocumentPath);

const generated = brandDocument();
const counts = brandCounts();
const summary = `${counts.colours} colours, ${counts.approved} approved pairs, ${counts.refused} refused pairs and ${counts.sizes} type sizes`;

if (!checking) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, generated);

  process.stdout.write(`wrote ${brandDocumentPath} from the tokens: ${summary}.\n`);
} else {
  const committed = existsSync(file) ? readFileSync(file, 'utf8') : null;
  const problems = stalenessProblems(committed, generated);

  for (const problem of problems) {
    process.stderr.write(`${problem}\n`);
  }

  if (problems.length > 0) {
    process.exit(1);
  }

  process.stdout.write(`${brandDocumentPath} is what the tokens generate: ${summary}.\n`);
}
