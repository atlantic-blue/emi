import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { THE_PRIVACY_INBOX, thePrivacyAddress } from '@/lib/addresses';
import {
  A_CARD_PROCESSOR_NOBODY_HAS_CHOSEN,
  A_LEGAL_BASIS_NOBODY_HAS_WRITTEN,
  A_RETENTION_NOBODY_HAS_SET,
} from '@/lib/thePlaceholders';
import { theLinksOf } from '@/lib/theAddressesOfAPage';

/**
 * The privacy policy, in the language her address names. It is laid out as the board the operator
 * approved lays it out, `docs/design/website/privacy-policy/boards/Privacy.dc.html`: the band at
 * the top, the title and the line under it, three cards, then one column of sections at one size.
 *
 * The words are version 1 and the board is not. The board was drawn when Emi had no account, took
 * no payment and sent nothing anywhere, so it says "No account needed" and "No tracking" and
 * answers "What we collect" with "Nothing". Version 1 adds an optional account, the payments that
 * need it, and anonymous usage she can switch on, so each of those three became false. A browser
 * still holds the bands and the title of this page against the board; it no longer holds the words,
 * because the board draws the policy of a product that no longer exists.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6 names
 * a secret for a style and a style written on an element cannot carry one, so a browser would
 * refuse it and the page would quietly draw wrong.
 *
 * Three answers are holes rather than sentences: who takes a payment on the web, how long an
 * account is kept, and the ground in law for keeping it. Nobody has chosen, set or written any of
 * them, and a policy that answered anyway would be the first sentence on the page that is not true.
 */

/** The path this page sits at under a language, which its own head and the sitemap both name. */
const THE_POLICY_PAGE = 'privacy-policy/';

/** The band the three cards sit in, which is wider than the column of sections under it. */
const theWidestBand = 'max-w-[1024px]';

/** The column a reader reads down, at the width the board sets for the words. */
const theReadingColumn = 'max-w-[720px]';

/** A heading of one section, at the one size the board draws it at. */
const aSectionHeading = 'font-serif text-[24px] leading-[30px] font-medium';

/** What one of the three cards is: a drawing of what Emi does, and its title. */
interface ACard {
  readonly drawing: React.ReactNode;
  readonly title: string;
}

/** What one of the fifteen sections is: a heading, and the blocks that answer it. */
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

  /** Where she writes about her own data, drawn the way the last section draws it. */
  const theInbox = (
    <a className="text-siteAccent underline" href={THE_PRIVACY_INBOX}>
      {thePrivacyAddress()}
    </a>
  );

  /**
   * The six companies that handle something for Emi, each with the one thing it handles. A name is
   * written here rather than in a catalogue, because a company is called the same thing in all
   * three languages and a name in a catalogue is a name somebody can translate by mistake. The
   * fourth is a hole, because nobody has chosen who takes a payment on the web.
   */
  const theProcessors: readonly string[] = [
    `Apple ${words.policyProcessorsApple}`,
    `Amazon Web Services ${words.policyProcessorsAmazon}`,
    `Telegram ${words.policyProcessorsTelegram}`,
    `${A_CARD_PROCESSOR_NOBODY_HAS_CHOSEN} ${words.policyProcessorsCard}`,
    `Sentry ${words.policyProcessorsSentry}`,
    `TelemetryDeck ${words.policyProcessorsTelemetry}`,
  ];

  const theCards: ACard[] = [
    {
      drawing: (
        <ACardDrawing>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </ACardDrawing>
      ),
      title: words.policyAccountOptional,
    },
    {
      drawing: (
        <ACardDrawing>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
        </ACardDrawing>
      ),
      title: words.policyUsageOptional,
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
    { title: words.policyWhoTitle, answer: <p>{words.policyWhoLine}</p> },
    {
      title: words.policyStoresTitle,
      answer: (
        <p>
          {`${words.policyStoresLine} `}
          <a className="text-siteAccent no-underline" href={`/${lang}/privacy/`}>
            {words.policyHowTheEncryptionWorks}
          </a>
        </p>
      ),
    },
    { title: words.policyCollectTitle, answer: <p>{words.policyCollectLine}</p> },
    { title: words.policyAccountTitle, answer: <p>{words.policyAccountLine}</p> },
    {
      title: words.policyPaymentsTitle,
      answer: (
        <p>
          {`${words.policyPaymentsAppleLine} ${words.policyPaymentsTelegramLine} `}
          {`${words.policyPaymentsWebBefore} ${A_CARD_PROCESSOR_NOBODY_HAS_CHOSEN} `}
          {words.policyPaymentsWebAfter}
        </p>
      ),
    },
    { title: words.policyUsageTitle, answer: <p>{words.policyUsageLine}</p> },
    {
      title: words.policyProcessorsTitle,
      answer: (
        <ul className="m-0 p-0 flex list-none flex-col gap-spaceXs">
          {theProcessors.map((processor) => (
            <li key={processor}>{processor}</li>
          ))}
        </ul>
      ),
    },
    { title: words.policyRetentionTitle, answer: <p>{A_RETENTION_NOBODY_HAS_SET}</p> },
    {
      title: words.policyRightsTitle,
      answer: (
        <p>
          {`${words.policyRightsBefore} `}
          {theInbox}.
        </p>
      ),
    },
    { title: words.policyLegalBasisTitle, answer: <p>{A_LEGAL_BASIS_NOBODY_HAS_WRITTEN}</p> },
    { title: words.policySharingTitle, answer: <p>{words.policySharingLine}</p> },
    { title: words.policyRemindersTitle, answer: <p>{words.policyRemindersLine}</p> },
    {
      title: words.policyDeletingTitle,
      answer: (
        <p>
          {`${words.policyDeletingLine} ${words.policyDeletingAccountBefore} `}
          {theInbox}.
        </p>
      ),
    },
    { title: words.policyChildrenTitle, answer: <p>{words.policyChildrenLine}</p> },
    {
      title: words.policyContactTitle,
      answer: (
        <p>
          {`${words.policyContactBefore} `}
          {theInbox}
          {words.policyContactAfter}
        </p>
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
            {section.answer}
          </section>
        ))}
      </article>
    </main>
  );
}
