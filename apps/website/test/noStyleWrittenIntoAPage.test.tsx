import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../app/[lang]/layout';
import NotFound from '../app/[lang]/not-found';
import HomePage from '../app/[lang]/page';
import PrivacyPage from '../app/[lang]/privacy/page';
import PrivacyPolicyPage from '../app/[lang]/privacy-policy/page';
import SignInPage from '../app/[lang]/sign-in/page';
import SupportPage from '../app/[lang]/support/page';
import AccountPage from '../app/[lang]/account/page';
import { type Language, languages } from '../app/words';

/**
 * The policy of SITE-6 names a secret for a style, and a secret cannot be put on a style written
 * on an element. So her browser refuses one, and whatever that style was doing to the page stops
 * happening. The page still arrives, which is what makes this worth a test of its own: nothing
 * fails, the page simply draws a little wrong, and only a reader finds out.
 *
 * A block of style is refused for the same reason unless it carries the secret, and no page here
 * writes one, so both shapes are read.
 */

function stylesWrittenInto(markup: string): string[] {
  return [
    ...[...markup.matchAll(/style="[^"]*"/g)].map(([found]) => found),
    ...[...markup.matchAll(/<style[\s>]/g)].map(([found]) => found),
  ];
}

/**
 * The whole document a browser is sent, because a style written anywhere in it is refused, and the
 * band at the top and the band at the foot are part of every one of them.
 */
async function documentAround(children: ReactNode, lang: string): Promise<string> {
  return renderToStaticMarkup(await RootLayout({ children, params: Promise.resolve({ lang }) }));
}

const homePageIn = async (language: Language): Promise<string> =>
  documentAround(await HomePage({ params: Promise.resolve({ lang: language }) }), language);

const privacyPageIn = async (language: Language): Promise<string> =>
  documentAround(await PrivacyPage({ params: Promise.resolve({ lang: language }) }), language);

const privacyPolicyIn = async (language: Language): Promise<string> =>
  documentAround(
    await PrivacyPolicyPage({ params: Promise.resolve({ lang: language }) }),
    language,
  );

const supportPageIn = async (language: Language): Promise<string> =>
  documentAround(await SupportPage({ params: Promise.resolve({ lang: language }) }), language);

const signInPageIn = async (language: Language): Promise<string> =>
  documentAround(await SignInPage({ params: Promise.resolve({ lang: language }) }), language);

const accountPageIn = async (language: Language): Promise<string> =>
  documentAround(await AccountPage({ params: Promise.resolve({ lang: language }) }), language);

describe('no page of the site writes a style the policy would refuse', () => {
  it.each(languages)('the page a woman meets Emi on, in %s', async (language) => {
    expect(stylesWrittenInto(await homePageIn(language))).toEqual([]);
  });

  it.each(languages)('the page that explains the encryption, in %s', async (language) => {
    expect(stylesWrittenInto(await privacyPageIn(language))).toEqual([]);
  });

  it.each(languages)('the privacy policy, in %s', async (language) => {
    expect(stylesWrittenInto(await privacyPolicyIn(language))).toEqual([]);
  });

  it.each(languages)('the support page, in %s', async (language) => {
    expect(stylesWrittenInto(await supportPageIn(language))).toEqual([]);
  });

  it.each(languages)('the page she signs in on, in %s', async (language) => {
    expect(stylesWrittenInto(await signInPageIn(language))).toEqual([]);
  });

  it.each(languages)('her account, in %s', async (language) => {
    expect(stylesWrittenInto(await accountPageIn(language))).toEqual([]);
  });

  it('the page behind an address the site does not have', async () => {
    expect(stylesWrittenInto(await documentAround(<NotFound />, 'en'))).toEqual([]);
  });

  it('reads a style where one is written, so a page that grows one fails this', () => {
    expect(stylesWrittenInto('<div style="color:transparent"></div>')).toEqual([
      'style="color:transparent"',
    ]);
    expect(stylesWrittenInto('<style>a{}</style>')).toEqual(['<style>']);
  });
});
