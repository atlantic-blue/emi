import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

/**
 * The files that read one of those days to place a shape rather than to write a date, each with
 * the reason it is here. This is the list the comment above sends a step to.
 *
 * An entry is not a licence to write the day in words. It says the file paints with it: the day
 * decides which disc of an already tinted window is drawn darker, and nothing on the screen names
 * a date, a phase or a sentence about it. A woman reading the month is shown a window, which is a
 * range, and the error contract CYCLE-2 names is a single date drawn in place of a range.
 *
 * A stale entry fails the gate, so a file that stops reading the day cannot leave the exemption
 * behind for the next one to inherit.
 */
export const singleDayForGeometry: Readonly<Record<string, string>> = {
  'apps/mobile/src/features/calendar/herMonthPhases.ts':
    'the month fills one disc inside the tinted fertile window, and writes no date and no word',
};

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

/** The reason an exemption gives, or nothing where the file is held to the rule like the rest. */
function exemptionFor(file: string): string | undefined {
  return singleDayForGeometry[file.split('\\').join('/')];
}

/**
 * Every single day the interface names, with the files exempted above left out, and a refusal for
 * an exemption that no longer describes anything.
 */
export function singleDayUsesUnder(root: string, files: readonly string[]): SingleDayUse[] {
  const read = (file: string): string => readFileSync(join(root, file), 'utf8');
  // Staleness is asked of the repository rather than of the list handed in, because a caller may
  // scan one corner of the application and an exemption outside it is not thereby stale.
  const stale = Object.keys(singleDayForGeometry).filter(
    (file) => !existsSync(join(root, file)) || singleDayUsesIn(file, read(file)).length === 0,
  );

  if (stale.length > 0) {
    throw new Error(
      `${stale.join(', ')} is exempted from the single day rule and names no single day, so the exemption is stale`,
    );
  }

  return files
    .filter((file) => exemptionFor(file) === undefined)
    .flatMap((file) => singleDayUsesIn(file, read(file)));
}
