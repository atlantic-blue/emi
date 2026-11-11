'use client';

import { type ReactNode, useState } from 'react';

import type { Language, SiteWords } from '@/app/words';
import { holdTheSession } from '@/lib/theSessionSheHolds';
import { goTo } from '@/lib/whereSheGoesNext';
import {
  ASignInProblem,
  type HowLongTheCodeIs,
  type TheCodeSheWaitsFor,
  type WhatWentWrong,
  askForACode,
  sendHerAnotherCode,
  signInWithTheCode,
} from '@/lib/theSignIn';

/**
 * The two states of the sign in page, from `docs/design/website/sign-in/boards/SignIn.dc.html` and
 * `boards/SignInCode.dc.html`.
 *
 * They are one component because they are one piece of state. She types an address, presses "Send
 * code", and the same column of the page becomes the box for the code. The board draws them as two
 * screens because a canvas has no state; a reader meets one page that changes.
 *
 * The box is as wide as the code the service sent her, which is six digits for a sign up and eight
 * for a sign in, so the width arrives with the code rather than sitting here as a number. The
 * words beside it name no number, because one number would be wrong half the time.
 *
 * It runs in her browser, which is where it has to run: the service issues the tokens to the
 * browser and a server of this site never sees them. Until it runs, the page draws the address box
 * with no script behind it, so a reader whose browser runs nothing reads the page and the press
 * does nothing rather than doing something wrong.
 *
 * Nothing on this page says whether the address she typed has an account. The first call is the
 * same call for both, and the words are the same words for both. Where the service refuses the
 * code because the address already has an account, she is sent a sign in code and left on this
 * box, and that refusal reaches nobody who did not type the code out of her own email.
 */

/** What the field for the code accepts: digits, and nothing else she could paste into it. */
const ONLY_DIGITS = /\D/g;

/**
 * What the field holds after she types or pastes something into it.
 *
 * The length is the length of the code the service sent her, which is not the same number for the
 * two codes it sends, so it arrives here rather than sitting in the field as a constant.
 */
export function theDigitsSheTyped(typed: string, digits: HowLongTheCodeIs): string {
  return typed.replace(ONLY_DIGITS, '').slice(0, digits);
}

/** The address to come back to after a sign in, which is the only page a sign in leads to. */
export const WHERE_A_SIGN_IN_LANDS = 'account/';

/** Which sentence of the catalogue each cause is told in. */
const theSentenceFor: Readonly<Record<WhatWentWrong, keyof SiteWords>> = {
  theCodeIsWrong: 'signInCodeIsWrong',
  theCodeHasExpired: 'signInCodeHasExpired',
  tooManyTries: 'signInTooManyTries',
  nothingReachedTheService: 'signInNothingReached',
};

/** The press the board draws as a capsule on the accent, which both states carry. */
/**
 * The grey the browser itself draws a placeholder in, which is what the board draws.
 *
 * Tailwind writes a placeholder as half of the colour of the words around it, and that is a
 * different grey from the one the board shows. The two are close enough that one machine reads
 * them as the same pixel and another does not, so the page passed here and failed on the runner.
 * `revert` hands the colour back to the browser, which is where the board got it.
 */
const theBrowsersOwnPlaceholder = 'placeholder:[color:revert]';

/** The press the board draws as a capsule on the accent, which both states carry. */
const theAccentPress =
  'flex min-h-[44px] items-center justify-center rounded-full bg-siteSlider px-spaceLg text-body-sm font-semibold whitespace-nowrap text-siteCard';

/** The line that tells her what went wrong, and the quiet line under a field. */
const theQuietLine = 'text-body-sm text-siteQuietText';

export function TheSignInForm({
  language,
  words,
  children,
}: {
  readonly language: Language;
  readonly words: SiteWords;
  /** The ways in the server drew, which stand between the line and the form. */
  readonly children: ReactNode;
}) {
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [waiting, setWaiting] = useState<TheCodeSheWaitsFor | null>(null);
  const [said, setSaid] = useState<keyof SiteWords | null>(null);
  const [whatToDoNext, setWhatToDoNext] = useState<keyof SiteWords | null>(null);
  const [busy, setBusy] = useState(false);

  function waitFor(next: TheCodeSheWaitsFor, toldToDo: keyof SiteWords | null): void {
    setWaiting(next);
    setCode('');
    setWhatToDoNext(toldToDo);
  }

  async function sendACode(): Promise<void> {
    const typed = address.trim();

    if (typed === '') {
      setSaid('signInNeedsAnAddress');

      return;
    }

    setBusy(true);
    setSaid(null);

    try {
      // Which call sends it follows the code she is already holding, so one press is one email
      // whichever of the two she is waiting for.
      waitFor(
        waiting === null ? await askForACode(typed) : await sendHerAnotherCode(waiting),
        null,
      );
    } catch (problem) {
      setSaid(theSentenceFor[causeOf(problem)]);
    } finally {
      setBusy(false);
    }
  }

  async function answerTheCode(): Promise<void> {
    if (waiting === null) {
      return;
    }

    if (code.length !== waiting.digits) {
      setSaid('signInNeedsTheCode');

      return;
    }

    setBusy(true);
    setSaid(null);
    setWhatToDoNext(null);

    try {
      const answer = await signInWithTheCode(waiting, code);

      if (answer.kind === 'anotherCodeIsOnItsWay') {
        waitFor(answer.waitsFor, 'signInAnotherCodeIsOnItsWay');
        setBusy(false);

        return;
      }

      holdTheSession(answer.held);
      goTo(`/${language}/${WHERE_A_SIGN_IN_LANDS}`);
    } catch (problem) {
      setSaid(theSentenceFor[causeOf(problem)]);
      // The service hands back a fresh session with a refusal she may answer again. Keeping the
      // old one would answer with a session the service has closed, and the next code she typed
      // would be read as wrong whatever she typed.
      const again = problem instanceof ASignInProblem ? problem.tryAgainWith : undefined;

      if (again !== undefined) {
        setWaiting({ ...waiting, session: again });
      }

      setBusy(false);
    }
  }

  function useAnotherAddress(): void {
    setWaiting(null);
    setCode('');
    setSaid(null);
    setWhatToDoNext(null);
  }

  const trouble =
    said === null ? null : (
      <span className="text-body-sm text-sitePeriodInk" role="alert">
        {words[said]}
      </span>
    );

  // What she does next is not a refusal, so it is drawn in the quiet line of the board rather
  // than in the colour the page keeps for something going wrong.
  const nextStep =
    whatToDoNext === null ? null : (
      <span className={`${theQuietLine} text-center`}>{words[whatToDoNext]}</span>
    );

  if (waiting === null) {
    return (
      <>
        <p className="mb-spaceLg text-body-lg text-siteQuietText">{words.signInLine}</p>
        {children}
        <form
          className="flex flex-col gap-spaceMd text-left"
          onSubmit={(sent) => {
            sent.preventDefault();
            void sendACode();
          }}
        >
          <label className="sr-only" htmlFor="sign-in-address">
            {words.signInAddressLabel}
          </label>
          {/* The board draws the rule outside the box it bounds, which is the browser own model
            rather than the one the theme sets on every element, so the row stands 54 px tall. */}
          <div className="box-content flex min-h-[52px] items-center gap-spaceSm rounded-[12px] border-hairline border-siteControlLine pr-spaceXs pl-spaceLg">
            <input
              autoComplete="email"
              // A field carries a width of about twenty characters of its own, and a flex row as
              // wide as that field plus the press is wider than a phone. The width is taken off it
              // here and the row gives it whatever is left.
              className={`w-0 min-w-0 flex-1 border-0 bg-transparent px-[2px] text-body-lg leading-[normal] text-siteText outline-offset-[4px] ${theBrowsersOwnPlaceholder}`}
              id="sign-in-address"
              onChange={(typing) => setAddress(typing.target.value)}
              placeholder={words.signInAddressLabel}
              type="email"
              value={address}
            />
            <button className={theAccentPress} disabled={busy} type="submit">
              {busy ? words.signInSending : words.signInSendCode}
            </button>
          </div>
          <span className={theQuietLine}>{words.signInWeSendACode}</span>
          {trouble}
        </form>
      </>
    );
  }

  return (
    <>
      <p className="mb-spaceLg text-body-lg text-siteQuietText">
        {theLineAbout(words.signInCodeSentTo, waiting.address)}
      </p>
      <form
        className="flex flex-col gap-spaceMd text-left"
        onSubmit={(sent) => {
          sent.preventDefault();
          void answerTheCode();
        }}
      >
        <label className="text-body-sm font-semibold text-siteText" htmlFor="sign-in-code">
          {words.signInCodeLabel}
        </label>
        <input
          autoComplete="one-time-code"
          className={`box-border min-h-[52px] rounded-[12px] border-hairline border-siteControlLine bg-transparent px-spaceLg text-center font-data text-data-lg leading-[normal] tracking-[0.4em] text-siteText ${theBrowsersOwnPlaceholder}`}
          id="sign-in-code"
          inputMode="numeric"
          maxLength={waiting.digits}
          onChange={(typing) => setCode(theDigitsSheTyped(typing.target.value, waiting.digits))}
          placeholder={'0'.repeat(waiting.digits)}
          type="text"
          value={code}
        />
        <button
          className="flex min-h-[52px] items-center justify-center rounded-[12px] bg-siteSlider text-body-lg leading-[normal] font-semibold text-siteCard"
          disabled={busy}
          type="submit"
        >
          {busy ? words.signInChecking : words.signInCodeSubmit}
        </button>
        <span className={`${theQuietLine} text-center`}>{words.signInCodeLasts}</span>
        {nextStep}
        {trouble}
        <div className="flex justify-center gap-spaceXl text-body-sm">
          <button
            className="text-siteAccent underline"
            disabled={busy}
            onClick={() => void sendACode()}
            type="button"
          >
            {words.signInSendANewCode}
          </button>
          <button className="text-siteAccent underline" onClick={useAnotherAddress} type="button">
            {words.signInUseAnotherAddress}
          </button>
        </div>
      </form>
    </>
  );
}

/**
 * The line that says where the code went, with the address set apart from the sentence around it.
 * The board writes the address in the weight of the words a reader is meant to read first, so she
 * can check at a glance that she typed it right.
 */
function theLineAbout(sentence: string, address: string): ReactNode {
  const [before, after] = sentence.split('{address}');

  return (
    <>
      {before}
      <strong className="font-semibold text-siteText">{address}</strong>
      {after}
    </>
  );
}

/** The cause behind a refusal. Anything that is not one of ours is read as a lost connection. */
function causeOf(problem: unknown): WhatWentWrong {
  return problem instanceof ASignInProblem ? problem.because : 'nothingReachedTheService';
}
