import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

import { websiteWorkspace } from './stylesheet';

/**
 * The formatter this repository runs, driven the way the repository drives it. Prettier chooses
 * the options of a file from its path, so a test that hands the formatter its own options proves
 * nothing about the configuration committed here. The command below is the one `npm run format`
 * runs, given a path inside the site, and it finds the configuration for itself.
 *
 * It is a command and not a library call because Prettier loads its own code with a dynamic
 * import, and the runner refuses one inside a test.
 */

const repositoryRoot = resolve(websiteWorkspace, '..', '..');

const theFormatter = join(repositoryRoot, 'node_modules', 'prettier', 'bin', 'prettier.cjs');

/** A name inside the site. Nothing is written there: the name is what picks the options. */
export const aComponentOfTheSite = join(
  websiteWorkspace,
  'components',
  'ui',
  'theTestWritesThis.tsx',
);

/** A component of the site, as short as a component gets, drawing with the classes given. */
export function aComponentDrawingWith(classes: string): string {
  return `export function ACard() {\n  return <div className="${classes}">Emi</div>;\n}\n`;
}

/** The text that comes back when the formatter of this repository reads a file of the site. */
export function asTheRepositoryFormatsIt(source: string): string {
  return execFileSync(process.execPath, [theFormatter, '--stdin-filepath', aComponentOfTheSite], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    input: source,
  });
}

/** The words a component draws with, in the order it draws them in. */
export function theClassesOf(component: string): string[] {
  const [, list] = component.match(/className="([^"]*)"/) ?? [];

  return (list ?? '').split(/\s+/).filter((word) => word.length > 0);
}
