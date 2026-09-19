import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The rule that keeps the pictures honest: every picture the repository holds is compared against
 * the screens that draw it, and the check says how many it compared.
 *
 * A check that names its subjects by hand grows a gap the moment somebody adds the next file, and
 * the gap is invisible, because the check stays green while it reads less than it used to. So
 * nothing here names a picture. The count comes off the disk and the comparisons come out of a
 * ledger the run writes, and a run that compared fewer than it found fails.
 */

/** Where the picture files sit, which is what the runner discovers. */
export const pictureDirectory = join('apps', 'mobile', 'tests', 'pictures');

/** Where a picture and the markup it was drawn from are committed, beside each other. */
export const drawingDirectory = join('brand', 'screens');

/**
 * The file each comparison writes its name into. The count is then a record of what ran rather
 * than a number the check tells itself.
 */
export const LEDGER_VARIABLE = 'EMI_PICTURE_LEDGER';

export const pictureSuffix = '.picture.tsx';

/** Every picture file on disk, sorted, named as the directory names them. */
export function pictureFilesOf(root: string): string[] {
  return readdirSync(join(root, pictureDirectory))
    .filter((file) => file.endsWith(pictureSuffix))
    .sort();
}

export interface Drawings {
  /** Every picture committed, without its extension. */
  readonly drawn: string[];
  /** Every markup file committed, without its extension. */
  readonly markup: string[];
}

export function drawingsIn(root: string): Drawings {
  const held = readdirSync(join(root, drawingDirectory));
  const named = (extension: string): string[] =>
    held
      .filter((file) => file.endsWith(extension))
      .map((file) => file.slice(0, -extension.length))
      .sort();

  return { drawn: named('.png'), markup: named('.html') };
}

/**
 * A picture with no markup beside it cannot be compared: the comparison reads the markup, because
 * two browsers draw one page into different bytes and a check on the bytes would go red on the
 * machine rather than on the change.
 */
export function uncomparedProblems(drawings: Drawings): string[] {
  return drawings.drawn
    .filter((name) => !drawings.markup.includes(name))
    .map(
      (name) =>
        `${join(drawingDirectory, `${name}.png`)} has no ${join(drawingDirectory, `${name}.html`)} beside it, so nothing compares it: it is drawn and never read back`,
    );
}

/** The names a run wrote into the ledger, which is one line for each comparison it made. */
export function comparedIn(ledger: string): string[] {
  return ledger
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort();
}

/**
 * The count is the check. A run that compared fewer pictures than there are picture files drew
 * some of them and read none of them back, and a run that compared none at all proved nothing.
 */
export function countProblems(found: readonly string[], compared: readonly string[]): string[] {
  if (compared.length === 0) {
    return [
      `the run compared no picture at all, and ${pictureDirectory} holds ${found.length} picture file(s), so it proved nothing`,
    ];
  }

  if (compared.length < found.length) {
    return [
      `the run compared ${compared.length} picture(s) and ${pictureDirectory} holds ${found.length} picture file(s), so ${found.length - compared.length} of them drew without comparing`,
    ];
  }

  return [];
}

/** True where the repository holds a picture of that name, drawn and committed. */
export function isDrawn(root: string, name: string): boolean {
  return existsSync(join(root, drawingDirectory, `${name}.png`));
}

export interface PictureCheck {
  readonly found: string[];
  readonly compared: string[];
  readonly said: string;
  readonly problems: string[];
}

export function pictureProblems(
  found: readonly string[],
  compared: readonly string[],
  drawings: Drawings,
): PictureCheck {
  const problems = [...countProblems(found, compared), ...uncomparedProblems(drawings)];

  return {
    found: [...found],
    compared: [...compared],
    said:
      problems.length > 0
        ? `${compared.length} picture(s) compared against ${found.length} picture file(s) in ${pictureDirectory}`
        : `${compared.length} picture(s) compared against ${found.length} picture file(s) in ${pictureDirectory}, and every picture carries the markup it was drawn from`,
    problems,
  };
}
