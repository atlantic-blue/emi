import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../../apps/website/app/layout';
import NotFound from '../../apps/website/app/not-found';

const feature = loadFeature(join(__dirname, '26.9-react-in-node.feature'));

/** The globals a page of the site must never find, because the server it runs on has none of them. */
const browserGlobals = ['window', 'document', 'localStorage'] as const;

/** What the phone leaves in a process: the development flag every react native bundle carries. */
const phoneGlobals = ['__DEV__', 'nativeFabricUIManager'] as const;

function standingInTheProcess(names: readonly string[]): string[] {
  return names.filter(
    (name) => typeof (globalThis as Record<string, unknown>)[name] !== 'undefined',
  );
}

/**
 * Next.js puts the page it chose inside the root layout and answers with one document, so the
 * scenario composes them the same way and reads the whole document she is sent.
 */
function whatTheSiteSends(): string {
  return renderToStaticMarkup(
    <RootLayout>
      <NotFound />
    </RootLayout>,
  );
}

defineFeature(feature, (test) => {
  test('a website scenario renders react in node', ({ given, when, then, and }) => {
    let address = '';
    let page = '';

    given('a woman opens an address myemi.app does not have', () => {
      address = '/suport';

      expect(address).not.toBe('/');
    });

    when('the site draws her page where the site draws every page', () => {
      page = whatTheSiteSends();
    });

    then('she reads that the page does not exist, and the way back to the Emi home page', () => {
      expect(page).toContain('This page does not exist');
      expect(page).toMatch(/<a[^>]*href="\/"[^>]*>[^<]*Emi[^<]*<\/a>/);
      expect(page).toMatch(/^<html lang="en">/);
    });

    and('no browser stood behind the page while it was drawn', () => {
      expect(standingInTheProcess(browserGlobals)).toEqual([]);
    });

    and('no phone stood behind it either', () => {
      expect(standingInTheProcess(phoneGlobals)).toEqual([]);
    });
  });
});
