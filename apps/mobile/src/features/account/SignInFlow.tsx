import { ASignInProblem, type TheCodeSheWaitsFor, type TheSignIn } from '@emi/sign-in';
import { type ReactNode, useRef, useState } from 'react';

import { readingLanguage } from '../../language';
import { keepHerSignIn } from '../../services/signIn/herSignIn';
import {
  type OpenTheSession,
  TheTelegramSignInDidNotFinish,
  signInWithTelegram,
} from '../../services/signIn/theTelegramSignIn';
import type { SecureStore } from '../../services/vault/keychain';
import { AccountEmailCode, type TheOneLine } from './AccountEmailCode';
import { AccountGate } from './AccountGate';
import { type AccountProblem, accountEmailCodeCopy, theProblemSaid } from './copy';

const AN_EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isAnEmailAddress(typed: string): boolean {
  return AN_EMAIL_ADDRESS.test(typed);
}

/** A refusal that is not one of the service's own is read as a phone that reached nobody. */
function causeOf(problem: unknown): AccountProblem {
  return problem instanceof ASignInProblem ? problem.because : 'nothingReachedTheService';
}

function causeOfTelegram(problem: unknown): AccountProblem {
  return problem instanceof TheTelegramSignInDidNotFinish ? problem.because : 'itDidNotFinish';
}

/**
 * The two screens of a sign in by email code, which are one piece of state: the address she typed
 * and the code the service is waiting for, and the press on Telegram beside them. A press while a
 * request is out does nothing, because one press is one email or one browser session.
 */
export function SignInFlow({
  signIn,
  keychain,
  today,
  onSignedIn,
  openTheSession,
}: {
  readonly signIn: TheSignIn;
  readonly keychain: SecureStore;
  /** The day she is living in, which the account screen reads back as the day she signed in. */
  readonly today: () => string;
  readonly onSignedIn: () => void;
  readonly openTheSession: OpenTheSession;
}): ReactNode {
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [waiting, setWaiting] = useState<TheCodeSheWaitsFor | null>(null);
  const [problem, setProblem] = useState<AccountProblem | null>(null);
  const [isAnotherCodeOnItsWay, setIsAnotherCodeOnItsWay] = useState(false);
  const isAsking = useRef(false);

  function waitFor(next: TheCodeSheWaitsFor): void {
    setWaiting(next);
    setCode('');
  }

  async function sendACode(): Promise<void> {
    const typed = address.trim();

    if (isAsking.current) {
      return;
    }

    if (waiting === null && !isAnEmailAddress(typed)) {
      setProblem('addressIsNotValid');

      return;
    }

    isAsking.current = true;
    setProblem(null);
    setIsAnotherCodeOnItsWay(false);

    try {
      waitFor(
        waiting === null
          ? await signIn.askForACode(typed)
          : await signIn.sendHerAnotherCode(waiting),
      );
    } catch (refused) {
      setProblem(causeOf(refused));
    } finally {
      isAsking.current = false;
    }
  }

  async function answerTheCode(): Promise<void> {
    if (isAsking.current || waiting === null) {
      return;
    }

    if (code.length !== waiting.digits) {
      setProblem('needsTheCode');

      return;
    }

    isAsking.current = true;
    setProblem(null);
    setIsAnotherCodeOnItsWay(false);

    try {
      const answer = await signIn.signInWithTheCode(waiting, code);

      if (answer.kind === 'anotherCodeIsOnItsWay') {
        waitFor(answer.waitsFor);
        setIsAnotherCodeOnItsWay(true);

        return;
      }

      await keepHerSignIn(keychain, {
        way: 'email',
        address: waiting.address,
        since: today(),
        refreshToken: answer.held.refreshToken,
      });
      onSignedIn();
    } catch (refused) {
      setProblem(causeOf(refused));
      // The service hands back a fresh session with a refusal she may answer again, and the old
      // one is closed.
      const again = refused instanceof ASignInProblem ? refused.tryAgainWith : undefined;

      if (again !== undefined) {
        setWaiting({ ...waiting, session: again });
      }
    } finally {
      isAsking.current = false;
    }
  }

  async function logInWithTelegram(): Promise<void> {
    if (isAsking.current) {
      return;
    }

    isAsking.current = true;
    setProblem(null);

    try {
      const came = await signInWithTelegram(readingLanguage(), { signIn, openTheSession });

      if (came.kind === 'sheTurnedBack') {
        return;
      }

      await keepHerSignIn(keychain, {
        way: 'telegram',
        since: today(),
        refreshToken: came.held.refreshToken,
      });
      onSignedIn();
    } catch (refused) {
      setProblem(causeOfTelegram(refused));
    } finally {
      isAsking.current = false;
    }
  }

  function useAnotherAddress(): void {
    setWaiting(null);
    setCode('');
    setProblem(null);
    setIsAnotherCodeOnItsWay(false);
  }

  if (waiting === null) {
    return (
      <AccountGate
        address={address}
        onAddress={setAddress}
        onSendCode={() => void sendACode()}
        onTelegram={() => void logInWithTelegram()}
        problem={problem === null ? null : theProblemSaid(problem)}
      />
    );
  }

  const line: TheOneLine =
    problem !== null
      ? { words: theProblemSaid(problem), isAProblem: true }
      : {
          words: isAnotherCodeOnItsWay
            ? accountEmailCodeCopy.anotherCodeIsOnItsWay
            : accountEmailCodeCopy.lasts,
          isAProblem: false,
        };

  return (
    <AccountEmailCode
      address={waiting.address}
      code={code}
      digits={waiting.digits}
      line={line}
      onBack={useAnotherAddress}
      onCode={setCode}
      onSendANewCode={() => void sendACode()}
      onSignIn={() => void answerTheCode()}
      onUseAnotherAddress={useAnotherAddress}
    />
  );
}
