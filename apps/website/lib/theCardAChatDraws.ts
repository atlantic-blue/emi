import type { Metadata } from 'next';

import { type Language, localeOf } from '@/app/words';

import { SHARE_PREVIEW, SITE_ORIGIN } from './addresses';
import { THE_HOME_PAGE, theAddressOf } from './theAddressesOfAPage';

/**
 * The card a chat application draws when a woman sends somebody an address of this site.
 *
 * That is a different reader from a browser: it asks for the document, takes these tags out of the
 * head, throws the rest away, and never opens the page at all. So the card has to carry the whole
 * of what her sister sees before she decides whether to tap.
 *
 * It is built here rather than on each page because a page that wrote its own openGraph tags would
 * replace these whole, and the first thing it would lose is the picture. A page with its own title
 * says that and keeps everything else.
 */

/**
 * The picture, in pixels. A chat lays the card out from these two numbers before it has the file,
 * so a number here that the file is not makes the card jump once the picture arrives. The
 * scenario reads them against the committed file rather than against this declaration.
 */
export const SHARE_PREVIEW_WIDTH = 1200;

export const SHARE_PREVIEW_HEIGHT = 630;

/** What one page says in the card: its language, its own words, and where it sits. */
export interface WhatACardSays {
  readonly language: Language;
  readonly title: string;
  readonly description: string;
  /** What the picture shows, read out to a woman whose software speaks a picture to her. */
  readonly pictureAlt: string;
  /** The path under the language, which the home page leaves empty. */
  readonly page?: string;
}

/**
 * The two groups of tags that carry the card. Both say the same three things, because the two
 * readers that matter here read different ones: one reads the Open Graph tags and the other reads
 * its own.
 */
export function theCardAChatDraws(said: WhatACardSays): Pick<Metadata, 'openGraph' | 'twitter'> {
  const picture = `${SITE_ORIGIN}${SHARE_PREVIEW}`;

  return {
    openGraph: {
      // A chat files a card by its kind and writes the host name where no name is given, so a page
      // that says neither arrives as myemi.app beside a video and a profile.
      type: 'website',
      siteName: 'Emi',
      title: said.title,
      description: said.description,
      url: theAddressOf(said.language, said.page ?? THE_HOME_PAGE),
      locale: localeOf(said.language),
      // The two numbers let a chat lay the card out before it has the file, so they are the size
      // the file really is. The picture carries no words of a language, so all three share it, and
      // the sentence beside it is the one her own language holds.
      images: [
        {
          url: picture,
          width: SHARE_PREVIEW_WIDTH,
          height: SHARE_PREVIEW_HEIGHT,
          alt: said.pictureAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: said.title,
      description: said.description,
      // The address with the sentence rather than the address alone, which is what makes this
      // reader carry the description too.
      images: [{ url: picture, alt: said.pictureAlt }],
    },
  };
}
