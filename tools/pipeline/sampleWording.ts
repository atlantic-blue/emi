/**
 * The rule that no screen may label anything on it as a sample. Nothing is built yet, so the lists
 * below are empty and a scan of the catalogues reads nothing at all.
 */

/** Where the words of each language live, one file for each. */
export const languageDirectory = 'apps/mobile/src/language';

export interface CatalogueKey {
  readonly key: string;
  readonly forms: readonly string[];
}

export interface Catalogue {
  readonly file: string;
  readonly keys: readonly CatalogueKey[];
}

export const sampleWording: readonly string[] = [];

export const approvedDenials: readonly string[] = [];

export interface Sample {
  readonly file: string;
  readonly key: string;
  readonly wording: string;
  readonly words: string;
}

export function describeSample(sample: Sample): string {
  return `${sample.file} says "${sample.wording}" under ${sample.key}: ${sample.words}`;
}

export function catalogueIn(file: string, _source: string): Catalogue {
  return { file, keys: [] };
}

export function catalogueFilesOf(_root: string): string[] {
  return [];
}

export function samplesIn(
  _catalogue: Catalogue,
  _denials: readonly string[] = approvedDenials,
  _searchFor: readonly string[] = sampleWording,
): Sample[] {
  return [];
}

export interface Read {
  readonly problems: readonly string[];
  readonly cataloguesRead: number;
  readonly keysRead: number;
  readonly formsRead: number;
}

export function samplesUnder(_root: string, _files: readonly string[]): Read {
  return { cataloguesRead: 0, formsRead: 0, keysRead: 0, problems: [] };
}
