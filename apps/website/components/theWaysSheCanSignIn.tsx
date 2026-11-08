'use client';

import { useState } from 'react';

import type { Language, SiteWordKey, SiteWords } from '@/app/words';
import { TheMarkOfApple, TheMarkOfGoogle } from '@/components/theMarksOfTheWaysIn';
import { type AWayIn, theOriginSheIsOn, whereAPressTakesHer } from '@/lib/theProviderSignIn';
import { goTo } from '@/lib/whereSheGoesNext';

/**
 * The ways in the board draws over the divider, from
 * `docs/design/website/sign-in/boards/SignIn.dc.html`: Apple first, then Google.
 *
 * A press leaves this site. Her browser goes to the pool with the provider named in the address,
 * so she lands on Apple or on Google and never reads a page of the pool asking her again which
 * one she meant.
 *
 * It runs in her browser, which is where it has to run: the press makes a value nobody can guess,
 * keeps it, and hands the pool a digest of a second one, and the pool issues the tokens to the
 * browser. Until it runs, the page draws both presses with nothing behind them, so a reader whose
 * browser runs nothing reads the page and the press does nothing rather than doing something
 * wrong.
 *
 * Telegram is the third way the board draws, and it waits for a function of its own, so the page
 * lists it and does not draw it.
 */

/** What each way in is called in the catalogue, and the mark it carries. */
const theMarkOf: Readonly<Partial<Record<SiteWordKey, () => React.ReactNode>>> = {
  signInApple: TheMarkOfApple,
  signInGoogle: TheMarkOfGoogle,
};

/** The name the service fixes for each way in, which the address she leaves on carries. */
const theNameOf: Readonly<Partial<Record<SiteWordKey, AWayIn>>> = {
  signInApple: 'SignInWithApple',
  signInGoogle: 'Google',
};

/** One way in, as the page hands it over: what it is called, and the ground the board draws it on. */
export interface AWayToPress {
  readonly word: SiteWordKey;
  readonly ground: string;
}

/** What the board draws every press with, which is everything but the ground under it. */
const everyPress =
  'flex min-h-[52px] items-center justify-center gap-spaceMd rounded-[12px] text-body-lg leading-[normal] font-semibold';

export function TheWaysSheCanSignIn({
  language,
  words,
  ways,
}: {
  readonly language: Language;
  readonly words: SiteWords;
  readonly ways: readonly AWayToPress[];
}) {
  const [said, setSaid] = useState<SiteWordKey | null>(null);

  async function leaveFor(way: SiteWordKey): Promise<void> {
    const named = theNameOf[way];

    if (named === undefined) {
      return;
    }

    try {
      goTo(await whereAPressTakesHer(named, language, theOriginSheIsOn()));
    } catch {
      // A browser that keeps nothing, or one that offers no digest, cannot start this sign in at
      // all. She is told so and the box for a code is under the press, which still works.
      setSaid('signInCouldNotStart');
    }
  }

  return (
    <>
      {ways.map((way) => {
        const Mark = theMarkOf[way.word];

        return (
          <button
            className={`${everyPress} ${way.ground}`}
            key={way.word}
            onClick={() => void leaveFor(way.word)}
            type="button"
          >
            {Mark === undefined ? null : <Mark />}
            {words[way.word]}
          </button>
        );
      })}
      {said === null ? null : (
        <span className="text-body-sm text-sitePeriodInk" role="alert">
          {words[said]}
        </span>
      )}
    </>
  );
}
