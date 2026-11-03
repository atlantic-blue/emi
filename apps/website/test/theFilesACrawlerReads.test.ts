/**
 * @jest-environment jsdom
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { fallbackLanguage, languages } from '../app/words';
import { SITE_ORIGIN } from '../lib/addresses';
import {
  FOR_A_READER_OF_NONE as FOR_A_READER_OF_NONE_ON_A_PAGE,
  theLinksOf,
} from '../lib/theAddressesOfAPage';
import {
  CRAWLER_FOLDER,
  type PageOfTheSite,
  FOR_A_READER_OF_NONE,
  LINK_NAMESPACE,
  ROBOTS_FILE,
  SITEMAP_ADDRESS,
  SITEMAP_FILE,
  SITEMAP_NAMESPACE,
  theEntriesOfTheSitemap,
  thePagesOfTheSite,
  theRobotsFile,
  theSitemapFile,
} from '../tools/theFilesACrawlerReads';

const repositoryRoot = resolve(__dirname, '..', '..', '..');

const program = join('apps', 'website', 'tools', 'writeTheFilesACrawlerReads.ts');

const rubbish: string[] = [];

afterAll(() => {
  for (const directory of rubbish) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function scratch(): string {
  const directory = mkdtempSync(join(tmpdir(), 'emi-crawler-files-'));

  rubbish.push(directory);

  return directory;
}

function committed(file: string): string {
  return readFileSync(join(repositoryRoot, CRAWLER_FOLDER, file), 'utf8');
}

interface Run {
  readonly status: number | null;
  readonly error: string;
  readonly folder: string;
}

/** The program, run the way the root script runs it, over a folder of its own. */
function writeInto(folder: string, flags: readonly string[] = ['--out', folder]): Run {
  const run = spawnSync(
    process.execPath,
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      '--experimental-strip-types',
      program,
      ...flags,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  return { status: run.status, error: run.stderr, folder };
}

/** The committed sitemap, read the way a crawler reads it, which is as markup and not as text. */
function parsed(markup: string = committed(SITEMAP_FILE)): Document {
  return new DOMParser().parseFromString(markup, 'application/xml');
}

function entriesIn(document: Document): Element[] {
  return [...document.getElementsByTagNameNS(SITEMAP_NAMESPACE, 'url')];
}

function addressIn(entry: Element): string {
  return entry.getElementsByTagNameNS(SITEMAP_NAMESPACE, 'loc')[0]?.textContent ?? '';
}

/** The same page in every other language, as one entry of the sitemap offers it. */
function elsewhereIn(entry: Element): Record<string, string> {
  return Object.fromEntries(
    [...entry.getElementsByTagNameNS(LINK_NAMESPACE, 'link')].map((link) => [
      link.getAttribute('hreflang'),
      link.getAttribute('href'),
    ]),
  );
}

/**
 * Every page under a language that the site really serves, read off the router rather than off the
 * list. A directory in brackets is not a page: it is the one that answers 404 for every address
 * the site does not have.
 */
function thePagesTheRouterServes(): string[] {
  const routes = join(repositoryRoot, 'apps', 'website', 'app', '[lang]');

  return [
    '',
    ...readdirSync(routes, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('['))
      .map((entry) => `${entry.name}/`),
  ].sort();
}

/**
 * The page one address of the list names. The longest path that matches, because every address of
 * this site ends in a slash and the home page's path is empty, so a shorter path matches every
 * address there is.
 */
function thePageAt(address: string): PageOfTheSite | undefined {
  return [...thePagesOfTheSite]
    .sort((one, other) => other.path.length - one.path.length)
    .find((page) => address.endsWith(`/${page.path}`));
}

describe('the files a crawler reads before it reads a page', () => {
  describe('what the site keeps for a crawler', () => {
    it.each([ROBOTS_FILE, SITEMAP_FILE])(
      'keeps %s, so a crawler is answered rather than refused',
      (file) => {
        expect({ file, held: existsSync(join(repositoryRoot, CRAWLER_FOLDER, file)) }).toEqual({
          file,
          held: true,
        });
      },
    );

    it('allows every path to every crawler, and says where the list of pages is', () => {
      const robots = committed(ROBOTS_FILE);

      expect(robots).toContain('User-agent: *');
      expect(robots).toContain('Allow: /');
      expect(robots).toContain(`Sitemap: ${SITEMAP_ADDRESS}`);
      expect(SITEMAP_ADDRESS).toBe('https://myemi.app/sitemap.xml');
    });

    it('closes nothing off, because the site holds nothing she may not read', () => {
      expect(committed(ROBOTS_FILE)).not.toContain('Disallow');
    });

    it('keeps the file the program writes, so neither drifts from the other', () => {
      expect(committed(ROBOTS_FILE)).toBe(theRobotsFile());
      expect(committed(SITEMAP_FILE)).toBe(theSitemapFile());
    });
  });

  describe('the list of pages', () => {
    it('is markup, in the namespace a crawler reads a sitemap in', () => {
      const document = parsed();

      expect([...document.getElementsByTagName('parsererror')]).toEqual([]);
      expect(document.documentElement.tagName).toBe('urlset');
      expect(document.documentElement.namespaceURI).toBe(SITEMAP_NAMESPACE);
      expect(entriesIn(document).length).toBeGreaterThan(0);
    });

    it('names every page of the site, in each of the three languages', () => {
      const promised = thePagesOfTheSite.flatMap((page) =>
        languages.map((language) => theLinksOf(language, page.path).canonical),
      );

      expect(entriesIn(parsed()).map(addressIn).sort()).toEqual([...promised].sort());
      expect(promised).toContain(`${SITE_ORIGIN}/ru/`);
    });

    it('names no address the site answers 404 for, and misses no page it serves', () => {
      expect(thePagesOfTheSite.map((page) => page.path).sort()).toEqual(thePagesTheRouterServes());
    });

    it('names the same page in each language on every entry, and the English page for a reader of none', () => {
      const entries = entriesIn(parsed());

      expect(entries.length).toBe(thePagesOfTheSite.length * languages.length);

      for (const entry of entries) {
        const address = addressIn(entry);
        const page = thePageAt(address);
        const language = languages.find((each) => address.includes(`/${each}/`));

        expect({ address, found: page !== undefined && language !== undefined }).toEqual({
          address,
          found: true,
        });
        expect({ address, elsewhere: elsewhereIn(entry) }).toEqual({
          address,
          elsewhere: theLinksOf(language ?? fallbackLanguage, page?.path ?? '').languages as Record<
            string,
            string
          >,
        });
      }
    });

    it('calls a reader of none of the three languages what a page of the site calls her', () => {
      expect(FOR_A_READER_OF_NONE).toBe(FOR_A_READER_OF_NONE_ON_A_PAGE);

      // The page she is offered is the page the entry is about, in the language the site falls
      // back to. Offering her the home page instead would send a reader of a fourth language to
      // the front door whichever page a search engine had found her.
      for (const entry of entriesIn(parsed())) {
        const address = addressIn(entry);

        expect(elsewhereIn(entry)[FOR_A_READER_OF_NONE]).toBe(
          `${SITE_ORIGIN}/${fallbackLanguage}/${thePageAt(address)?.path ?? ''}`,
        );
      }
    });
  });

  describe('the program that writes them', () => {
    it('writes both files again, character for character, into a folder of its own', () => {
      const run = writeInto(scratch());

      expect({ status: run.status, error: run.error }).toEqual({ status: 0, error: '' });

      for (const file of [ROBOTS_FILE, SITEMAP_FILE]) {
        expect({ file, wrote: readFileSync(join(run.folder, file), 'utf8') }).toEqual({
          file,
          wrote: committed(file),
        });
      }
    });

    it('puts a page the list gains into the sitemap, so a list the files do not match fails', () => {
      const withTheNextPage = [
        ...thePagesOfTheSite,
        { path: 'calculator/', serves: 'the free next period calculator' },
      ];
      const sitemap = theSitemapFile(withTheNextPage);

      expect(sitemap).toContain(`<loc>${SITE_ORIGIN}/ru/calculator/</loc>`);
      expect(sitemap).toContain(
        `hreflang="${FOR_A_READER_OF_NONE}" href="${SITE_ORIGIN}/en/calculator/"`,
      );
      expect(sitemap).not.toBe(committed(SITEMAP_FILE));
      expect(theEntriesOfTheSitemap(withTheNextPage).length).toBe(
        withTheNextPage.length * languages.length,
      );
      expect([...parsed(sitemap).getElementsByTagName('parsererror')]).toEqual([]);
    });

    it('refuses a flag with no path after it, and says which flag', () => {
      const run = writeInto(scratch(), ['--out']);

      expect(run.status).toBe(1);
      expect(run.error).toContain('--out');
      expect(existsSync(join(run.folder, ROBOTS_FILE))).toBe(false);
    });
  });
});
