/**
 * The two files a crawler reads before it reads a page of the site, and the one list both are
 * written from.
 *
 * A crawler asks for `/robots.txt` first and reads nothing else until it has an answer. That
 * answer says which paths it may ask for, and where the list of pages is. The list is the sitemap,
 * and it says which addresses exist and which of them are one page written in another language.
 *
 * An address is held once, here, so the two files cannot name different pages. The languages come
 * from the list the pages are drawn from, so a fourth language arrives in the sitemap by itself.
 */

import { type Language, fallbackLanguage, languages } from '../app/words/language.ts';
import { SITE_ORIGIN } from '../lib/addresses.ts';

/** One page of the site. Each language serves it, at its own address under that language. */
export interface PageOfTheSite {
  /**
   * The path under the language, carrying the slash at the end that every address of this site
   * carries. The home page sits directly under the language, so its path is empty.
   */
  readonly path: string;
  /** What the page is, for whoever reads this list before adding a line to it. */
  readonly serves: string;
}

/**
 * Every page the site answers 200 for. A page the site answers 404 for is not here: an address in
 * a sitemap is a promise, and a crawler handed a 404 for a promised address reads the rest of the
 * list as unreliable too. A step that ships a page adds it here.
 */
export const thePagesOfTheSite: readonly PageOfTheSite[] = [
  { path: '', serves: 'the home page, which each language serves under its own language' },
];

/** Where the two files sit. Next.js copies this folder into the assets of the build. */
export const CRAWLER_FOLDER = 'apps/website/public';

export const ROBOTS_FILE = 'robots.txt';

export const SITEMAP_FILE = 'sitemap.xml';

/**
 * Where the list of pages is, written whole. `robots.txt` is read before any page of the site, so
 * a path in it would be a path on whichever host the crawler happened to read the file from.
 */
export const SITEMAP_ADDRESS = `${SITE_ORIGIN}/${SITEMAP_FILE}`;

/**
 * The language tag a crawler reads for a reader whose language the site does not serve. It is not
 * a language, so it sits beside the three rather than among them.
 */
export const FOR_A_READER_OF_NONE = 'x-default';

/** What a sitemap is markup of, which is the namespace every crawler reads one in. */
export const SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';

/** Where a link to the same page in another language comes from, inside a sitemap. */
export const LINK_NAMESPACE = 'http://www.w3.org/1999/xhtml';

export function theAddressOfAPage(language: Language, page: PageOfTheSite): string {
  return `${SITE_ORIGIN}/${language}/${page.path}`;
}

/** The same page in one other language, as one entry of the sitemap offers it. */
export interface TheSamePageElsewhere {
  readonly forReadersOf: string;
  readonly address: string;
}

/** One entry of the sitemap: one page in one language, and that page in every language. */
export interface AnEntryOfTheSitemap {
  readonly address: string;
  readonly elsewhere: readonly TheSamePageElsewhere[];
}

/**
 * Every entry the sitemap holds: each page, once for each language. The languages of an entry are
 * the same four links the head of that page carries, because a crawler that reads one and not the
 * other has been told two different things about the same page.
 */
export function theEntriesOfTheSitemap(
  pages: readonly PageOfTheSite[] = thePagesOfTheSite,
): AnEntryOfTheSitemap[] {
  return pages.flatMap((page) =>
    languages.map((language) => ({
      address: theAddressOfAPage(language, page),
      elsewhere: [
        ...languages.map((each) => ({
          forReadersOf: each,
          address: theAddressOfAPage(each, page),
        })),
        {
          forReadersOf: FOR_A_READER_OF_NONE,
          address: theAddressOfAPage(fallbackLanguage, page),
        },
      ],
    })),
  );
}

/**
 * What `robots.txt` says: every path, to every crawler, and where the list of pages is. The site
 * holds nothing a reader may not read, so it closes nothing off, and a crawl delay would only slow
 * a crawler down over a site of three pages.
 */
export function theRobotsFile(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITEMAP_ADDRESS}\n`;
}

export function theSitemapFile(pages: readonly PageOfTheSite[] = thePagesOfTheSite): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${SITEMAP_NAMESPACE}" xmlns:xhtml="${LINK_NAMESPACE}">`,
  ];

  for (const entry of theEntriesOfTheSitemap(pages)) {
    lines.push('  <url>', `    <loc>${entry.address}</loc>`);

    for (const page of entry.elsewhere) {
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="${page.forReadersOf}" href="${page.address}" />`,
      );
    }

    lines.push('  </url>');
  }

  lines.push('</urlset>', '');

  return lines.join('\n');
}
