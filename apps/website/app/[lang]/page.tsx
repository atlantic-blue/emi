import { notFound } from 'next/navigation';

import { brandEyebrowOf, isLanguage, wordsIn } from '@/app/words';
import {
  TheBandsBelowTheHero,
  TheCarousels,
  TheClosingBand,
  TheStorePress,
  theWidestBand,
} from '@/components/theBandsOfTheBoard';
import { CycleRing } from '@/components/cycleRing';
import { theStoreListingIsOpen } from '@/lib/theStoreListing';

/**
 * The page a woman meets Emi on, in the language her address names. A language the site does not
 * serve answers 404 here rather than falling back to English, so no address can hold a page one
 * language has and another does not, which is contract SITE-3.
 *
 * It is the board the operator approved on 2026-09-28, section for section and value for value:
 * `docs/design/website/home-v2/boards/MainV2.dc.html`, with its plain render beside it. A browser
 * holds this page against that render at three widths and refuses a difference of more than one
 * pixel in a thousand, so a measure written here that the board does not draw fails that
 * comparison.
 *
 * The hero is written here and every band below it is in `components/theBandsOfTheBoard.tsx`,
 * because the Black Friday page draws the same board with the offer in its hero. The hero is the
 * one band the two pages say different things in.
 *
 * The page is drawn on each request. Nothing on it is hers, so there is nothing to keep private
 * from a cache, and a build that drew the three pages once would still have to be deployed to say
 * a different price.
 *
 * One sentence of it is worked out rather than written: the window of the forecast card, which is
 * counted from the day it is drawn for. A cache that holds the page for a day draws a window a day
 * older, and her browser counts it again from her own clock, so the card never names a day that
 * has passed.
 *
 * One band of the board is not on the page. It says what other people think of Emi, and nobody has
 * said anything yet, so the board's six cards stood on the live page as six holes in brackets. The
 * band is drawn from `lib/theReviews.ts` and that list is empty, so the page draws eight of the
 * nine bands and the comparison with the board leaves the ninth out until a real review arrives.
 */
export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words = wordsIn(lang);

  return (
    <main>
      <TheCarousels language={lang}>
        <section aria-labelledby="hero-title" className="bg-siteGround">
          <div
            className={`mx-auto flex ${theWidestBand} flex-wrap items-center gap-[64px] px-spaceXl pt-[96px] pb-[104px]`}
          >
            <div className="flex min-w-[0px] flex-[999_1_440px] flex-col gap-spaceXl">
              <span className="font-data text-[12px] leading-[16px] font-medium tracking-[0.08em] text-siteAccent">
                {brandEyebrowOf(words)}
              </span>
              <h1
                className="font-display text-[64px] leading-[68px] font-semibold tracking-[-0.015em] phone:text-[48px] phone:leading-[52px]"
                id="hero-title"
              >
                {words.heroHeadline}
              </h1>
              <p className="max-w-[520px] text-[19px] leading-[28px] text-siteQuietText">
                {words.heroLine}
              </p>
              <div className="flex flex-wrap items-center gap-x-spaceXl gap-y-spaceLg pt-spaceSm">
                {theStoreListingIsOpen ? <TheStorePress words={words} /> : null}
                <span className="text-[14px] leading-[20px] text-siteQuietText">
                  {words.heroPriceLine}
                  <br />
                  {words.heroCancel}
                </span>
              </div>
            </div>
            <CycleRing language={lang} />
          </div>
        </section>

        <TheBandsBelowTheHero language={lang} />

        <TheClosingBand
          line={`${words.heroPriceLine} ${words.heroCancel}`}
          press={theStoreListingIsOpen ? <TheStorePress onNight words={words} /> : null}
          words={words}
        />
      </TheCarousels>
    </main>
  );
}
