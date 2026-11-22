import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { TheCheckoutBehindASignIn } from '@/components/theCheckoutBehindASignIn';
import { TheSignedInLine } from '@/components/theSignedInLine';
import { ThePaymentForm } from '@/components/thePaymentForm';
import { ThePlanSheIsBuying } from '@/components/thePlanSheIsBuying';
import { theLinksOf } from '@/lib/theAddressesOfAPage';
import { thePublishableKey } from '@/lib/theStripeOnThePage';

/**
 * The page she buys Emi on, in the language her address names. It is laid out as the board the
 * operator approved lays it out, `docs/design/website/checkout/boards/Checkout.dc.html`: the
 * title, the line that says which way she signed in, the plan, the way she pays and the sentence
 * that says what a payment is linked to.
 *
 * The page is for a woman who is signed in, because a payment lands against the sign in she used.
 * Her browser is the one reader that knows whether she holds a session, so nothing inside the
 * column is drawn until her browser has read it, and a reader with no session is moved to the page
 * she signs in on.
 *
 * The plan and the half that takes money are both drawn in her browser. The form needs the session
 * that lives there, and the plan needs the address she arrived with: an offer in it halves the
 * yearly amount, and a server of this site answers one cached page to every reader of a language.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6 names
 * a secret for a style and a style written on an element cannot carry one, so a browser would
 * refuse it and the page would quietly draw wrong.
 *
 * The figure and the sentence both come from `lib/theOnePrice.ts` and not from the catalogue of
 * words. She reads the price here and meets it on her statement a press later, so one file holds
 * what this site charges and every page that says it reads that file.
 */

/** The path this page sits at under a language, which its own head and the sitemap both name. */
export const THE_CHECKOUT_PAGE = 'checkout/';

/** The column the board draws the page in. */
const theColumn = 'max-w-[1024px]';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const language = isLanguage(lang) ? lang : 'en';
  const words = wordsIn(language);

  return {
    title: words.checkoutTitle,
    description: words.checkoutPrice,
    alternates: theLinksOf(language, THE_CHECKOUT_PAGE),
  };
}

export default async function CheckoutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words: SiteWords = wordsIn(lang);

  return (
    <main className="grow">
      <div
        className={`mx-auto box-border flex ${theColumn} flex-col gap-[40px] px-spaceXl pt-[56px] pb-[96px]`}
      >
        <TheCheckoutBehindASignIn language={lang}>
          <header className="flex flex-col gap-spaceSm">
            <h1 className="font-serif text-[48px] leading-[56px] font-medium tracking-[-0.02em]">
              {words.checkoutTitle}
            </h1>
            <TheSignedInLine language={lang} words={words} />
          </header>

          <div className="flex flex-col gap-[28px]">
            <ThePlanSheIsBuying words={words} />

            <ThePaymentForm language={lang} publishableKey={thePublishableKey()} words={words} />

            <p className="text-body-sm text-siteQuietText">{words.checkoutCancelAnyTime}</p>
          </div>
        </TheCheckoutBehindASignIn>
      </div>
    </main>
  );
}
