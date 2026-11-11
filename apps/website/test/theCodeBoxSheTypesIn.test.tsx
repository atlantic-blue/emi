/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { TheSignInForm, theDigitsSheTyped } from '../components/theSignInForm';
import { wordsIn } from '../app/words';
import { THE_SIGN_IN_CODE_IS_THIS_LONG, THE_SIGN_UP_CODE_IS_THIS_LONG } from '../lib/theSignIn';

/**
 * The box she types the code into, driven in a browser rather than read off the markup.
 *
 * The width of this box is the whole of the fault this file was written for. The service sends six
 * digits to confirm an address and eight to sign a woman in, and a box fixed at six cut the eight
 * digit code down to six and then refused it. So each case here presses the keys and reads what
 * the box is left holding, which is the only reading that could have caught it.
 *
 * The page draws the box only after the service has answered, so the service is answered here by a
 * stub and every case walks the real component from the address she types.
 */

/** What the stub answers one call with. */
interface AnAnswer {
  readonly status: number;
  readonly said: Record<string, unknown>;
}

const HER_ADDRESS = 'iuliia@example.com';

const words = wordsIn('en');

/** The service, answering the queue it is given, one call at a time. */
function aService(answers: readonly AnAnswer[]): { calls: string[] } {
  const left = [...answers];
  const calls: string[] = [];

  globalThis.fetch = ((_where: unknown, asked: RequestInit) => {
    const headers = (asked.headers ?? {}) as Record<string, string>;

    calls.push((headers['x-amz-target'] ?? '').split('.').pop() ?? '');

    const next = left.shift();

    if (next === undefined) {
      return Promise.reject(new Error('The stub had no answer left.'));
    }

    return Promise.resolve({
      ok: next.status === 200,
      json: () => Promise.resolve(next.said),
    });
  }) as unknown as typeof fetch;

  return { calls };
}

const took = (said: Record<string, unknown>): AnAnswer => ({ status: 200, said });

const sheIsSignedUp = took({ UserSub: 'a-subject', Session: 'the-sign-up-session' });

const theAddressAlreadyHasAnAccount: AnAnswer = {
  status: 400,
  said: { __type: 'AliasExistsException' },
};

const theSignInCodeIsOnItsWay = took({
  ChallengeName: 'EMAIL_OTP',
  Session: 'the-sign-in-session',
});

/** The page, mounted into a document, as her browser mounts it. */
async function theSignInPage(): Promise<HTMLElement> {
  const where = document.createElement('div');

  document.body.append(where);

  const root = createRoot(where);

  await act(async () => {
    root.render(
      <TheSignInForm language="en" words={words}>
        <div />
      </TheSignInForm>,
    );
  });

  return where;
}

/** A field written into the way a browser writes into one, so React reads the change. */
async function sheTypes(field: HTMLInputElement, value: string): Promise<void> {
  const writeIt = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

  await act(async () => {
    writeIt?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function shePresses(where: HTMLElement, saying: string): Promise<void> {
  const press = [...where.querySelectorAll('button')].find(
    (each) => each.textContent?.trim() === saying,
  );

  if (press === undefined) {
    throw new Error(`No press says "${saying}". The page says: ${where.textContent ?? ''}`);
  }

  await act(async () => {
    press.click();
  });
}

function theCodeBox(where: HTMLElement): HTMLInputElement {
  const field = where.querySelector<HTMLInputElement>('#sign-in-code');

  if (field === null) {
    throw new Error(`There is no box for the code. The page says: ${where.textContent ?? ''}`);
  }

  return field;
}

/** Her address typed in, and the press that sends her a code. */
async function sheAsksForACode(where: HTMLElement): Promise<void> {
  const address = where.querySelector<HTMLInputElement>('#sign-in-address');

  if (address === null) {
    throw new Error('There is no box for her address.');
  }

  await sheTypes(address, HER_ADDRESS);
  await shePresses(where, words.signInSendCode);
}

beforeEach(() => {
  document.body.innerHTML = '';
  // React draws nothing outside an act environment, and the runner sets no such flag of its own.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('the box she types the code into', () => {
  it('takes the six digits of a sign up code, and refuses a seventh', async () => {
    aService([sheIsSignedUp]);

    const where = await theSignInPage();

    await sheAsksForACode(where);

    const box = theCodeBox(where);

    expect(box.maxLength).toBe(THE_SIGN_UP_CODE_IS_THIS_LONG);
    expect(box.placeholder).toBe('000000');

    await sheTypes(box, '4829137');

    expect(theCodeBox(where).value).toBe('482913');
  });

  it('takes all eight digits of a sign in code, which is the code she is sent', async () => {
    aService([sheIsSignedUp, theAddressAlreadyHasAnAccount, theSignInCodeIsOnItsWay]);

    const where = await theSignInPage();

    await sheAsksForACode(where);
    await sheTypes(theCodeBox(where), '482913');
    await shePresses(where, words.signInCodeSubmit);

    const box = theCodeBox(where);

    expect(box.maxLength).toBe(THE_SIGN_IN_CODE_IS_THIS_LONG);
    expect(box.placeholder).toBe('00000000');

    await sheTypes(box, '48291374');

    // All eight. A box fixed at six held "482913" here, and the service then refused it as the
    // wrong code whatever she typed.
    expect(theCodeBox(where).value).toBe('48291374');
    expect(theCodeBox(where).value).toHaveLength(THE_SIGN_IN_CODE_IS_THIS_LONG);
  });

  it('leaves her on the same box, told to read the newest email and nothing about her account', async () => {
    aService([sheIsSignedUp, theAddressAlreadyHasAnAccount, theSignInCodeIsOnItsWay]);

    const where = await theSignInPage();

    await sheAsksForACode(where);
    await sheTypes(theCodeBox(where), '482913');
    await shePresses(where, words.signInCodeSubmit);

    const said = (where.textContent ?? '').toLowerCase();

    expect(where.textContent).toContain(words.signInAnotherCodeIsOnItsWay);
    expect(where.textContent).toContain(HER_ADDRESS);
    // The one thing the page may not say, in the words the end to end suite also refuses.
    for (const telling of ['already', 'existing', 'no account', 'new account', 'not found']) {
      expect({ telling, said: said.includes(telling) }).toEqual({ telling, said: false });
    }
    // What she must do next is not a refusal, so it is not read out as one.
    expect(where.querySelector('[role="alert"]')).toBeNull();
    expect(theCodeBox(where).value).toBe('');
  });

  it('presses for a new code without signing her up again, once she holds a sign in code', async () => {
    const service = aService([
      sheIsSignedUp,
      theAddressAlreadyHasAnAccount,
      theSignInCodeIsOnItsWay,
      theSignInCodeIsOnItsWay,
    ]);

    const where = await theSignInPage();

    await sheAsksForACode(where);
    await sheTypes(theCodeBox(where), '482913');
    await shePresses(where, words.signInCodeSubmit);
    await shePresses(where, words.signInSendANewCode);

    expect(service.calls).toEqual(['SignUp', 'ConfirmSignUp', 'InitiateAuth', 'InitiateAuth']);
    expect(theCodeBox(where).maxLength).toBe(THE_SIGN_IN_CODE_IS_THIS_LONG);
  });

  it('refuses a short code with words that name no number of digits', async () => {
    aService([sheIsSignedUp]);

    const where = await theSignInPage();

    await sheAsksForACode(where);
    await sheTypes(theCodeBox(where), '4829');
    await shePresses(where, words.signInCodeSubmit);

    expect(where.querySelector('[role="alert"]')?.textContent).toBe(words.signInNeedsTheCode);
    expect(words.signInNeedsTheCode).not.toMatch(/\d/);
  });
});

describe('what the box keeps of what she typed', () => {
  it('keeps the digits and drops everything else, up to the length of the code she was sent', () => {
    expect(theDigitsSheTyped('48291374', THE_SIGN_IN_CODE_IS_THIS_LONG)).toBe('48291374');
    expect(theDigitsSheTyped('48291374', THE_SIGN_UP_CODE_IS_THIS_LONG)).toBe('482913');
    expect(theDigitsSheTyped('4829 1374', THE_SIGN_IN_CODE_IS_THIS_LONG)).toBe('48291374');
    expect(theDigitsSheTyped('Code: 482913', THE_SIGN_UP_CODE_IS_THIS_LONG)).toBe('482913');
    expect(theDigitsSheTyped('482913749', THE_SIGN_IN_CODE_IS_THIS_LONG)).toBe('48291374');
  });
});
