/**
 * @jest-environment jsdom
 */
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { websiteFace } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server.node';

import RootLayout from '../../apps/website/app/[lang]/layout';
import AccountPage from '../../apps/website/app/[lang]/account/page';
import SignInPage, {
  generateMetadata,
  theWaysInSheIsOffered,
  theWaysToSignIn,
} from '../../apps/website/app/[lang]/sign-in/page';
import { type Language, type SiteWordKey, languages, wordsIn } from '../../apps/website/app/words';
import { THE_SESSION_ENTRY, holdTheSession } from '../../apps/website/lib/theSessionSheHolds';
import {
  ASignInProblem,
  THE_CODE_IS_THIS_LONG,
  THE_WEBSITE_CLIENT_ID,
  askForACode,
  signInWithTheCode,
  signOut,
} from '../../apps/website/lib/theSignIn';
import { thePagesOfTheSite } from '../../apps/website/tools/theFilesACrawlerReads';

const feature = loadFeature(join(__dirname, '28.4-the-sign-in-page.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

// Drawing three languages of two pages takes longer than the tier's own limit allows.
jest.setTimeout(120_000);

/** The path the page sits at under a language, as the list of pages and the head both write it. */
const THE_SIGN_IN_PAGE = 'sign-in/';

/** The path her account sits at, which a sign in leaves her on. */
const THE_ACCOUNT_PAGE = 'account/';

/** The one host of the site, written out rather than read from what builds the addresses. */
const THE_SITE = 'https://myemi.app';

/** The heading face of this board, which the three other serif boards of the site also draw in. */
const THE_HEADING_FACE = 'Newsreader';

/** The one name a face has to be asked for by, which the theme writes behind the class. */
const theFaceBehindTheClass = websiteFace.serif;

const HER_ADDRESS = 'iuliia@example.com';

const SIX_DIGITS = '482913';

/** One call the stub was given, kept so a step can read what really went out. */
interface ACallThatWentOut {
  readonly call: string;
  readonly body: Record<string, unknown>;
}

/**
 * A stub of the pool, answering the shapes the service documents, one call at a time.
 *
 * A stub rather than the live pool, because the pool cannot send an email until steps 28.8 to
 * 28.10 connect it to the sender, so a run against the live pool would prove that an email did not
 * arrive and nothing else.
 */
function aPool(answers: readonly { status: number; said: Record<string, unknown> }[]) {
  const went: ACallThatWentOut[] = [];
  const left = [...answers];

  // A document has no Response and no Headers, so the stub hands back the two things the module
  // reads off an answer and the two names it sets on a request.
  const how = (async (_where: unknown, asked: RequestInit) => {
    const headers = (asked.headers ?? {}) as Record<string, string>;
    const named = headers['x-amz-target'] ?? '';

    went.push({
      call: named.split('.').pop() ?? '',
      body: JSON.parse(String(asked.body)) as Record<string, unknown>,
    });

    const next = left.shift();

    if (next === undefined) {
      throw new Error(`The stub was asked for ${named} and had no answer left.`);
    }

    return { ok: next.status === 200, json: () => Promise.resolve(next.said) };
  }) as unknown as typeof fetch;

  return { how, went };
}

const took = (said: Record<string, unknown>) => ({ status: 200, said });

const refused = (type: string, message = '') => ({
  status: 400,
  said: { __type: `com.amazon.coral.service#${type}`, message },
});

const theCodeIsOnItsWay = took({ ChallengeName: 'EMAIL_OTP', Session: 'a-session' });

const theTokens = took({
  AuthenticationResult: {
    IdToken: 'an-id-token',
    AccessToken: 'an-access-token',
    RefreshToken: 'a-refresh-token',
  },
});

/** The whole document a browser is sent, because the two bands are part of every one of them. */
async function documentOf(page: React.ReactNode, language: Language): Promise<string> {
  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: language }) }),
  );
}

const signInPageIn = async (language: Language): Promise<string> =>
  documentOf(await SignInPage({ params: Promise.resolve({ lang: language }) }), language);

const accountPageIn = async (language: Language): Promise<string> =>
  documentOf(await AccountPage({ params: Promise.resolve({ lang: language }) }), language);

/** The part of the document this page owns, which is everything between the two bands. */
function theMiddleOf(markup: string): string {
  return markup.slice(markup.indexOf('<main'), markup.indexOf('</main>'));
}

function openingTagsOf(markup: string, element: string): string[] {
  return [...markup.matchAll(new RegExp(`<${element}\\b[^>]*>`, 'g'))].map(([tag]) => tag);
}

/** What the page says, with the markup taken out, so a word inside a class is not read as drawn. */
function saidIn(markup: string): string {
  return markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

defineFeature(feature, (test) => {
  test('the page offers the one way in that works today', ({ given, then, and }) => {
    const drawn: Partial<Record<Language, string>> = {};

    const inEnglish = (): string => drawn.en ?? '';

    given('a woman opens the page she signs in on', async () => {
      for (const language of languages) {
        drawn[language] = await signInPageIn(language);
      }

      expect(Object.keys(drawn)).toHaveLength(languages.length);
    });

    then('she reads the title, the line under it and one box to type her address in', () => {
      const middle = theMiddleOf(inEnglish());
      const words = wordsIn('en');

      expect(saidIn(middle)).toContain(words.signInTitle);
      expect(saidIn(middle)).toContain(words.signInLine);
      expect(saidIn(middle)).toContain(words.signInWeSendACode);
      expect(openingTagsOf(middle, 'input')).toHaveLength(1);
      expect(openingTagsOf(middle, 'input')[0]).toContain('type="email"');
      // Nothing on the page asks for a password, and nothing ever will: the pool lists the
      // factor because the service refuses a list without it, and no client allows its flow.
      expect(middle.toLowerCase()).not.toContain('password');
      expect(middle).not.toContain('type="password"');
    });

    and(
      'the three ways in that wait for their keys are not drawn, and their words wait in all three languages',
      () => {
        const waiting: SiteWordKey[] = ['signInApple', 'signInGoogle', 'signInTelegram'];

        expect(theWaysToSignIn.map((way) => way.word)).toEqual(waiting);
        expect(theWaysInSheIsOffered()).toEqual([]);

        for (const language of languages) {
          const middle = theMiddleOf(drawn[language] ?? '');
          const words = wordsIn(language);

          for (const key of waiting) {
            expect({ language, key, held: words[key].trim().length > 0 }).toEqual({
              language,
              key,
              held: true,
            });
            expect({ language, key, drawn: saidIn(middle).includes(words[key]) }).toEqual({
              language,
              key,
              drawn: false,
            });
          }
        }

        // The divider over the three is drawn by the same list, so it goes with them. The word
        // itself is two letters that sit inside other words, so the rule is the element and not
        // the word: the page draws no rule of the kind the board draws between them.
        expect(theMiddleOf(inEnglish())).not.toContain('bg-siteLine');
        expect(wordsIn('en').signInOr.trim().length).toBeGreaterThan(0);
      },
    );

    and('the page tells her she does not need an account, and what the account holds', () => {
      for (const language of languages) {
        const said = saidIn(theMiddleOf(drawn[language] ?? ''));
        const words = wordsIn(language);

        expect(said).toContain(words.signInNoAccountNeeded);
        expect(said).toContain(words.signInWhatTheAccountHolds);
      }
    });

    and('every word the page draws arrives in English, in Russian and in Spanish', () => {
      const ofThisPage: SiteWordKey[] = [
        'signInTitle',
        'signInLine',
        'signInAddressLabel',
        'signInSendCode',
        'signInWeSendACode',
        'signInNoAccountNeeded',
        'signInWhatTheAccountHolds',
      ];

      for (const language of languages) {
        const said = saidIn(theMiddleOf(drawn[language] ?? ''));

        for (const key of ofThisPage) {
          expect({ language, key, said: said.includes(wordsIn(language)[key]) }).toEqual({
            language,
            key,
            said: true,
          });
        }
      }

      // A catalogue that answered in English would pass every line above, so the three are held
      // apart here. The title of this page differs in all three.
      expect(new Set(languages.map((language) => wordsIn(language).signInTitle)).size).toBe(
        languages.length,
      );
    });

    and('the title is set in the face the board sets it in, which the site serves itself', () => {
      const title = openingTagsOf(theMiddleOf(inEnglish()), 'h1')[0] ?? '';

      expect(title).toContain('font-serif');
      // The markup carries the class and the theme carries the family, so the family is read from
      // the token package the theme is built from rather than from the document.
      expect(theFaceBehindTheClass).toBe(THE_HEADING_FACE);
    });

    and(
      'the page names its own address, so a search engine keeps it apart from the home page',
      async () => {
        for (const language of languages) {
          const head = await generateMetadata({ params: Promise.resolve({ lang: language }) });

          expect(head.alternates?.canonical).toBe(`${THE_SITE}/${language}/${THE_SIGN_IN_PAGE}`);
          expect(head.title).toBe(wordsIn(language).signInTitle);
        }
      },
    );

    and('the list a crawler reads names the page in each of the three languages', () => {
      expect(thePagesOfTheSite.map((page) => page.path)).toContain(THE_SIGN_IN_PAGE);
      expect(thePagesOfTheSite.map((page) => page.path)).toContain(THE_ACCOUNT_PAGE);
    });

    and('the page writes no style of its own, so her browser refuses nothing', () => {
      for (const language of languages) {
        expect(drawn[language] ?? '').not.toContain('style=');
      }
    });
  });

  test('a code reaches a new address and a known one the same way', ({
    given,
    when,
    and,
    then,
  }) => {
    let brandNew: ReturnType<typeof aPool>;
    let knownAlready: ReturnType<typeof aPool>;

    given('a stub of the pool that answers the way the service documents', () => {
      brandNew = aPool([took({ UserSub: 'a-subject' }), theCodeIsOnItsWay]);
      knownAlready = aPool([refused('UsernameExistsException'), theCodeIsOnItsWay]);
    });

    when('she asks for a code on an address that has never signed in', async () => {
      expect(await askForACode(HER_ADDRESS, brandNew.how)).toEqual({
        address: HER_ADDRESS,
        session: 'a-session',
      });
    });

    and('she asks for a code on an address that has signed in before', async () => {
      expect(await askForACode(HER_ADDRESS, knownAlready.how)).toEqual({
        address: HER_ADDRESS,
        session: 'a-session',
      });
    });

    then('both ask the service the same two things, and no password is among them', () => {
      expect(brandNew.went.map((each) => each.call)).toEqual(['SignUp', 'InitiateAuth']);
      expect(knownAlready.went.map((each) => each.call)).toEqual(['SignUp', 'InitiateAuth']);
      expect(brandNew.went[0]?.body).not.toHaveProperty('Password');
      expect(JSON.stringify(brandNew.went)).not.toContain('PASSWORD');
      expect(brandNew.went[1]?.body).toMatchObject({
        ClientId: THE_WEBSITE_CLIENT_ID,
        AuthFlow: 'USER_AUTH',
        AuthParameters: { USERNAME: HER_ADDRESS, PREFERRED_CHALLENGE: 'EMAIL_OTP' },
      });
    });

    and('the page says the same words for both, so neither can be told from the other', () => {
      // The username is the one value that differs, and the application writes it at random, so
      // it carries nothing about her and nothing about which of the two she was.
      const withoutTheUsername = (went: ACallThatWentOut[]) =>
        went.map(({ call, body }) => ({ call, body: { ...body, Username: 'a-username' } }));

      expect(withoutTheUsername(brandNew.went)).toEqual(withoutTheUsername(knownAlready.went));
      expect(String(brandNew.went[0]?.body.Username)).not.toBe(
        String(knownAlready.went[0]?.body.Username),
      );
    });
  });

  test('the code she types signs her in, and each refusal says what to do next', ({
    given,
    when,
    then,
    and,
  }) => {
    let pool: ReturnType<typeof aPool>;

    given('a stub of the pool that answers the way the service documents', () => {
      pool = aPool([theTokens]);
      window.sessionStorage.clear();
      document.cookie = '';
    });

    when('she answers the code with the six digits she was sent', async () => {
      expect(SIX_DIGITS).toHaveLength(THE_CODE_IS_THIS_LONG);

      holdTheSession(
        await signInWithTheCode(
          { address: HER_ADDRESS, session: 'a-session' },
          SIX_DIGITS,
          pool.how,
        ),
      );
    });

    then('she holds the three tokens, in sessionStorage and in no cookie', () => {
      expect(JSON.parse(window.sessionStorage.getItem(THE_SESSION_ENTRY) ?? 'null')).toEqual({
        idToken: 'an-id-token',
        accessToken: 'an-access-token',
        refreshToken: 'a-refresh-token',
      });
      expect(window.localStorage.getItem(THE_SESSION_ENTRY)).toBeNull();
      expect(document.cookie).not.toContain('an-id-token');
      expect(document.cookie).not.toContain('a-refresh-token');
    });

    and(
      'a wrong code, an expired code, too many tries and no connection each say their own sentence',
      async () => {
        const refusals: readonly [{ status: number; said: Record<string, unknown> }, string][] = [
          [refused('CodeMismatchException'), 'theCodeIsWrong'],
          [refused('ExpiredCodeException'), 'theCodeHasExpired'],
          [refused('TooManyFailedAttemptsException'), 'tooManyTries'],
        ];

        for (const [answer, because] of refusals) {
          const waiting = { address: HER_ADDRESS, session: 'a-session' };

          await expect(
            signInWithTheCode(waiting, '000000', aPool([answer]).how),
          ).rejects.toMatchObject({ because });
        }

        const reachedNobody: typeof fetch = () => Promise.reject(new TypeError('Failed to fetch'));

        await expect(
          signInWithTheCode(
            { address: HER_ADDRESS, session: 'a-session' },
            SIX_DIGITS,
            reachedNobody,
          ),
        ).rejects.toMatchObject({ because: 'nothingReachedTheService' });
      },
    );

    and('every one of those sentences arrives in English, in Russian and in Spanish', () => {
      const sentences: SiteWordKey[] = [
        'signInCodeIsWrong',
        'signInCodeHasExpired',
        'signInTooManyTries',
        'signInNothingReached',
        'signInNeedsAnAddress',
        'signInNeedsSixDigits',
      ];

      for (const key of sentences) {
        const said = languages.map((language) => wordsIn(language)[key]);

        expect(said.filter((sentence) => sentence.trim().length > 0)).toHaveLength(
          languages.length,
        );
        expect(new Set(said).size).toBe(languages.length);
      }

      expect(new ASignInProblem('theCodeIsWrong').because).toBe('theCodeIsWrong');
    });
  });

  test('the account page is the head of its board, and a sign out ends the session', ({
    given,
    then,
    and,
  }) => {
    const drawn: Partial<Record<Language, string>> = {};

    given('a woman opens her account', async () => {
      for (const language of languages) {
        drawn[language] = await accountPageIn(language);
      }
    });

    then('she reads the title and the sentence that says her records are not on this site', () => {
      for (const language of languages) {
        const said = saidIn(theMiddleOf(drawn[language] ?? ''));
        const words = wordsIn(language);

        expect(said).toContain(words.accountTitle);
        expect(said).toContain(words.accountRecordsStayOnYourPhone);
      }

      expect(new Set(languages.map((language) => wordsIn(language).accountTitle)).size).toBe(
        languages.length,
      );
    });

    and('the four sections of the board are not drawn', () => {
      const middle = theMiddleOf(drawn.en ?? '');

      expect(openingTagsOf(middle, 'section')).toEqual([]);
      // The four the board draws, each named by what it would say on the page.
      for (const absent of ['Receipts', 'Change card', 'Cancel renewal', 'Delete account']) {
        expect({ absent, said: saidIn(middle).includes(absent) }).toEqual({ absent, said: false });
      }
    });

    and('a sign out asks the service to revoke the token that outlives the window', async () => {
      const pool = aPool([took({})]);

      await signOut('a-refresh-token', pool.how);

      expect(pool.went).toEqual([
        {
          call: 'RevokeToken',
          body: { ClientId: THE_WEBSITE_CLIENT_ID, Token: 'a-refresh-token' },
        },
      ]);
      expect(repositoryRoot.length).toBeGreaterThan(0);
    });
  });
});
