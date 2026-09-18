import { localDay } from '../onboarding/days';
import type { Everything } from './everything';
import { readableHtml } from './readableDocument';

/**
 * The two files she gets. One a person reads, one a program reads, written from the same walk of
 * her database so neither can describe a phone the other does not.
 */

export interface ExportFile {
  readonly name: string;
  /** What the sharing sheet tells the receiving application it is handing over. */
  readonly mediaType: string;
  readonly text: string;
}

export const machineReadableMediaType = 'application/json';

export const readableMediaType = 'text/html';

/** Named by the day it was taken, so two exports a month apart do not look like the same file. */
export function exportFileStem(writtenAt: Date): string {
  return `emi-${localDay(writtenAt)}`;
}

/**
 * Two spaces of indentation, because the file is hers to open in whatever she has to hand and a
 * single line of json is unreadable in all of them.
 */
export function machineReadableFile(everything: Everything, writtenAt: Date): ExportFile {
  return {
    name: `${exportFileStem(writtenAt)}.json`,
    mediaType: machineReadableMediaType,
    text: `${JSON.stringify(everything, null, 2)}\n`,
  };
}

export function readableFile(everything: Everything, writtenAt: Date): ExportFile {
  return {
    name: `${exportFileStem(writtenAt)}.html`,
    mediaType: readableMediaType,
    text: readableHtml(everything),
  };
}

export function bothFiles(everything: Everything, writtenAt: Date): readonly ExportFile[] {
  return [readableFile(everything, writtenAt), machineReadableFile(everything, writtenAt)];
}
