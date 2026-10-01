import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * A forecast carries two single days beside its two ranges: the middle of the predicted start, and
 * the estimated ovulation day. Both exist so the arithmetic can count from them. Neither may reach
 * the interface, because a woman told one day and bleeding on another has been told something
 * false, which is the error contract CYCLE-2 names.
 *
 * This is a grep, and a grep cannot tell a call from a comment, so the interface names these fields
 * nowhere at all. A later step that needs a day for geometry rather than for words adds itself here,
 * where a reviewer sees it.
 */

/** Everything the application renders from. The tests beside it are not part of the interface. */
export const interfaceRoot = join('apps', 'mobile', 'src');

export const singleDayForecastFields: readonly string[] = ['expectedStart', 'estimatedOvulation'];

export const scannedExtensions: readonly string[] = ['.ts', '.tsx'];

export interface SingleDayUse {
  readonly file: string;
  readonly field: string;
  readonly context: string;
}

export function singleDayUsesIn(
  file: string,
  contents: string,
  fields: readonly string[] = singleDayForecastFields,
): SingleDayUse[] {
  const lines = contents.split('\n');
  const found: SingleDayUse[] = [];

  for (const field of fields) {
    const shape = new RegExp(`\\b${field}\\b`);
    const line = lines.find((text) => shape.test(text));

    if (line !== undefined) {
      found.push({ file, field, context: line.trim() });
    }
  }

  return found;
}

export function describeSingleDayUse(use: SingleDayUse): string {
  return `${use.file} names the single day ${use.field} in: ${use.context}`;
}

/** Every file the application is built from, in one sorted list, with paths written from the root. */
export function interfaceFilesOf(root: string, within: string = interfaceRoot): string[] {
  const found: string[] = [];

  const walk = (directory: string): void => {
    for (const entry of readdirSync(join(root, directory)).sort()) {
      const path = join(directory, entry);

      if (statSync(join(root, path)).isDirectory()) {
        walk(path);
        continue;
      }

      if (scannedExtensions.includes(extname(entry))) {
        found.push(path);
      }
    }
  };

  walk(within);

  return found;
}

export function singleDayUsesUnder(root: string, files: readonly string[]): SingleDayUse[] {
  return files.flatMap((file) => singleDayUsesIn(file, readFileSync(join(root, file), 'utf8')));
}
