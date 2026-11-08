import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { renderToStaticMarkup } from 'react-dom/server.node';

import RootLayout from '../../apps/website/app/[lang]/layout';
import SignInPage, { theWaysToSignIn } from '../../apps/website/app/[lang]/sign-in/page';
import ReturningPage, {
  THE_RETURN_PAGE,
  generateMetadata,
} from '../../apps/website/app/[lang]/sign-in/returning/page';
import { type Language, type SiteWordKey, languages, wordsIn } from '../../apps/website/app/words';
import { SITE_ORIGIN } from '../../apps/website/lib/addresses';
import { aNonce, policyAllowing } from '../../apps/website/lib/contentSecurityPolicy';
import { THE_SIGN_IN_HOST } from '../../apps/website/lib/theProviderSignIn';
import { THE_POOL_HOST } from '../../apps/website/lib/theSignIn';
import { thePagesOfTheSite } from '../../apps/website/tools/theFilesACrawlerReads';
import { type ASource, placesOfferingGoogleWithoutApple } from '../../tools/pipeline/signIn';

const feature = loadFeature(join(__dirname, 'the-site-signs-her-in-with-apple-and-google.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

// Drawing three languages of two pages takes longer than the tier's own limit allows.
jest.setTimeout(120_000);

/** The board the two presses are drawn from, which is the one the operator approved. */
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

/** The whole document a browser is sent, because the two bands are part of every one of them. */
async function documentOf(page: React.ReactNode, language: Language): Promise<string> {
  return renderToStaticMarkup(
    await RootLayout({ children: page, params: Promise.resolve({ lang: language }) }),
  );
}

const signInPageIn = async (language: Language): Promise<string> =>
  documentOf(await SignInPage({ params: Promise.resolve({ lang: language }) }), language);

const returningPageIn = async (language: Language): Promise<string> =>
  documentOf(await ReturningPage({ params: Promise.resolve({ lang: language }) }), language);

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

/** Every source of this repository a rule about a way in reads: the code, and no document. */
function everySource(): ASource[] {
  return execFileSync('git', ['ls-files', '*.ts', '*.tsx', '*.tf', '*.feature'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => file.length > 0)
    .map((file) => ({ file, text: readFileSync(join(repositoryRoot, file), 'utf8') }));
}

defineFeature(feature, (test) => {
  test('the page draws the two presses, and the words arrive in three languages', ({
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

    then('she reads a press for Apple and a press for Google over the divider', () => {
      const said = saidIn(inEnglish());
      const words = wordsIn('en');

      expect(said).toContain(words.signInApple);
      expect(said).toContain(words.signInGoogle);
      expect(said).not.toContain(words.signInTelegram);
      expect(theWaysToSignIn.map((way) => way.word)).toEqual([
        'signInApple',
        'signInGoogle',
        'signInTelegram',
      ]);

      // The divider the board draws between the presses and the box for her address, which the
      // page draws now that there is something over it.
      expect(inEnglish()).toContain('bg-siteLine');
      expect(said.indexOf(words.signInApple)).toBeLessThan(said.indexOf(words.signInGoogle));
      expect(said.indexOf(words.signInGoogle)).toBeLessThan(said.indexOf(words.signInOr));
    });

    and('each press carries the mark of its own company, drawn as the board draws it', () => {
      const board = readFileSync(theBoard, 'utf8');
      const outlines = [...board.matchAll(/ d="([^"]+)"/g)].map(([, outline]) => outline ?? '');
      const telegram = ['M21 4L3 11l6 2 2 6 3-4 5 4 2-15z', 'M9 13l8-6'];

      for (const outline of outlines.filter((each) => !telegram.includes(each))) {
        expect(inEnglish()).toContain(outline);
      }

      for (const outline of telegram) {
        expect(inEnglish()).not.toContain(outline);
      }
    });

    and('neither press is drawn in a colour of Emi that its company does not allow', () => {
      const apple = theWaysToSignIn[0];
      const google = theWaysToSignIn[1];

      // Apple asks for white on black, which the palette of the board already holds. Google asks
      // for its own rule and its own words, which are in the token package and in neither palette.
      expect(apple?.ground).toContain('bg-siteBlack');
      expect(google?.ground).toContain('border-markGoogleLine');
      expect(google?.ground).toContain('text-markGoogleText');
      expect(google?.ground).not.toContain('siteControlLine');
      // No colour reaches a page as a value. The page carries classes, and the policy of this site
      // refuses a style written on an element.
      expect(inEnglish()).not.toContain('style=');
    });

    and('every word of the two presses arrives in English, in Russian and in Spanish', () => {
      const ofThePresses: SiteWordKey[] = ['signInApple', 'signInGoogle', 'signInOr'];

      for (const language of languages) {
        const said = saidIn(theMiddleOf(drawn[language] ?? ''));

        for (const key of ofThePresses) {
          expect({ language, key, said: said.includes(wordsIn(language)[key]) }).toEqual({
            language,
            key,
            said: true,
          });
        }
      }

      // A catalogue answering in English would pass every line above, so the three are held apart.
      expect(new Set(languages.map((language) => wordsIn(language).signInApple)).size).toBe(
        languages.length,
      );
    });
  });

  test('the page she comes back to says what it is doing, in three languages', ({
    given,
    then,
    and,
  }) => {
    const drawn: Partial<Record<Language, string>> = {};

    given('a woman comes back from Apple', async () => {
      for (const language of languages) {
        drawn[language] = await returningPageIn(language);
      }

      expect(Object.keys(drawn)).toHaveLength(languages.length);
    });

    then('she reads one line that says Emi is finishing her sign in', () => {
      const said = saidIn(theMiddleOf(drawn.en ?? ''));
      const words = wordsIn('en');

      expect(said).toContain(words.returningTitle);
      expect(said).toContain(words.returningWait);
      // Nothing to press and nothing to read while it works. The page exists for the two seconds
      // the exchange takes, and the sentence it ends on is written by her browser.
      expect(theMiddleOf(drawn.en ?? '')).not.toContain('<button');
      expect(said).not.toContain(words.returningDidNotFinish);
    });

    and(
      'the page names its own address, so a search engine keeps it apart from the others',
      async () => {
        for (const language of languages) {
          const head = await generateMetadata({ params: Promise.resolve({ lang: language }) });

          expect(head.alternates?.canonical).toBe(`${THE_SITE}/${language}/${THE_RETURN_PAGE}`);
          expect(head.title).toBe(wordsIn(language).returningTitle);
        }

        expect(THE_RETURN_PAGE).toBe('sign-in/returning/');
        expect(SITE_ORIGIN).toBe(THE_SITE);
      },
    );

    and('every word of that page arrives in English, in Russian and in Spanish', () => {
      const ofThisPage: SiteWordKey[] = [
        'returningTitle',
        'returningWait',
        'returningDidNotFinish',
        'returningTryAgain',
        'signInCouldNotStart',
      ];

      for (const key of ofThisPage) {
        const said = languages.map((language) => wordsIn(language)[key]);

        expect(said.filter((sentence) => sentence.trim().length > 0)).toHaveLength(
          languages.length,
        );
        expect(new Set(said).size).toBe(languages.length);
      }

      for (const language of languages) {
        expect(saidIn(theMiddleOf(drawn[language] ?? ''))).toContain(
          wordsIn(language).returningWait,
        );
      }
    });

    and('the list a crawler reads names the page in each of the three languages', () => {
      expect(thePagesOfTheSite.map((page) => page.path)).toContain(THE_RETURN_PAGE);
    });
  });

  test('the page may reach the pool that answers on auth.myemi.app', ({ given, then, and }) => {
    let policy = '';

    given('the policy every page of the site answers with', () => {
      policy = policyAllowing(aNonce());
      expect(policy.length).toBeGreaterThan(0);
    });

    then('it allows the host the pool answers on, beside the host the code sign in asks', () => {
      expect(policy).toContain(`connect-src 'self' ${THE_POOL_HOST} ${THE_SIGN_IN_HOST}`);
      expect(THE_SIGN_IN_HOST).toBe('https://auth.myemi.app');
    });

    and('it allows no third host, and no page writes a style of its own', () => {
      const connect =
        policy.split('; ').find((directive) => directive.startsWith('connect-src')) ?? '';

      expect(connect.split(' ')).toHaveLength(4);
      expect(policy).toContain(`default-src 'self'`);
      expect(policy).toContain(`frame-ancestors 'none'`);
    });
  });

  test('every place that offers Google offers Apple beside it', ({ given, when, then, and }) => {
    let sources: ASource[] = [];

    given('every source of this repository', () => {
      sources = everySource();
      expect(sources.length).toBeGreaterThan(500);
    });

    when('each place that offers a way in is read', () => {
      expect(sources.filter(({ text }) => text.includes('signInGoogle')).length).toBeGreaterThan(3);
    });

    then('not one of them offers Google without Apple', () => {
      expect(placesOfferingGoogleWithoutApple(sources)).toEqual([]);
    });

    and('a place that offered Google alone would be named, with the name it is missing', () => {
      expect(
        placesOfferingGoogleWithoutApple([
          { file: 'apps/mobile/src/features/account/SignIn.tsx', text: 'press(signInGoogle)' },
        ]),
      ).toEqual([
        'apps/mobile/src/features/account/SignIn.tsx offers signInGoogle and does not offer signInApple beside it',
      ]);
      expect(
        placesOfferingGoogleWithoutApple([{ file: 'infra/cognito.tf', text: "name = 'Google'" }]),
      ).toEqual([
        "infra/cognito.tf offers 'Google' and does not offer 'SignInWithApple' beside it",
      ]);
    });
  });
});
