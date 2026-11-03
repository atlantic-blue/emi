import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { THE_PRIVACY_INBOX, thePrivacyAddress } from '@/lib/addresses';
import { theLinksOf } from '@/lib/theAddressesOfAPage';

/**
 * The privacy policy, in the language her address names. It is the board the operator approved,
 * `docs/design/website/privacy-policy/boards/Privacy.dc.html`, part for part and value for value,
 * with its plain render beside it. A browser holds this page against that render at three widths
 * and refuses a difference of more than one pixel in a thousand, so a measure written here that
 * the board does not draw fails that comparison.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6 names
 * a secret for a style and a style written on an element cannot carry one, so a browser would
 * refuse it and the page would quietly draw wrong.
 *
 * The date at the top is the five characters the board draws rather than a date. Nobody set one, and
 * a policy showing a date it was never given would be the first sentence on the page that is not
 * true.
 */

/** The path this page sits at under a language, which its own head and the sitemap both name. */
const THE_POLICY_PAGE = 'privacy-policy/';

/** The band the three cards sit in, which is wider than the column of sections under it. */
const theWidestBand = 'max-w-[1024px]';

/** The column a reader reads down, at the width the board sets for the words. */
const theReadingColumn = 'max-w-[720px]';

/** A heading of one section, at the one size the board draws it at. */
const aSectionHeading = 'font-serif text-[24px] leading-[30px] font-medium';

/** What one of the three cards is: a drawing of the thing Emi does not do, and its title. */
interface ACard {
  readonly drawing: React.ReactNode;
  readonly title: string;
}

/** What one of the eight sections is: a heading, and what it answers. */
interface ASection {
  readonly title: string;
  readonly answer: React.ReactNode;
}

/**
 * The three drawings of the cards, at the stroke and the size the board draws them. Each one is
 * hidden from a reader whose software reads the page aloud, because the title beside it says the
 * same thing in words and a drawing read twice is a drawing read wrong.
 */
function ACardDrawing({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="stroke-siteAccent"
      fill="none"
      height="32"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width="32"
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
    title: words.policyTitle,
    description: words.policyLine,
    alternates: theLinksOf(language, THE_POLICY_PAGE),
  };
}

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words: SiteWords = wordsIn(lang);

  const theCards: ACard[] = [
    {
      drawing: (
        <ACardDrawing>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          <path d="M3 3l18 18" />
        </ACardDrawing>
      ),
      title: words.policyNoAccount,
    },
    {
      drawing: (
        <ACardDrawing>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
          <path d="M3 3l18 18" />
        </ACardDrawing>
      ),
      title: words.policyNoTracking,
    },
    {
      drawing: (
        <ACardDrawing>
          <rect height="10" rx="2" width="14" x="5" y="11" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </ACardDrawing>
      ),
      title: words.policyEncrypted,
    },
  ];

  const theSections: ASection[] = [
    { title: words.policyWhoTitle, answer: words.policyWhoLine },
    {
      title: words.policyStoresTitle,
      answer: (
        <>
          {`${words.policyStoresLine} `}
          <a className="text-siteAccent no-underline" href={`/${lang}/privacy/`}>
            {words.policyHowTheEncryptionWorks}
          </a>
        </>
      ),
    },
    { title: words.policyCollectTitle, answer: words.policyCollectLine },
    { title: words.policySharingTitle, answer: words.policySharingLine },
    { title: words.policyRemindersTitle, answer: words.policyRemindersLine },
    { title: words.policyDeletingTitle, answer: words.policyDeletingLine },
    { title: words.policyChildrenTitle, answer: words.policyChildrenLine },
    {
      title: words.policyContactTitle,
      answer: (
        <>
          {`${words.policyContactBefore} `}
          <a className="text-siteAccent underline" href={THE_PRIVACY_INBOX}>
            {thePrivacyAddress()}
          </a>
          {words.policyContactAfter}
        </>
      ),
    },
  ];

  return (
    <main>
      <header
        className={`mx-auto box-border flex ${theReadingColumn} flex-col items-center gap-spaceLg px-spaceXl pt-[80px] pb-[48px] text-center`}
      >
        <span className="font-data text-[12px] leading-[16px] font-medium tracking-[0.02em] text-siteQuietText">
          {words.policyUpdated}
        </span>
        <h1 className="font-serif text-[64px] leading-[68px] font-medium tracking-[-0.02em] phone:text-[48px] phone:leading-[52px]">
          {words.policyTitle}
        </h1>
        <p className="font-serif text-[24px] leading-[32px] text-siteQuietText">
          {words.policyLine}
        </p>
      </header>

      <div
        className={`mx-auto box-border grid ${theWidestBand} grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-margin px-spaceXl pb-marginLg`}
      >
        {theCards.map((card) => (
          <div
            className="flex flex-col items-center gap-spaceSm rounded-[24px] bg-siteTint p-marginMd text-center"
            key={card.title}
          >
            {card.drawing}
            <span className="text-[16px] leading-[24px] font-semibold">{card.title}</span>
          </div>
        ))}
      </div>

      <article
        className={`mx-auto box-border flex ${theReadingColumn} flex-col gap-[40px] px-spaceXl pb-[96px] text-[16px] leading-[24px]`}
      >
        {theSections.map((section) => (
          <section className="flex flex-col gap-spaceSm" key={section.title}>
            <h2 className={aSectionHeading}>{section.title}</h2>
            <p>{section.answer}</p>
          </section>
        ))}
      </article>
    </main>
  );
}
