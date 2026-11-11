import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { renderToStaticMarkup } from 'react-dom/server.node';

import { websiteColour } from '@emi/tokens';

import RootLayout from '../../apps/website/app/[lang]/layout';
import SignInPage, { theWaysToSignIn } from '../../apps/website/app/[lang]/sign-in/page';
import TelegramReturnPage, {
  THE_TELEGRAM_RETURN_PAGE,
  generateMetadata,
} from '../../apps/website/app/[lang]/sign-in/telegram/page';
import { type Language, languages, wordsIn } from '../../apps/website/app/words';
import { SITE_ORIGIN } from '../../apps/website/lib/addresses';
import { aNonce, policyAllowing } from '../../apps/website/lib/contentSecurityPolicy';
import {
  THE_API_HOST,
  THE_EMI_BOT_ID,
  THE_TELEGRAM_HOST,
  WHERE_TELEGRAM_ASKS_HER,
  theLanguageIn,
  whatSheStarted,
  whereAPressTakesHer,
} from '../../apps/website/lib/theTelegramSignIn';
import { thePagesOfTheSite } from '../../apps/website/tools/theFilesACrawlerReads';

const feature = loadFeature(join(__dirname, 'the-site-signs-her-in-with-telegram.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

// Drawing three languages of two pages takes longer than the tier's own limit allows.
jest.setTimeout(120_000);

/** The board the press is drawn from, which is the one the operator approved. */
const theBoard = join(
  repositoryRoot,
  'docs',
  'design',
  'website',
  'sign-in',
  'boards',
  'SignIn.dc.html',
);

/** The one host of the site, written out rather than read from what builds the addresses. */
const THE_SITE = 'https://myemi.app';

/** The two outlines the board draws the mark of Telegram with, which is a paper plane. */
const thePaperPlane = ['M21 4L3 11l6 2 2 6 3-4 5 4 2-15z', 'M9 13l8-6'];

/**
 * A store of its own, because a press keeps three values and this run has no browser.
 *
 * The press also makes a digest, which needs the cryptography of the platform. This project runs
 * in node, which carries it, so the press runs for real here and only the store is stood in.
 */
function aStoreOfItsOwn(): Storage {
  const held = new Map<string, string>();

  return {
    get length() {
      return held.size;
    },
    clear: () => held.clear(),
    getItem: (name: string) => held.get(name) ?? null,
    key: (at: number) => [...held.keys()][at] ?? null,
    removeItem: (name: string) => held.delete(name) as unknown as void,
    setItem: (name: string, value: string) => held.set(name, value) as unknown as void,
  };
}

globalThis.sessionStorage = aStoreOfItsOwn();

/** The whole document a browser is sent, because the two bands are part of every one of them. */
async function documentOf(page: React.ReactNode, language: Language): Promise<string> {
  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: language }) }),
  );
}

const signInPageIn = async (language: Language): Promise<string> =>
  documentOf(await SignInPage({ params: Promise.resolve({ lang: language }) }), language);

const relayPageIn = async (language: Language): Promise<string> =>
  documentOf(await TelegramReturnPage({ params: Promise.resolve({ lang: language }) }), language);

/** The part of the document this page owns, which is everything between the two bands. */
function theMiddleOf(markup: string): string {
  return markup.slice(markup.indexOf('<main'), markup.indexOf('</main>'));
}

/** What the page says, with the markup taken out, so a word inside a class is not read as drawn. */
function saidIn(markup: string): string {
  return markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

defineFeature(feature, (test) => {
  test('the page draws the press, and it carries the mark the board draws', ({
    given,
    then,
    and,
  }) => {
    const drawn: Partial<Record<Language, string>> = {};

    const inEnglish = (): string => theMiddleOf(drawn.en ?? '');

    given('a woman opens the page she signs in on', async () => {
      for (const language of languages) {
        drawn[language] = await signInPageIn(language);
      }

      expect(Object.keys(drawn)).toHaveLength(languages.length);
    });

    then('she reads a press for Telegram under the press for Google', () => {
      const said = saidIn(inEnglish());
      const words = wordsIn('en');

      expect(said).toContain(words.signInTelegram);

      // The order the board draws them in: Apple, then Google, then Telegram. Apple's review rule
      // asks for a way in that limits what it learns beside every social sign in, so this press
      // goes under both of them rather than over either, and a page that offered Google without
      // Apple is a page the store refuses.
      expect(said.indexOf(words.signInApple)).toBeLessThan(said.indexOf(words.signInGoogle));
      expect(said.indexOf(words.signInGoogle)).toBeLessThan(said.indexOf(words.signInTelegram));

      // The board draws it third, so nothing waits for its keys on this page any more.
      expect(theWaysToSignIn[2]?.word).toBe('signInTelegram');
      expect(theWaysToSignIn.filter((way) => way.waitsForItsKeys === true)).toEqual([]);
    });

    and(
      'the press carries the paper plane the board draws, in the colour of the words beside it',
      () => {
        const board = readFileSync(theBoard, 'utf8');

        for (const outline of thePaperPlane) {
          // The board holds it, so the page is drawing the board's outline and not one of its own.
          expect(board).toContain(outline);
          expect(inEnglish()).toContain(outline);
        }

        // The colour the board strokes it in, which is the colour of every sentence of the page.
        expect(inEnglish()).toContain(`stroke="${websiteColour.siteText}"`);
        expect(inEnglish()).toContain('stroke-width="1.75"');
      },
    );

    and('the press is drawn on the tint of Emi, in no colour another company fixes', () => {
      const telegram = theWaysToSignIn[2];

      expect(telegram?.ground).toContain('bg-siteTint');
      expect(telegram?.ground).toContain('text-siteText');
      // Telegram fixes no colour for a press, so this is the one of the three that carries none of
      // another company's values.
      expect(telegram?.ground).not.toContain('markGoogle');
      expect(telegram?.ground).not.toContain('siteBlack');
      // No colour reaches a page as a value. The page carries classes, and the policy of this site
      // refuses a style written on an element.
      expect(inEnglish()).not.toContain('style=');
    });

    and('the word of the press arrives in English, in Russian and in Spanish', () => {
      const said = languages.map((language) => wordsIn(language).signInTelegram);

      expect(said.filter((word) => word.trim().length > 0)).toHaveLength(languages.length);
      // A catalogue answering in English would pass the line above, so the three are held apart.
      expect(new Set(said).size).toBe(languages.length);

      for (const language of languages) {
        expect(saidIn(theMiddleOf(drawn[language] ?? ''))).toContain(
          wordsIn(language).signInTelegram,
        );
      }
    });
  });

  test('the relay page says what it is doing, in three languages', ({ given, then, and }) => {
    const drawn: Partial<Record<Language, string>> = {};

    given('a woman comes back from Telegram', async () => {
      for (const language of languages) {
        drawn[language] = await relayPageIn(language);
      }

      expect(Object.keys(drawn)).toHaveLength(languages.length);
    });

    then('she reads one line that says Emi is finishing her sign in', () => {
      for (const language of languages) {
        const said = saidIn(theMiddleOf(drawn[language] ?? ''));
        const words = wordsIn(language);

        // The same two sentences the page Apple and Google come back to says, because this piece
        // adds no state that no board of the sign in has drawn.
        expect(said).toContain(words.returningTitle);
        expect(said).toContain(words.returningWait);
      }
    });

    and('the page presses nothing and says nothing of the code in the address', () => {
      const markup = theMiddleOf(drawn.en ?? '');

      // Nothing to press and nothing to read while it works. The page exists for the two seconds
      // the sign in takes, and the sentence it ends on is written by her browser.
      expect(markup).not.toContain('<button');
      expect(saidIn(markup)).not.toContain(wordsIn('en').returningDidNotFinish);
      // A server of this site draws this page and never reads the address, so no code, no state
      // and no verifier can reach the markup it sends.
      expect(markup).not.toContain('code=');
      expect(markup).not.toContain('state=');
    });

    and(
      'the page names its own address, so a search engine keeps it apart from the others',
      async () => {
        for (const language of languages) {
          const head = await generateMetadata({ params: Promise.resolve({ lang: language }) });

          expect(head.alternates?.canonical).toBe(
            `${THE_SITE}/${language}/${THE_TELEGRAM_RETURN_PAGE}`,
          );
          expect(head.title).toBe(wordsIn(language).returningTitle);
        }

        expect(THE_TELEGRAM_RETURN_PAGE).toBe('sign-in/telegram/');
        expect(SITE_ORIGIN).toBe(THE_SITE);
      },
    );

    and('the list a crawler reads names the page in each of the three languages', () => {
      expect(thePagesOfTheSite.map((page) => page.path)).toContain(THE_TELEGRAM_RETURN_PAGE);
    });
  });

  test('the press asks Telegram for a subject and nothing else of hers', ({ given, then, and }) => {
    let left = new URL('https://example.invalid/');

    given('the address a press on Telegram hands her browser', async () => {
      left = new URL(await whereAPressTakesHer('ru', THE_SITE));
      expect(left.searchParams.size).toBeGreaterThan(0);
    });

    then('it names the bot of Emi as the client, and asks for a code', () => {
      expect(`${left.origin}${left.pathname}`).toBe(WHERE_TELEGRAM_ASKS_HER);
      expect(THE_TELEGRAM_HOST).toBe('https://oauth.telegram.org');
      expect(left.searchParams.get('client_id')).toBe(THE_EMI_BOT_ID);
      // The bot identifier is the client identifier of this sign in and the audience its token
      // carries, and the parameter store of the account holds the same value by name.
      expect(THE_EMI_BOT_ID).toMatch(/^[0-9]{8,}$/);
      expect(left.searchParams.get('response_type')).toBe('code');
    });

    and('it asks for the scope openid, and for none of the three scopes that describe her', () => {
      expect(left.searchParams.get('scope')).toBe('openid');

      // Her name, her telephone number, and the right for the bot to write to her.
      for (const refused of ['profile', 'phone', 'telegram:bot_access']) {
        expect(left.searchParams.get('scope')).not.toContain(refused);
      }
    });

    and('it hands Telegram a digest, and keeps the value the digest was made from', () => {
      const kept = whatSheStarted('ru');

      expect(left.searchParams.get('code_challenge_method')).toBe('S256');
      expect((left.searchParams.get('code_challenge') ?? '').length).toBeGreaterThan(20);
      expect((kept?.verifier ?? '').length).toBeGreaterThan(20);
      // The value itself stays in her browser. An address carrying it would hand the proof to
      // whoever read the address.
      expect(left.search).not.toContain(kept?.verifier ?? 'nothing');
    });

    and('it comes back to the one address Telegram registers, which is under en', () => {
      expect(left.searchParams.get('redirect_uri')).toBe(
        `${THE_SITE}/en/${THE_TELEGRAM_RETURN_PAGE}`,
      );
      // She pressed in Russian and comes back through the English address, so the language
      // travels in the state value and the relay reads it from there.
      expect(theLanguageIn(left.searchParams.get('state'))).toBe('ru');
    });
  });

  test('the policy lets her browser reach the api that signs her in', ({ given, then, and }) => {
    let policy = '';

    given('the policy every page of the site answers with', () => {
      policy = policyAllowing(aNonce());
      expect(policy.length).toBeGreaterThan(0);
    });

    then('it names the api of Emi as one source the page may reach', () => {
      const connect = policy.split('; ').find((each) => each.startsWith('connect-src')) ?? '';

      expect(connect.split(' ')).toContain(THE_API_HOST);
      expect(new URL(THE_API_HOST).protocol).toBe('https:');
    });

    and(
      'it names the host Telegram asks her on nowhere, because her browser leaves the site for it',
      () => {
        expect(policy).not.toContain(THE_TELEGRAM_HOST);
        expect(policy).not.toContain('oauth.telegram.org');
      },
    );
  });
});
