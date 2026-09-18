import { resolve } from 'node:path';

import '../jsx/register.ts';

// The page is markup, and the markup is only read after the hook above is registered, so the
// import is taken here rather than at the top of the file.
const { sheetProblems, writeSheet } = await import('./sheetFile.ts');
const { sheetPath } = await import('./sheet.tsx');

const args = process.argv.slice(2);
const given = args.find((argument) => !argument.startsWith('--'));
const root = given === undefined ? resolve(import.meta.dirname, '..', '..') : resolve(given);

if (args.includes('--check')) {
  const problems = sheetProblems(root);

  for (const problem of problems) {
    process.stderr.write(`${problem}\n`);
  }

  if (problems.length > 0) {
    process.exit(1);
  }

  process.stdout.write(`${sheetPath} is what the tokens generate.\n`);
} else {
  process.stdout.write(`wrote ${sheetPath} from the tokens: ${writeSheet(root)} characters.\n`);
}

export {};
