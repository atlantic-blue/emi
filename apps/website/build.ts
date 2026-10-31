import { mkdirSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { renderNotFoundPage } from './src/NotFoundPage.tsx';

/** Where the build writes when the command line names no directory. */
export const defaultOutputDirectory = 'dist';

/** The file a woman reaches at an address the site does not hold. */
export const notFoundFile = '404.html';

/**
 * Writes the site into `into` and answers the files it wrote, so the deploy uploads exactly those
 * and a test reads them back.
 */
export function buildWebsite(into: string): string[] {
  mkdirSync(into, { recursive: true });

  const page = join(into, notFoundFile);

  writeFileSync(page, renderNotFoundPage(), 'utf8');

  return [page];
}

// jest loads this module as CommonJS, where `import.meta` does not exist, and node loads it as a
// module, where `__filename` does not. The command line is the one thing both runtimes answer.
if (process.argv[1]?.endsWith(join('apps', 'website', 'build.ts')) === true) {
  const into = process.argv[2] ?? defaultOutputDirectory;

  for (const file of buildWebsite(into)) {
    process.stdout.write(`${file.split(sep).join('/')}\n`);
  }
}
