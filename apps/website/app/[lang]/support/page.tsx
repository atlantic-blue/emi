import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type SiteWordKey, type SiteWords, isLanguage, wordsIn } from '@/app/words';
import { type AQuestion, TheSupportSearch } from '@/components/supportSearch';
import { THE_EMI_BETA, THE_EMI_COMMUNITY, THE_SUPPORT_INBOX } from '@/lib/addresses';
import { theLinksOf } from '@/lib/theAddressesOfAPage';

/**
 * The support page, in the language her address names. It is laid out as the board the operator
 * approved lays it out, `docs/design/website/support/boards/Support.dc.html`: the band at the top,
 * the title with the box she searches in, a row of cards, then the common questions.
 *
 * Four parts of that board describe a product that does not exist yet, and
 * `docs/design/website/README.md` names all four. So the page differs from the board in four
 * places and nowhere else. The first question is answered with what a lost phone costs today,
 * because sync and restore are designed and are not built. The card about a subscription is not
 * drawn, and the answer about cancelling keeps only the sentence about Apple, because the account
 * page is not served. The two cards the board points at nothing now carry the community invite
 * and the beta. The address a reader writes to is the board's own.
 *
 * Every value is a class and none is a style attribute, because the content policy of SITE-6
 * names a secret for a style and a style written on an element cannot carry one, so a browser
 * would refuse it and the page would quietly draw wrong.
 */

/** The path this page sits at under a language, which its own head and the sitemap both name. */
const THE_SUPPORT_PAGE = 'support/';

/** The band the cards sit in, which is wider than the column the reading happens in. */
const theWidestBand = 'max-w-[1024px]';

/** One card: a drawing, a title, the line under it, and where it takes her. */
interface ACard {
  readonly drawing: React.ReactNode;
  readonly title: string;
  readonly line: string;
  readonly address: string;
  /**
   * Whether the page behind it is still to be built. A card marked this way is not drawn, and it
   * comes back by taking this one line off it on the day its page ships.
   */
  readonly waitsForItsPage?: boolean;
}

/**
 * The drawing on one card, at the stroke and the size the board draws it. Each one is hidden from
 * a reader whose software reads the page aloud, because the title beside it says the same thing in
 * words and a drawing read twice is a drawing read wrong.
 */
function ACardDrawing({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="stroke-siteAccent"
      fill="none"
      height="36"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="36"
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
    title: words.supportTitle,
    description: words.supportCannotLookUp,
    alternates: theLinksOf(language, THE_SUPPORT_PAGE),
  };
}

/** The questions she can search, in the order the board asks them. */
export function theQuestionsOf(words: SiteWords): AQuestion[] {
  const asked: readonly [SiteWordKey, SiteWordKey][] = [
    ['supportLostPhoneQuestion', 'supportLostPhoneAnswer'],
    ['supportLearningQuestion', 'supportLearningAnswer'],
    ['supportDeleteQuestion', 'supportDeleteAnswer'],
    ['supportCancelQuestion', 'supportCancelAnswer'],
  ];

  return asked.map(([question, answer]) => ({
    question: words[question],
    answer: words[answer],
  }));
}

export default async function SupportPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLanguage(lang)) {
    notFound();
  }

  const words: SiteWords = wordsIn(lang);

  const theCards: ACard[] = [
    {
      drawing: (
        <ACardDrawing>
          <rect height="14" rx="2" width="18" x="3" y="5" />
          <path d="M3 7l9 6 9-6" />
        </ACardDrawing>
      ),
      title: words.supportEmailUs,
      line: words.supportEmailUsLine,
      address: THE_SUPPORT_INBOX,
    },
    {
      drawing: (
        <ACardDrawing>
          <path d="M21 4L3 11l6 2 2 6 3-4 5 4 2-15z" />
        </ACardDrawing>
      ),
      title: words.supportCommunity,
      line: words.supportCommunityLine,
      address: THE_EMI_COMMUNITY,
    },
    {
      drawing: (
        <ACardDrawing>
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
        </ACardDrawing>
      ),
      title: words.supportBeta,
      line: words.supportBetaLine,
      address: THE_EMI_BETA,
    },
    {
      drawing: (
        <ACardDrawing>
          <rect height="13" rx="2" width="18" x="3" y="6" />
          <path d="M3 10h18M7 15h3" />
        </ACardDrawing>
      ),
      title: words.supportSubscription,
      line: words.supportSubscriptionLine,
      address: `/${lang}/account/`,
      waitsForItsPage: true,
    },
  ];

  return (
    <main>
      <TheSupportSearch questions={theQuestionsOf(words)} words={words}>
        <div
          className={`mx-auto box-border grid ${theWidestBand} grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-margin px-spaceXl pb-[64px]`}
        >
          {theCards
            .filter((card) => card.waitsForItsPage !== true)
            .map((card) => (
              <a
                className="flex flex-col items-center gap-spaceMd rounded-[24px] bg-siteTint px-spaceXl py-[32px] text-center text-siteText no-underline"
                href={card.address}
                key={card.title}
              >
                {card.drawing}
                <span className="text-[16px] leading-[24px] font-semibold">{card.title}</span>
                <span className="text-[14px] leading-[20px] text-siteQuietText">{card.line}</span>
              </a>
            ))}
        </div>
      </TheSupportSearch>
    </main>
  );
}
