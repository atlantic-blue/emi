import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { fallbackLanguage, isLanguage, localeOf, pageTitleOf, wordsIn } from '@/app/words';
import { SiteFooter } from '@/components/siteFooter';
import { SiteHeader } from '@/components/siteHeader';
import { SHARE_PREVIEW, SITE_ORIGIN } from '@/lib/addresses';
import { theLinksOf } from '@/lib/theAddressesOfAPage';
import { iconLinks } from '@/tools/theIcons';

import { servedFonts } from '../fonts';
import '../globals.css';

/**
 * The picture, in pixels. A chat lays the card out from these two numbers before it has the file,
 * so a number here that the file is not makes the card jump once the picture arrives. The
 * scenario reads them against the committed file rather than against this declaration.
 */
const SHARE_PREVIEW_WIDTH = 1200;

const SHARE_PREVIEW_HEIGHT = 630;

/** The address of every page of the site, which is one language and then a path. */
interface WhichLanguage {
  readonly params: Promise<{ readonly lang: string }>;
}

async function languageOf({ params }: WhichLanguage) {
  const { lang } = await params;

  return isLanguage(lang) ? lang : fallbackLanguage;
}

/**
 * The squares come from one list, so a size added to that list reaches her browser without
 * anybody editing this file. They do not change with the language: the words of a page are
 * translated and the mark is the same mark everywhere.
 *
 * The second group of tags is the card a chat application draws when a woman sends somebody the
 * address. That is a different reader from a browser: it asks for the document, takes these tags
 * out of the head, throws the rest away, and never opens the page at all. So the card has to
 * carry the whole of what her sister sees before she decides whether to tap, and it has to carry
 * it in the language of the address, because a Russian page sent to a Russian reader that draws
 * an English line in her chat reads as somebody else's link.
 *
 * Both groups say the same three things, because the two readers that matter here read different
 * ones: one reads the Open Graph tags and the other reads its own.
 *
 * The third reader is a search engine, and it reads the links rather than the tags. The site
 * serves one page at three addresses, and a search engine that is not told so keeps three pages
 * and can offer a Russian reader the English one. Every page of the site arrives inside this
 * document, so a page added later carries its links without asking for them.
 */
export async function generateMetadata(asked: WhichLanguage): Promise<Metadata> {
  const language = await languageOf(asked);
  const words = wordsIn(language);
  const title = pageTitleOf(words);
  const picture = `${SITE_ORIGIN}${SHARE_PREVIEW}`;

  return {
    title,
    description: words.pageDescription,
    alternates: theLinksOf(language),
    icons: { icon: iconLinks('icon'), apple: iconLinks('apple') },
    openGraph: {
      // A chat files a card by its kind and writes the host name where no name is given, so a page
      // that says neither arrives as myemi.app beside a video and a profile.
      type: 'website',
      siteName: 'Emi',
      title,
      description: words.pageDescription,
      url: `${SITE_ORIGIN}/${language}/`,
      locale: localeOf(language),
      // The two numbers let a chat lay the card out before it has the file, so they are the size
      // the file really is. The picture carries no words of a language, so all three share it, and
      // the sentence beside it is the one her own language holds.
      images: [
        {
          url: picture,
          width: SHARE_PREVIEW_WIDTH,
          height: SHARE_PREVIEW_HEIGHT,
          alt: words.sharePictureAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: words.pageDescription,
      // The address with the sentence rather than the address alone, which is what makes this
      // reader carry the description too.
      images: [{ url: picture, alt: words.sharePictureAlt }],
    },
  };
}

/**
 * Every page the site serves arrives inside this document. It is the root layout and it sits under
 * the language segment, because the language is declared on the html element and a layout above
 * the segment could not read which language the address asked for. A reader whose software speaks
 * the words aloud reads that attribute and not the words.
 *
 * An address naming a language the site does not serve answers 404, and the page that says so is
 * drawn in the fallback language rather than in none.
 *
 * The band at the top and the band at the foot are written here rather than on each page. They are
 * every way into the product and the only place a reader is told what Emi is not, so a page with
 * neither is a page with no way on and no way back. Here, a page can neither leave one out nor
 * draw a second one.
 *
 * The language of the address reaches both bands from here, which is the one place that knows it.
 * A band given no language falls back to English, which reads as an English frame on a document
 * that declares another language.
 */
export default async function RootLayout({
  children,
  params,
}: WhichLanguage & { children: ReactNode }) {
  const faces = servedFonts.map((font) => font.variable).join(' ');
  const language = await languageOf({ params });

  return (
    <html lang={language}>
      <body className={`${faces} bg-siteGround font-text text-body-lg text-siteText`}>
        <div className="flex min-h-screen flex-col bg-siteCard font-text leading-[normal] text-siteText">
          <SiteHeader language={language} />
          {children}
          <SiteFooter language={language} />
        </div>
      </body>
    </html>
  );
}
