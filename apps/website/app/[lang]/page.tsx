import { websiteColour } from '@emi/tokens';
import { notFound } from 'next/navigation';

import { brandEyebrowOf, isLanguage, wordsIn } from '@/app/words';
import { CarouselsProvider } from '@/components/carousels';
import { CycleRing } from '@/components/cycleRing';
import { type Founder, FounderNote } from '@/components/founderNote';
import { type Review, ReviewRow } from '@/components/reviewRow';
import { NO_PAGE_YET } from '@/lib/addresses';
import {
  A_NAME_NOBODY_HAS_SIGNED,
  A_REVIEW_NOBODY_HAS_WRITTEN,
  THE_NOTE_IULIIA_HAS_NOT_WRITTEN,
} from '@/lib/thePlaceholders';

/**
 * The page a woman meets Emi on, in the language her address names. A language the site does not
 * serve answers 404 here rather than falling back to English, so no address can hold a page one
 * language has and another does not, which is contract SITE-3.
 *
 * It is the board the operator approved on 2026-09-28, section for section and value for value:
 * `docs/design/website/home-v2/boards/MainV2.dc.html`, with its plain render beside it. A browser
 * holds this page against that render at two widths and refuses a difference of more than one pixel
 * in a thousand, so a measure written here that the board does not draw fails that comparison.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6 names
 * a secret for a style and a style written on an element cannot carry one, so a browser would
 * refuse it and the page would quietly draw wrong.
 *
 * The page is drawn on each request. Nothing on it is hers, so there is nothing to keep private
 * from a cache, and a build that drew the three pages once would still have to be deployed to say
 * a different price.
 */

/** The nine bands, each at the measures the board gives it. One place, so the order reads as one. */
const theWidestBand = 'max-w-[1120px]';

/** Apple's own mark, which is Apple's drawing and not Emi's, at the two sizes the board draws it. */
function AppleMark({ paint }: { paint: string }) {
  return (
    <svg aria-hidden="true" fill={paint} height="22" viewBox="0 0 24 24" width="22">
      <path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.6zM14.1 5.6c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z" />
    </svg>
  );
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words = wordsIn(lang);
  const under = (path: string): string => `/${lang}/${path}`;

  /** The four guides, one for each phase of the ring above them, in the board's order. */
  const theGuides = [
    {
      label: words.learnPeriodLabel,
      ink: 'text-sitePeriodInk',
      title: words.learnPeriodTitle,
      rule: 'bg-period',
    },
    {
      label: words.learnFollicularLabel,
      ink: 'text-siteFollicularInk',
      title: words.learnFollicularTitle,
      rule: 'bg-follicular',
    },
    {
      label: words.learnOvulationLabel,
      ink: 'text-siteOvulationInk',
      title: words.learnOvulationTitle,
      rule: 'bg-ovulation',
    },
    {
      label: words.learnLutealLabel,
      ink: 'text-siteLutealInk',
      title: words.learnLutealTitle,
      rule: 'bg-luteal',
    },
  ];

  /**
   * The two people building Emi, in the board's order. A name is a name in every language, so the
   * names and the initials are here and only the roles and the written note are words.
   */
  const theFounders: Founder[] = [
    {
      initials: 'IN',
      name: 'Iuliia Nikolaeva',
      role: words.founderIuliiaRole,
      note: THE_NOTE_IULIIA_HAS_NOT_WRITTEN,
      awaited: true,
    },
    {
      initials: 'JT',
      name: 'Julian Tellez',
      role: words.founderJulianRole,
      note: words.founderJulianNote,
      awaited: false,
    },
  ];

  /** The six cards of the row of reviews, each a hole, under the three places one comes from. */
  const theReviews: Review[] = [
    words.reviewFromTheStore,
    words.reviewFromTheCommunity,
    words.reviewFromTheBeta,
    words.reviewFromTheStore,
    words.reviewFromTheCommunity,
    words.reviewFromTheBeta,
  ].map((source) => ({
    quote: A_REVIEW_NOBODY_HAS_WRITTEN,
    name: A_NAME_NOBODY_HAS_SIGNED,
    source,
  }));

  return (
    <main>
      <CarouselsProvider founders={theFounders.length} reviews={theReviews.length}>
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
                <a
                  aria-label={words.store}
                  className="box-content flex min-h-[52px] items-center gap-spaceSm rounded bg-siteBlack px-margin text-siteCard no-underline"
                  href={NO_PAGE_YET}
                >
                  <AppleMark paint={websiteColour.siteCard} />
                  <span className="flex flex-col">
                    <span className="text-[12px] leading-[16px]">{words.storeSmall}</span>
                    <span className="text-[19px] leading-[20px] font-semibold">
                      {words.footerAppStore}
                    </span>
                  </span>
                </a>
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

        <section aria-labelledby="forecast-title" className="bg-siteCard">
          <div
            className={`mx-auto flex ${theWidestBand} flex-wrap items-center gap-[64px] px-spaceXl py-[112px]`}
          >
            <div className="flex flex-[1_1_320px] justify-center">
              <picture className="block w-[300px]">
                <img
                  alt={words.cycleScreenAlt}
                  className="block h-auto w-full rounded-[40px] shadow-[0_24px_48px_-16px] shadow-siteShadow"
                  src="/the-home-screen.png"
                />
              </picture>
            </div>
            <div className="flex min-w-[0px] flex-[999_1_440px] flex-col gap-spaceXl">
              <span className="font-data text-[12px] leading-[16px] font-medium tracking-[0.08em] text-siteAccent">
                {words.cycleEyebrow}
              </span>
              <h2
                className="font-display text-[48px] leading-[56px] font-semibold tracking-[-0.015em] phone:text-[32px] phone:leading-[40px]"
                id="forecast-title"
              >
                {words.cycleHeadline}
              </h2>
              <p className="text-[19px] leading-[28px] text-siteQuietText">{words.cycleLine}</p>
              <div className="box-content flex max-w-[440px] flex-col gap-spaceMd rounded-lg bg-siteTint p-spaceXl">
                <span className="text-[14px] leading-[20px] text-siteQuietText">
                  {words.cycleNextLabel}
                </span>
                <span className="font-display text-[24px] leading-[30px] font-semibold">
                  {words.cycleNextRange}
                </span>
                <span className="text-[14px] leading-[20px] text-siteQuietText">
                  {words.cycleNextConfidence}
                </span>
              </div>
              <p className="text-[14px] leading-[20px] text-siteQuietText">{words.cycleDenial}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="learn-title" className="bg-siteTint">
          <div
            className={`mx-auto flex ${theWidestBand} flex-col gap-[48px] px-spaceXl py-[112px]`}
          >
            <div className="flex max-w-[720px] flex-col gap-spaceLg">
              <span className="font-data text-[12px] leading-[16px] font-medium tracking-[0.08em] text-siteAccent">
                {words.learnEyebrow}
              </span>
              <h2
                className="font-display text-[48px] leading-[56px] font-semibold tracking-[-0.015em] phone:text-[32px] phone:leading-[40px]"
                id="learn-title"
              >
                {words.learnHeadline}
              </h2>
              <p className="text-[19px] leading-[28px] text-siteQuietText">{words.learnLine}</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-margin">
              {theGuides.map((guide) => (
                <a
                  className="flex min-h-[200px] flex-col gap-spaceSm rounded-[24px] bg-siteCard p-marginMd text-siteText no-underline"
                  href={under('calculator/')}
                  key={guide.label}
                >
                  <span
                    className={`text-[12px] leading-[16px] font-semibold tracking-[0.02em] ${guide.ink}`}
                  >
                    {guide.label}
                  </span>
                  <span className="font-display text-[24px] leading-[30px] font-semibold">
                    {guide.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-auto h-[6px] rounded-full ${guide.rule}`}
                  />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="community-title" className="bg-siteNight text-siteTintDeep">
          <div
            className={`mx-auto grid ${theWidestBand} grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-x-[64px] gap-y-[48px] px-spaceXl py-[112px]`}
          >
            <div className="flex flex-col gap-spaceLg">
              <span className="font-data text-[12px] leading-[16px] font-medium tracking-[0.08em] text-siteNightAccent">
                {words.communityEyebrow}
              </span>
              <h2
                className="font-display text-[48px] leading-[56px] font-semibold tracking-[-0.015em] phone:text-[32px] phone:leading-[40px]"
                id="community-title"
              >
                {words.communityHeadline}
              </h2>
              <p className="text-[19px] leading-[28px] text-siteNightQuietText">
                {words.communityLine}
              </p>
              <a
                className="self-start text-[16px] leading-[44px] text-siteNightAccent no-underline"
                href={NO_PAGE_YET}
              >
                {words.communityJoin}
              </a>
            </div>
            <div className="flex flex-col gap-spaceMd rounded-[24px] bg-siteTintDeep p-[36px] text-siteText">
              <span className="text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-siteAccent">
                {words.parentsEyebrow}
              </span>
              <span className="font-display text-[32px] leading-[40px] font-semibold">
                {words.parentsHeadline}
              </span>
              <p className="text-[16px] leading-[24px] text-siteQuietText">{words.parentsLine}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="note-title" className="bg-siteCard">
          <FounderNote
            controls={words.founderControlsLabel}
            eyebrow={words.noteEyebrow}
            founders={theFounders}
            next={words.founderNext}
            pause={words.carouselPause}
            play={words.carouselPlay}
            previous={words.founderPrevious}
          />
        </section>

        <section
          aria-labelledby="privacy-title"
          className="border-t-hairline border-t-siteTintLine bg-siteGround"
        >
          <div
            className={`mx-auto flex ${theWidestBand} flex-wrap items-center justify-between gap-x-[48px] gap-y-spaceXl px-spaceXl py-[72px]`}
          >
            <div className="flex items-center gap-margin">
              <span className="flex h-marginLg w-marginLg flex-[0_0_auto] items-center justify-center rounded-full bg-siteCard">
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="26"
                  stroke={websiteColour.siteAccent}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                  width="26"
                >
                  <rect height="10" rx="2" width="14" x="5" y="11" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <h2
                className="font-display text-[32px] leading-[40px] font-semibold"
                id="privacy-title"
              >
                {words.privacyHeadline}
              </h2>
            </div>
            <a
              className="text-[16px] leading-[44px] font-semibold text-siteAccent no-underline"
              href={under('privacy/')}
            >
              {words.privacyLink}
            </a>
          </div>
        </section>

        <section aria-labelledby="reviews-title" className="bg-siteTintDeep">
          <ReviewRow
            controls={words.reviewControlsLabel}
            eyebrow={words.reviewsEyebrow}
            headline={words.reviewsHeadline}
            next={words.reviewNext}
            pause={words.carouselPause}
            play={words.carouselPlay}
            previous={words.reviewPrevious}
            rating={words.reviewsRating}
            reviews={theReviews}
          />
        </section>

        <section aria-labelledby="try-title" className="bg-siteCard">
          <div
            className={`mx-auto grid ${theWidestBand} grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-spaceXl px-spaceXl py-[96px]`}
          >
            <a
              className="flex min-h-[200px] flex-col gap-spaceMd rounded-[24px] bg-siteTint p-[36px] text-siteText no-underline"
              href={under('calculator/')}
            >
              <span
                className="font-display text-[32px] leading-[40px] font-semibold"
                id="try-title"
              >
                {words.tryTitle}
              </span>
              <span className="text-[16px] leading-[24px] text-siteQuietText">{words.tryLine}</span>
              <span className="mt-auto text-[16px] font-semibold text-siteAccent">
                {words.tryLink}
              </span>
            </a>
            <a
              className="flex min-h-[200px] flex-col gap-spaceMd rounded-[24px] bg-siteTint p-[36px] text-siteText no-underline"
              href={under('support/')}
            >
              <span className="font-display text-[32px] leading-[40px] font-semibold">
                {words.askTitle}
              </span>
              <span className="text-[16px] leading-[24px] text-siteQuietText">{words.askLine}</span>
              <span className="mt-auto text-[16px] font-semibold text-siteAccent">
                {words.askLink}
              </span>
            </a>
          </div>
        </section>

        <section aria-labelledby="end-title" className="bg-siteNight text-siteTintDeep">
          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-spaceXl px-spaceXl py-[120px] text-center">
            <h2
              className="font-display text-[48px] leading-[56px] font-semibold tracking-[-0.015em] phone:text-[32px] phone:leading-[40px]"
              id="end-title"
            >
              {words.heroHeadline}
            </h2>
            <a
              aria-label={words.store}
              className="box-content flex min-h-[52px] items-center gap-spaceSm rounded bg-siteCard px-margin text-siteBlack no-underline"
              href={NO_PAGE_YET}
            >
              <AppleMark paint={websiteColour.siteBlack} />
              <span className="flex flex-col text-left">
                <span className="text-[12px] leading-[16px]">{words.storeSmall}</span>
                <span className="text-[19px] leading-[20px] font-semibold">
                  {words.footerAppStore}
                </span>
              </span>
            </a>
            <span className="text-[14px] leading-[20px] text-siteNightQuietText">
              {`${words.heroPriceLine} ${words.heroCancel}`}
            </span>
          </div>
        </section>
      </CarouselsProvider>
    </main>
  );
}
