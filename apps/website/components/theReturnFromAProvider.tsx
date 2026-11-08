'use client';

import { useEffect, useState } from 'react';

import type { Language, SiteWords } from '@/app/words';
import { WHERE_A_SIGN_IN_LANDS } from '@/components/theSignInForm';
import { forgetWhatSheStarted, theTokensSheCameBackWith } from '@/lib/theProviderSignIn';
import { holdTheSession } from '@/lib/theSessionSheHolds';
import { goTo } from '@/lib/whereSheGoesNext';

/**
 * The half of the return page that runs in her browser, because every part of it is in the
 * browser: the code is in the address, the value the press kept is in `sessionStorage`, and the
 * pool issues the tokens to the browser and not to a server of this site.
 *
 * The session is held the way a code sign in holds it, through `holdTheSession`, and she is left
 * on the same page a code sign in leaves her on. One sign in, one session, one place that writes
 * it.
 *
 * One sentence covers every way a return can fail: a state this browser did not write, a press
 * nobody made, a refusal from the company, a refusal from the pool and a connection that went. In
 * each of them the next thing she does is the same, which is to open the sign in page and press
 * again, so one sentence and one press is the whole page.
 *
 * The cause is kept out of the page on purpose. A reader learns nothing from it, and a sentence
 * that named it would be a sentence about the service rather than about what she does next.
 */

/** Where she is sent back to when the return did not finish, in the language she was reading. */
export const WHERE_SHE_TRIES_AGAIN = 'sign-in/';

export function TheReturnFromAProvider({
  language,
  words,
}: {
  readonly language: Language;
  readonly words: SiteWords;
}) {
  const [didNotFinish, setDidNotFinish] = useState(false);

  useEffect(() => {
    async function finish(): Promise<void> {
      try {
        const tokens = await theTokensSheCameBackWith(window.location.search);

        forgetWhatSheStarted();
        holdTheSession(tokens);
        goTo(`/${language}/${WHERE_A_SIGN_IN_LANDS}`);
      } catch {
        // The kept value goes either way. A value left behind would be offered to the next return
        // this tab reads, and a return is good for one sign in.
        forgetWhatSheStarted();
        setDidNotFinish(true);
      }
    }

    void finish();
  }, [language]);

  if (!didNotFinish) {
    return <span className="text-body-lg text-siteQuietText">{words.returningWait}</span>;
  }

  return (
    <>
      <span className="text-body-lg text-siteQuietText" role="alert">
        {words.returningDidNotFinish}
      </span>
      <a
        className="text-body-lg text-siteAccent underline"
        href={`/${language}/${WHERE_SHE_TRIES_AGAIN}`}
      >
        {words.returningTryAgain}
      </a>
    </>
  );
}
