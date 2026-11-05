'use client';

import { type ReactNode, useState } from 'react';

import type { SiteWords } from '@/app/words';
import { THE_SUPPORT_INBOX } from '@/lib/addresses';

/**
 * The search box of the support page, and the questions it filters, from the approved board in
 * `docs/design/website/support/boards/Support.dc.html`.
 *
 * The two live in one component because they share one piece of state. The board draws the box at
 * the top of the page and the questions a band further down, and the line that says nothing
 * matched sits under the box, so a reader who types a word that matches no question reads the
 * answer beside the box she typed into rather than at the foot of the page.
 *
 * It runs in her browser, which is the only place it can run: there is no server to ask, and
 * asking one would send what she typed to Emi. Until it runs, every question is drawn. So a
 * reader whose browser runs nothing at all reads the whole page and loses only the filtering,
 * and the band of cards the server drew arrives as children rather than being drawn here.
 */

/** One question of the page: what she asks, and the answer under it. */
export interface AQuestion {
  readonly question: string;
  readonly answer: string;
}

/** What she typed, read the way the questions are read, so neither case nor an edge space counts. */
function asSearched(text: string): string {
  return text.trim().toLocaleLowerCase();
}

export function TheSupportSearch({
  words,
  questions,
  children,
}: {
  readonly words: SiteWords;
  readonly questions: readonly AQuestion[];
  /** The band of cards, drawn by the page, which sits between the box and the questions. */
  readonly children: ReactNode;
}) {
  const [typed, setTyped] = useState('');
  /** The one box on the page, named so her software reads the label with it. */
  const field = 'support-search';
  const asked = asSearched(typed);
  // A question matches on its answer as well as on its own words, because a woman searching for
  // "keychain" is looking for the answer that names one and not for a question that does.
  const found =
    asked === ''
      ? questions
      : questions.filter((each) => asSearched(`${each.question} ${each.answer}`).includes(asked));

  return (
    <>
      <section className="mx-auto box-border flex max-w-[760px] flex-col items-center gap-spaceXl px-spaceXl pt-[88px] pb-marginLg text-center">
        <h1 className="font-serif text-[64px] leading-[68px] font-medium tracking-[-0.02em] phone:text-[48px] phone:leading-[52px]">
          {words.supportTitle}
        </h1>

        <form className="w-full max-w-[560px]" role="search">
          <label className="sr-only" htmlFor={field}>
            {words.supportSearch}
          </label>
          <div className="flex min-h-[52px] items-center gap-spaceMd rounded-[12px] border-hairline border-siteControlLine bg-siteCard px-margin">
            <svg
              aria-hidden="true"
              className="stroke-siteQuietText"
              fill="none"
              height="18"
              strokeLinecap="round"
              strokeWidth="1.75"
              viewBox="0 0 24 24"
              width="18"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-siteText outline-offset-[4px]"
              id={field}
              onChange={(typing) => setTyped(typing.target.value)}
              placeholder={words.supportSearch}
              type="search"
              value={typed}
            />
          </div>
        </form>

        {found.length === 0 ? (
          <p
            className="m-0 box-border w-full max-w-[560px] rounded-[12px] bg-siteTint px-margin py-spaceLg text-left text-[16px] leading-[24px] text-siteText"
            role="status"
          >
            {`${words.supportNothingFound} `}
            <a className="text-siteAccent underline" href={THE_SUPPORT_INBOX}>
              {words.supportEmailUs}
            </a>
            {` ${words.supportNothingFoundAfter}`}
          </p>
        ) : null}

        <p className="m-0 max-w-[520px] text-[16px] leading-[24px] text-siteQuietText">
          {words.supportCannotLookUp}
        </p>
      </section>

      {children}

      <section className="mx-auto box-border max-w-[760px] px-spaceXl pb-[96px]">
        <h2 className="m-0 mb-spaceLg text-center font-serif text-[32px] leading-[40px] font-medium tracking-[-0.01em] phone:text-[24px] phone:leading-[30px]">
          {words.supportQuestionsHeadline}
        </h2>

        {found.map((each, at) => (
          <details
            className="border-b-hairline border-b-siteLine py-margin"
            key={each.question}
            open={at === 0}
          >
            <summary className="cursor-pointer text-[16px] leading-[24px] font-semibold">
              {each.question}
            </summary>
            <p className="mb-0 mt-spaceSm text-[16px] leading-[24px] text-siteQuietText">
              {each.answer}
            </p>
          </details>
        ))}
      </section>
    </>
  );
}
