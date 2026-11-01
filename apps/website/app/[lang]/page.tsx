import { notFound } from 'next/navigation';

import { isLanguage, wordsIn } from '@/app/words';
import { SiteFooter } from '@/components/siteFooter';
import { SiteHeader } from '@/components/siteHeader';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Where the two presses point until the store listing exists. The site root rather than a guess at
 * the address Apple will give the application, because a link to a page that does not exist yet is
 * a promise the site cannot keep.
 */
export const PLACEHOLDER_ADDRESS = '/';

/**
 * The page a woman meets Emi on, in the language her address names. A language the site does not
 * serve answers 404 here rather than falling back to English, so no address can hold a page one
 * language has and another does not, which is contract SITE-3.
 *
 * The page is drawn on each request. Nothing on it is hers, so there is nothing to keep private
 * from a cache, and a build that drew the three pages once would still have to be deployed to say
 * a different price.
 *
 * The two measures are Tailwind's own, because `packages/tokens` names no page width: a line of
 * running text longer than about thirty six rem is hard to come back to, and a headline reads as
 * one shape up to about forty eight.
 */
export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words = wordsIn(lang);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader language={lang} />
      <main className="flex-1">
        <section className="bg-ground px-margin py-marginLg text-center">
          <h1 className="mx-auto max-w-3xl font-display text-display-lg-mobile text-text sm:text-display-lg">
            {words.brandLine} <span className="text-secondaryText">{words.tagline}</span>
          </h1>
          <p className="mx-auto mt-margin max-w-xl font-text text-body-lg text-secondaryText">
            {words.line}
          </p>
        </section>
        <section className="bg-accentSoft px-margin py-marginLg">
          <Card className="mx-auto flex max-w-xl flex-col items-center gap-spaceLg text-center">
            <a className={buttonVariants()} href={PLACEHOLDER_ADDRESS}>
              {words.store}
            </a>
            <a
              className="font-text text-button-lg text-accent underline"
              href={PLACEHOLDER_ADDRESS}
            >
              {words.beta}
            </a>
            <p className="font-text text-body-lg text-text">{words.price}</p>
          </Card>
        </section>
      </main>
      <SiteFooter language={lang} />
    </div>
  );
}
