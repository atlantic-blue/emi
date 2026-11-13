'use client';

import { useEffect, useState } from 'react';

import type { Language, SiteWords } from '@/app/words';
import { WHERE_SHE_TRIES_AGAIN } from '@/components/theReturnFromAProvider';
import { WHERE_A_SIGN_IN_LANDS } from '@/components/theSignInForm';
import { holdTheSession } from '@/lib/theSessionSheHolds';
import {
  forgetWhatSheStarted,
  theLanguageIn,
  theTokensSheCameBackWith,
} from '@/lib/theTelegramSignIn';
import { goTo } from '@/lib/whereSheGoesNext';

/**
 * The half of the relay page that runs in her browser, because every part of it is in the browser:
 * the code is in the address, the value the press kept is in `sessionStorage`, and the pool issues
 * the tokens to the browser and not to a server of this site.
 *
 * The language is not the language of this page. Telegram comes back to one registered address,
 * which is under `en`, so the language she pressed in travels in the state value and this half
 * reads it from there. The page she lands on is in that language, which is the one she was reading.
 *
 * The session is held the way a code sign in holds it, through `holdTheSession`, and she is left
 * on the same page a code sign in leaves her on. One sign in, one session, one place that writes
 * it.
 *
 * One sentence covers every way a return can fail: a state this browser did not write, a press
 * nobody made, a refusal from Telegram, a refusal from the sign in function, a refusal from the
 * pool and a connection that went. In each of them the next thing she does is the same, which is
 * to open the sign in page and press again, so one sentence and one press is the whole page.
 *
 * The cause is kept out of the page on purpose. A reader learns nothing from it, and a sentence
 * that named it would be a sentence about the service rather than about what she does next.
 */

export function TheReturnFromTelegram({
  language,
  words,
}: {
  /** The language of this page, which is the one Telegram registered and not the one she reads. */
  readonly language: Language;
  readonly words: SiteWords;
}) {
  const [didNotFinish, setDidNotFinish] = useState(false);

  useEffect(() => {
    async function finish(): Promise<void> {
      try {
        const came = await theTokensSheCameBackWith(window.location.search);

        forgetWhatSheStarted(came.language);
        holdTheSession(came.tokens);
        goTo(`/${came.language}/${WHERE_A_SIGN_IN_LANDS}`);
      } catch {
        // The kept value goes either way, and it goes under the language the state named rather
        // than under the language of this page. A value left behind would be offered to the next
        // return this tab reads, and a return is good for one sign in.
        forgetWhatSheStarted(
          theLanguageIn(new URLSearchParams(window.location.search).get('state')) ?? language,
        );
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
