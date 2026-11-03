/**
 * @jest-environment jsdom
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { languages } from '../../apps/website/app/words';
import { theLinksOf } from '../../apps/website/lib/theAddressesOfAPage';
import {
  CRAWLER_FOLDER,
  FOR_A_READER_OF_NONE,
  LINK_NAMESPACE,
  ROBOTS_FILE,
  SITEMAP_FILE,
  SITEMAP_NAMESPACE,
  thePagesOfTheSite,
} from '../../apps/website/tools/theFilesACrawlerReads';

const feature = loadFeature(
  join(__dirname, '26.29-a-crawler-finds-every-page-of-the-site.feature'),
);

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

/** The one host of the site, written out rather than read from the files that build the files. */
const THE_SITE = 'https://myemi.app';

/** The program the root script runs, which is the only thing that writes either file. */
const theProgram = join('apps', 'website', 'tools', 'writeTheFilesACrawlerReads.ts');

/** The sentences a browser reads off a running site, which carry the same two answers. */
const whatTheBrowserReads = join(
  websiteWorkspace,
  'e2e',
  'features',
  'theFilesACrawlerReads.feature',
);

const howTheBrowserReadsThem = join(websiteWorkspace, 'e2e', 'steps', 'theFilesACrawlerReads.ts');

/** Which feature files each run reads, which is what says the live run reads this one as well. */
const whichRunReadsWhat = join(websiteWorkspace, 'playwright.config.ts');

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function committed(file: string): string {
  return read(join(repositoryRoot, CRAWLER_FOLDER, file));
}

function entriesIn(document: Document): Element[] {
  return [...document.getElementsByTagNameNS(SITEMAP_NAMESPACE, 'url')];
}

function addressIn(entry: Element): string {
  return entry.getElementsByTagNameNS(SITEMAP_NAMESPACE, 'loc')[0]?.textContent ?? '';
}

function elsewhereIn(entry: Element): Record<string, string> {
  return Object.fromEntries(
    [...entry.getElementsByTagNameNS(LINK_NAMESPACE, 'link')].map((offered) => [
      offered.getAttribute('hreflang'),
      offered.getAttribute('href'),
    ]),
  );
}

/**
 * Every page under a language that the router really serves. A directory in brackets is not a
 * page: it is the one that answers 404 for every address the site does not have.
 */
function thePagesTheRouterServes(): string[] {
  return [
    '',
    ...readdirSync(join(websiteWorkspace, 'app', '[lang]'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('['))
      .map((entry) => `${entry.name}/`),
  ].sort();
}

defineFeature(feature, (test) => {
  test('a crawler finds every page of the site', ({ given, then, and }) => {
    let robots = '';
    let list: Document | null = null;
    const rubbish: string[] = [];

    afterAll(() => {
      for (const directory of rubbish) {
        rmSync(directory, { recursive: true, force: true });
      }
    });

    const entries = (): Element[] => entriesIn(list ?? new Document());

    given('a crawler arrives at myemi.app and asks what it may read', () => {
      robots = committed(ROBOTS_FILE);

      // A read that found nothing reports the same as a file that says the right thing, so what
      // was read is part of the scenario.
      expect(robots.length).toBeGreaterThan(0);
    });

    then('it is allowed every path, and told where the list of pages is', () => {
      expect(robots).toContain('User-agent: *');
      expect(robots).toContain('Allow: /');
      expect(robots).not.toContain('Disallow');
      expect(robots).toContain(`Sitemap: ${THE_SITE}/${SITEMAP_FILE}`);
    });

    and(
      'the list is markup, and it names every page the site serves in each of the three languages',
      () => {
        list = new DOMParser().parseFromString(committed(SITEMAP_FILE), 'application/xml');

        expect([...list.getElementsByTagName('parsererror')]).toEqual([]);
        expect(list.documentElement.namespaceURI).toBe(SITEMAP_NAMESPACE);
        expect(list.documentElement.tagName).toBe('urlset');

        const promised = thePagesOfTheSite.flatMap((page) =>
          languages.map((language) => theLinksOf(language, page.path).canonical),
        );

        expect(entries().map(addressIn).sort()).toEqual([...promised].sort());
        expect(promised).toEqual([`${THE_SITE}/en/`, `${THE_SITE}/ru/`, `${THE_SITE}/es/`]);
      },
    );

    and('it promises no address the site answers 404 for', () => {
      // The pages the router draws, against the pages the list names. A page the site serves and
      // the list misses is nobody finding that page, and a page the list names and the site does
      // not serve is a crawler promised a 404.
      expect(thePagesOfTheSite.map((page) => page.path).sort()).toEqual(thePagesTheRouterServes());
      expect(existsSync(join(websiteWorkspace, 'app', '[lang]', '[...rest]'))).toBe(true);
    });

    and(
      'each entry offers the same page in the other languages, and in English to a reader of none',
      () => {
        expect(entries().length).toBe(thePagesOfTheSite.length * languages.length);

        for (const entry of entries()) {
          const address = addressIn(entry);
          const page = thePagesOfTheSite.find((each) => address.endsWith(`/${each.path}`));
          const language = languages.find((each) => address.includes(`/${each}/`));

          expect({ address, read: page !== undefined && language !== undefined }).toEqual({
            address,
            read: true,
          });

          // The same four links the head of that page carries, so a crawler reading the list and
          // a crawler reading the page are told one thing rather than two.
          expect({ address, elsewhere: elsewhereIn(entry) }).toEqual({
            address,
            elsewhere: theLinksOf(language ?? 'en', page?.path ?? '').languages,
          });

          expect(elsewhereIn(entry)[FOR_A_READER_OF_NONE]).toBe(
            `${THE_SITE}/en/${page?.path ?? ''}`,
          );
        }
      },
    );

    and(
      'one program writes both files, so a page the site gains cannot be left out of them',
      () => {
        const folder = mkdtempSync(join(tmpdir(), 'emi-crawler-scenario-'));

        rubbish.push(folder);

        const run = spawnSync(
          process.execPath,
          [
            '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
            '--experimental-strip-types',
            theProgram,
            '--out',
            folder,
          ],
          { cwd: repositoryRoot, encoding: 'utf8' },
        );

        expect({ status: run.status, error: run.stderr }).toEqual({ status: 0, error: '' });

        for (const file of [ROBOTS_FILE, SITEMAP_FILE]) {
          expect({ file, wrote: read(join(folder, file)) }).toEqual({
            file,
            wrote: committed(file),
          });
        }
      },
    );

    and(
      'a browser reads both files off a running site, and reads them again on the live host',
      () => {
        const sentence = 'a crawler finds every page of the site';

        expect(read(whatTheBrowserReads)).toContain(`Scenario: ${sentence}`);

        const steps = read(howTheBrowserReadsThem);

        for (const address of [`/${ROBOTS_FILE}`, `/${SITEMAP_FILE}`]) {
          expect({ address, asked: steps.includes(`'${address}'`) }).toEqual({
            address,
            asked: true,
          });
        }

        // The live run reads the features of this folder as well as its own, so the deploy reads
        // these two files off the real host after the merge.
        const config = read(whichRunReadsWhat);

        expect(config).toContain("const everywhere = 'e2e/features/*.feature'");
        expect(config).toContain('liveHost === undefined ? everywhere : [everywhere, liveOnly]');
      },
    );
  });
});
