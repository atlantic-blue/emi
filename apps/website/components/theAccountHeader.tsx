'use client';

import { useEffect, useSyncExternalStore } from 'react';

import type { Language, SiteWords } from '@/app/words';
import { letTheSessionGo, theSessionHeld, whenTheSessionChanges } from '@/lib/theSessionSheHolds';
import { signOut } from '@/lib/theSignIn';
import { goInsteadTo, goTo } from '@/lib/whereSheGoesNext';

/**
 * The head of her account, from `docs/design/website/sign-in/boards/Profile.dc.html`: the title,
 * the sentence that says her records are not here, and the press that signs her out.
 *
 * The sections under it on the board are the subscription, the ways she signs in, the preferences
 * and the data. Each one is its own step and none of them is drawn here.
 *
 * It runs in her browser because the session runs there. The tokens live in `localStorage` and a
 * server of this site never reads them, so a server cannot tell a signed in reader from anybody
 * else and the page has to ask once it is drawn. A reader with no session is moved to the page she
 * signs in on rather than shown an account that is not hers.
 *
 * The store is read as what it is, which is a value outside React, rather than copied into state
 * when the page loads. A copy would mean setting state while the page is drawing itself, and that
 * draws the page twice for every reader.
 */

/** Where a reader with no session is sent, which is the page she signs in on. */
export const WHERE_A_READER_WITH_NO_SESSION_GOES = 'sign-in/';

/** Where a sign out leaves her, which is the home page in the language she was reading. */
export const WHERE_A_SIGN_OUT_LANDS = '';

/**
 * What is known about her session, in three states rather than two.
 *
 * "nobody has looked" is the state a server is in and the state the first drawing in her browser
 * is in, because that drawing has to match what the server sent or the page cannot take it over.
 * Two states would make that first drawing say she is signed out, and the move to the sign in
 * page would then happen to a woman who is signed in.
 */
type WhatIsKnownOfHerSession = 'nobody has looked' | 'she is signed in' | 'she is signed out';

const whatHerBrowserHolds = (): WhatIsKnownOfHerSession =>
  theSessionHeld() === null ? 'she is signed out' : 'she is signed in';

/** What a server knows about her session, which is nothing: the entry is in her browser alone. */
const whatAServerKnows = (): WhatIsKnownOfHerSession => 'nobody has looked';

export function TheAccountHeader({
  language,
  words,
}: {
  readonly language: Language;
  readonly words: SiteWords;
}) {
  const known = useSyncExternalStore(whenTheSessionChanges, whatHerBrowserHolds, whatAServerKnows);

  useEffect(() => {
    if (known === 'she is signed out') {
      goInsteadTo(`/${language}/${WHERE_A_READER_WITH_NO_SESSION_GOES}`);
    }
  }, [known, language]);

  async function signHerOut(): Promise<void> {
    const held = theSessionHeld();

    // The tokens go first. A service that cannot be reached must not leave her signed in on this
    // machine, and the refresh token is revoked on a service that can be.
    letTheSessionGo();

    if (held !== null) {
      await signOut(held.refreshToken).catch(() => undefined);
    }

    goTo(`/${language}/${WHERE_A_SIGN_OUT_LANDS}`);
  }

  // Until the browser has read the session, the page draws the head and no press. A press to sign
  // out drawn for a reader who is on her way to the sign in page is a press that does nothing.
  return (
    <header className="flex flex-wrap items-end justify-between gap-spaceMd">
      <div className="flex flex-col gap-spaceXs">
        <h1 className="font-serif text-[48px] leading-[56px] font-medium tracking-[-0.02em]">
          {words.accountTitle}
        </h1>
        <span className="text-body-lg text-siteQuietText">
          {words.accountRecordsStayOnYourPhone}
        </span>
      </div>
      {known === 'she is signed in' ? (
        <button
          // The board gives the press one line of 24 px, which is smaller than a thumb. The box
          // is grown to 44 px and the growth is paid for by an equal negative margin, so the words
          // stay where the board drew them and the box she presses is the size a thumb needs.
          className="-my-[10px] text-body-lg leading-[44px] text-siteAccent"
          onClick={() => void signHerOut()}
          type="button"
        >
          {words.accountSignOut}
        </button>
      ) : null}
    </header>
  );
}
