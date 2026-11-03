#!/usr/bin/env -S node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types
/**
 * Writes the two files a crawler reads, from the one list of the pages of the site.
 *
 * The files are committed rather than drawn by the server. Both addresses go to the bucket at the
 * edge, one hop before the function that draws pages, so a page route for either one would answer
 * a request that never arrives.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CRAWLER_FOLDER,
  ROBOTS_FILE,
  SITEMAP_FILE,
  theEntriesOfTheSitemap,
  thePagesOfTheSite,
  theRobotsFile,
  theSitemapFile,
} from './theFilesACrawlerReads.ts';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const DEFAULT_OUTPUT = join(repositoryRoot, CRAWLER_FOLDER);

export class CrawlerFileError extends Error {}

export interface Report {
  readonly output: string;
  readonly written: readonly string[];
}

export function writeTheFilesACrawlerReads(outputPath: string): Report {
  mkdirSync(outputPath, { recursive: true });
  writeFileSync(join(outputPath, ROBOTS_FILE), theRobotsFile());
  writeFileSync(join(outputPath, SITEMAP_FILE), theSitemapFile());

  return { output: outputPath, written: [ROBOTS_FILE, SITEMAP_FILE] };
}

function valueAfter(flag: string, argv: readonly string[], fallback: string): string {
  const at = argv.indexOf(flag);

  if (at === -1) {
    return fallback;
  }

  const value = argv[at + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new CrawlerFileError(`${flag} needs a path after it`);
  }

  return resolve(value);
}

function main(argv: readonly string[]): void {
  const report = writeTheFilesACrawlerReads(valueAfter('--out', argv, DEFAULT_OUTPUT));

  for (const page of thePagesOfTheSite) {
    process.stdout.write(`/${page.path}: ${page.serves}\n`);
  }

  process.stdout.write(
    `wrote ${report.written.join(' and ')} to ${report.output}, ` +
      `naming ${String(theEntriesOfTheSitemap().length)} address(es)\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
