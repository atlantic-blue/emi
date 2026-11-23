import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { fallbackLanguage, isLanguage, pageTitleOf, wordsIn } from '@/app/words';
import { SiteFooter } from '@/components/siteFooter';
import { SiteHeader } from '@/components/siteHeader';
import { theLinksOf } from '@/lib/theAddressesOfAPage';
import { theCardAChatDraws } from '@/lib/theCardAChatDraws';
import { iconLinks } from '@/tools/theIcons';

import { servedFonts } from '../fonts';
import '../globals.css';

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
 * The second reader is a chat application, and the card it draws is built in
 * `lib/theCardAChatDraws.ts`, because a page that writes its own carries the same picture by
 * asking for it there. The card reads in the language of the address: a Russian page sent to a
 * Russian reader that draws an English line in her chat reads as somebody else's link.
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

  return {
    title,
    description: words.pageDescription,
    alternates: theLinksOf(language),
    icons: { icon: iconLinks('icon'), apple: iconLinks('apple') },
    ...theCardAChatDraws({
      language,
      title,
      description: words.pageDescription,
      pictureAlt: words.sharePictureAlt,
    }),
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
