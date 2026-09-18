import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Claim } from './forbiddenClaims';
import {
  approvedDenials,
  claimsIn,
  forbiddenWording,
  interfaceOnlyWording,
  searchableText,
} from './forbiddenClaims';
import { interfaceFilesOf } from './singleDayForecast';

/**
 * The scan in forbiddenClaims.ts reads every tracked file against one list. This one reads the
 * application and the store listing against a longer list, because a document has room to explain
 * what a fertile window is and a screen does not. A woman reads the word on its own.
 *
 * It is a grep over the whole source rather than over the words a screen happens to render, so a
 * comment and a variable are held to it as well as a sentence. The only way to write one of these
 * words is a sentence from approvedDenials, which denies the claim rather than making it.
 */

/**
 * A module specifier is a package name and not a word anybody reads, so it comes out before the
 * search. `react-native-safe-area-context` is the one this exists for: importing it would otherwise
 * read as a claim about a day.
 */
const moduleSpecifier = /\b(from|import|require|mock)(\s*\(?\s*)(['"])(?:[^'"\\]|\\.)*?\3/g;

export function withoutModuleSpecifiers(source: string): string {
  return source.replace(
    moduleSpecifier,
    (_whole, keyword: string, between: string, quote: string) =>
      `${keyword}${between}${quote}${quote}`,
  );
}

const CONTEXT_CHARACTERS = 40;

/**
 * The three words the interface adds are ordinary English, so each one is matched whole. A name
 * built around one, `SafeAreaView` among them, is not a word she reads and is left alone. Every
 * entry on the repository list is a phrase Emi could only write on purpose, so those stay a
 * substring search and catch a plural along the way.
 */
function wordClaimsIn(file: string, text: string, words: readonly string[]): Claim[] {
  const found: Claim[] = [];

  for (const word of words) {
    const at = text.search(new RegExp(`\\b${word}\\b`, 'i'));

    if (at < 0) {
      continue;
    }

    found.push({
      file,
      wording: word,
      context: text
        .slice(Math.max(0, at - CONTEXT_CHARACTERS), at + word.length + CONTEXT_CHARACTERS)
        .trim(),
    });
  }

  return found;
}

export function interfaceClaimsIn(file: string, contents: string): Claim[] {
  const source = withoutModuleSpecifiers(contents);

  return [
    ...claimsIn(file, source, approvedDenials, forbiddenWording),
    ...wordClaimsIn(file, searchableText(source), interfaceOnlyWording),
  ];
}

export function interfaceClaimsUnder(root: string, files: readonly string[]): Claim[] {
  return files.flatMap((file) => interfaceClaimsIn(file, readFileSync(join(root, file), 'utf8')));
}

/**
 * Where feature 7 step 6 writes the words a stranger reads before she has the application. Each
 * file joins the scan on the day it is written, so that step needs no change here.
 */
export const storeListingFiles: readonly string[] = [
  'docs/store-listing.md',
  'docs/privacy-answers.md',
];

export function writtenStoreListingFiles(root: string): string[] {
  return storeListingFiles.filter((file) => existsSync(join(root, file)));
}

/** Everything held to the longer list: every file the application draws from, then the listing. */
export function scannedInterfaceFiles(root: string): string[] {
  return [...interfaceFilesOf(root), ...writtenStoreListingFiles(root)];
}
