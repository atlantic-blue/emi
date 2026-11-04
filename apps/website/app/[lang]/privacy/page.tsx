import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { THE_EMI_CODE } from '@/lib/addresses';
import { theLinksOf } from '@/lib/theAddressesOfAPage';

/**
 * The page that explains the encryption, in the language her address names. It is the board the
 * operator approved, `docs/design/website/protection/boards/Protection.dc.html`, part for part and
 * value for value, with its plain render beside it. A browser holds the parts of this page the
 * board still describes against that render at three widths and refuses a difference of more than
 * one pixel in a thousand, so a measure written here that the board does not draw fails that
 * comparison.
 *
 * Three places say what version 1 does rather than what the board drew, because the board was
 * drawn before any of it existed. There is no free note to log. Nothing restores a lost phone, so
 * the first limit names the export instead of a code. And the product has an account, payments and
 * anonymous reports, which the paragraph under the opening sentence names and the policy explains.
 * Nobody has redrawn the board, so those parts are the ones the picture comparison leaves out.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6 names
 * a secret for a style and a style written on an element cannot carry one, so a browser would
 * refuse it and the page would quietly draw wrong.
 *
 * The headings are the one place on the site set in a serif. The board asks for it by name, and
 * the site serves the board's own two files rather than the family from a font service, because
 * another release of it measures differently and this page is held to the board.
 */

/** The path this page sits at under a language, which its own head and the sitemap both name. */
const THE_PRIVACY_PAGE = 'privacy/';

/** The widest band of this board, which is narrower than the home page's. */
const theWidestBand = 'max-w-[1024px]';

/** A heading of a band, at the two sizes the board draws it at. */
const aBandHeading =
  'font-serif text-[32px] leading-[40px] font-medium tracking-[-0.01em] phone:text-[24px] phone:leading-[30px]';

/** The card every part of the page is built from, at the corner and the ground the board gives it. */
const aCard = 'flex flex-col rounded-[24px]';

/** What one of the three steps is: a number in its own ink, a title, a line, and sometimes a badge. */
interface AStep {
  readonly count: string;
  readonly ink: string;
  readonly title: string;
  readonly line: string;
  readonly badge?: 'built' | 'designed';
}

/**
 * What one of the three keys is: a drawing, a title and a line, and for one of them a badge.
 *
 * The badge is the same sentence the step about the sync carries, for the same reason. The code
 * that would open the vault on another phone is written and nothing in the application reaches it,
 * so a reader who takes this card as built believes she has a way back that she does not have.
 */
interface AKey {
  readonly drawing: React.ReactNode;
  readonly title: string;
  readonly line: string;
  readonly badge?: 'designed';
}

/** What one of the four limits is: a title and what she can do about it. */
interface ALimit {
  readonly title: string;
  readonly line: string;
}

/**
 * The three drawings of the dark band, at the stroke and the size the board draws them. Each one
 * is hidden from a reader whose software reads the page aloud, because the heading beside it says
 * the same thing in words and a drawing read twice is a drawing read wrong.
 */
function AKeyDrawing({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="stroke-siteNightAccent"
      fill="none"
      height="40"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="40"
    >
      {children}
    </svg>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const language = isLanguage(lang) ? lang : 'en';
  const words = wordsIn(language);

  // The layout names the home page as the address of every page it draws, because it cannot read
  // the path. A page that let that stand would tell a search engine it is the home page, and the
  // two would then be one page in the record.
  return {
    title: words.footerHowEmiProtects,
    description: words.protectionLine,
    alternates: theLinksOf(language, THE_PRIVACY_PAGE),
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words: SiteWords = wordsIn(lang);

  const theSteps: AStep[] = [
    {
      count: '1',
      ink: 'text-sitePeriodInk',
      title: words.protectionLogTitle,
      line: words.protectionLogLine,
    },
    {
      count: '2',
      ink: 'text-siteFollicularInk',
      title: words.protectionSealTitle,
      line: words.protectionSealLine,
      badge: 'built',
    },
    {
      count: '3',
      ink: 'text-siteLutealInk',
      title: words.protectionLeavesTitle,
      line: words.protectionLeavesLine,
      badge: 'designed',
    },
  ];

  /**
   * The three holders of a key, in the board's order. Emi is third and is called Emi in every
   * language, so its name sits here rather than in a catalogue, where the names of the two people
   * building Emi sit for the same reason.
   */
  const theKeys: AKey[] = [
    {
      drawing: (
        <AKeyDrawing>
          <rect height="20" rx="2" width="10" x="7" y="2" />
          <path d="M11 18h2" />
        </AKeyDrawing>
      ),
      title: words.protectionPhoneTitle,
      line: words.protectionPhoneLine,
    },
    {
      drawing: (
        <AKeyDrawing>
          <path d="M6 4h12v16H6z" />
          <path d="M9 9h6M9 13h6M9 17h3" />
        </AKeyDrawing>
      ),
      title: words.protectionYouTitle,
      line: words.protectionYouLine,
      badge: 'designed',
    },
    {
      drawing: (
        <AKeyDrawing>
          <path d="M4 7h16v10H4z" />
          <path d="M3 3l18 18" />
        </AKeyDrawing>
      ),
      title: 'Emi',
      line: words.protectionEmiLine,
    },
  ];

  const theLimits: ALimit[] = [
    { title: words.protectionLostTitle, line: words.protectionLostLine },
    { title: words.protectionUnlockedTitle, line: words.protectionUnlockedLine },
    { title: words.protectionHostileTitle, line: words.protectionHostileLine },
    { title: words.protectionOutsideTitle, line: words.protectionOutsideLine },
  ];

  return (
    <main>
      <section
        aria-labelledby="privacy-title"
        className="mx-auto box-border flex max-w-[860px] flex-col items-center gap-margin px-spaceXl pt-[88px] text-center"
      >
        <span className="text-[16px] leading-[24px] font-semibold text-siteAccent">
          {words.protectionEyebrow}
        </span>
        <h1
          className="font-serif text-[64px] leading-[68px] font-medium tracking-[-0.02em] phone:text-[48px] phone:leading-[52px]"
          id="privacy-title"
        >
          {words.protectionHeadline}{' '}
          <span className="text-siteControlLine">{words.protectionHeadlineQuiet}</span>
        </h1>
        <p className="max-w-[620px] text-[19px] leading-[28px] text-siteQuietText">
          {words.protectionLine}
        </p>
        {/* The three things the rest of the page does not describe, and the press to the document
            that describes them. The board was drawn when Emi had none of them. */}
        <p className="max-w-[620px] text-[19px] leading-[28px] text-siteQuietText">
          {`${words.protectionAlsoBefore} `}
          <a className="text-siteAccent" href={`/${lang}/privacy-policy/`}>
            {words.protectionAlsoPolicy}
          </a>
          {words.protectionAlsoAfter}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-spaceXl gap-y-spaceMd">
          <a
            className="rounded-full bg-siteSlider px-spaceXl text-[16px] leading-[44px] font-semibold text-siteCard no-underline"
            href={THE_EMI_CODE}
          >
            {words.protectionReadTheCode}
          </a>
          <a className="text-[16px] text-siteAccent no-underline" href={`/${lang}/privacy-policy/`}>
            {words.protectionReadTheDocument}
          </a>
        </div>
        <img
          alt={words.protectionScreenAlt}
          className="mt-[32px] h-[420px] w-[320px] rounded-t-[40px] object-cover object-top shadow-[0_4px_20px_-2px] shadow-siteFaintShadow"
          src="/the-privacy-screen.png"
        />
      </section>

      <section aria-labelledby="one-day-title" className="bg-siteTint py-[80px]">
        <div className={`mx-auto box-border flex ${theWidestBand} flex-col gap-[32px] px-spaceXl`}>
          <h2 className={`text-center ${aBandHeading}`} id="one-day-title">
            {words.protectionDayHeadline}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-margin">
            {theSteps.map((step) => (
              <div className={`${aCard} gap-spaceMd bg-siteCard p-[32px]`} key={step.count}>
                <span className={`font-data text-[32px] leading-[40px] font-medium ${step.ink}`}>
                  {step.count}
                </span>
                <h3 className="text-[19px] leading-[26px] font-semibold">{step.title}</h3>
                <p className="text-[16px] leading-[24px] text-siteQuietText">{step.line}</p>
                {step.badge === 'built' ? (
                  <span className="self-start rounded-full bg-siteTintLine px-spaceMd py-spaceXs text-[12px] leading-[16px] font-semibold text-siteText">
                    {words.protectionBuilt}
                  </span>
                ) : null}
                {step.badge === 'designed' ? (
                  <span className="self-start rounded-full border-hairline border-siteControlLine px-spaceMd py-[3px] text-[12px] leading-[16px] font-semibold text-siteQuietText">
                    {words.protectionNotBuilt}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="keys-title" className="bg-siteNight py-[88px] text-siteTintDeep">
        <div className={`mx-auto box-border flex ${theWidestBand} flex-col gap-[40px] px-spaceXl`}>
          <h2 className={`text-center ${aBandHeading}`} id="keys-title">
            {words.protectionKeysHeadline}{' '}
            <span className="text-siteNightQuietText">{words.protectionKeysHeadlineQuiet}</span>
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[32px] text-center">
            {theKeys.map((holder) => (
              <div className="flex flex-col items-center gap-spaceMd" key={holder.title}>
                {holder.drawing}
                <h3 className="text-[19px] leading-[26px] font-semibold">{holder.title}</h3>
                <p className="text-[16px] leading-[24px] text-siteNightQuietText">{holder.line}</p>
                {holder.badge === 'designed' ? (
                  <span className="rounded-full border-hairline border-siteNightQuietText px-spaceMd py-[3px] text-[12px] leading-[16px] font-semibold text-siteTintDeep">
                    {words.protectionNotBuilt}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="limits-title" className="py-[88px]">
        <div className={`mx-auto box-border flex ${theWidestBand} flex-col gap-[32px] px-spaceXl`}>
          <div className="flex flex-col items-center gap-spaceMd text-center">
            <h2 className={aBandHeading} id="limits-title">
              {words.protectionLimitsHeadline}
            </h2>
            <p className="max-w-[600px] text-[19px] leading-[28px] text-siteQuietText">
              {words.protectionLimitsLine}
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-margin">
            {theLimits.map((limit) => (
              <div className={`${aCard} gap-spaceSm bg-siteTint p-marginMd`} key={limit.title}>
                <h3 className="text-[16px] leading-[24px] font-semibold">{limit.title}</h3>
                <p className="text-[16px] leading-[24px] text-siteQuietText">{limit.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
