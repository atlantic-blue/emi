/**
 * The committed page, and whether it is still what the tokens make of it. The root is passed in so
 * a test can point the same functions at the repository it is running inside.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { assetsFrom } from './assets.ts';
import { driftProblems, sheetDocument, sheetPath, sheetSources } from './sheet.tsx';

export function sheetMarkupFor(root: string): string {
  return sheetDocument(sheetSources(assetsFrom(root)));
}

export function committedSheet(root: string): string | null {
  const file = join(root, sheetPath);

  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

export function sheetProblems(root: string): readonly string[] {
  return driftProblems(committedSheet(root), sheetMarkupFor(root));
}

export function writeSheet(root: string): number {
  const markup = sheetMarkupFor(root);

  writeFileSync(join(root, sheetPath), markup, 'utf8');

  return markup.length;
}
