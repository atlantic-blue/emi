import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { fallbackLanguage, isLanguage, wordsIn } from '@/app/words';

import { servedFont } from '../fonts';
import '../globals.css';

/** The address of every page of the site, which is one language and then a path. */
interface WhichLanguage {
  readonly params: Promise<{ readonly lang: string }>;
}

async function languageOf({ params }: WhichLanguage) {
  const { lang } = await params;

  return isLanguage(lang) ? lang : fallbackLanguage;
}

export async function generateMetadata(asked: WhichLanguage): Promise<Metadata> {
  return { title: 'Emi', description: wordsIn(await languageOf(asked)).pageDescription };
}

/**
 * Every page the site serves arrives inside this document. It is the root layout and it sits under
 * the language segment, because the language is declared on the html element and a layout above
 * the segment could not read which language the address asked for. A reader whose software speaks
 * the words aloud reads that attribute and not the words.
 *
 * An address naming a language the site does not serve answers 404, and the page that says so is
 * drawn in the fallback language rather than in none.
 */
export default async function RootLayout({
  children,
  params,
}: WhichLanguage & { children: ReactNode }) {
  return (
    <html lang={await languageOf({ params })}>
      <body className={`${servedFont.variable} bg-ground font-text text-body-lg text-text`}>
        {children}
      </body>
    </html>
  );
}
