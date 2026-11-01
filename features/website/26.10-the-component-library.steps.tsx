import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import {
  colour,
  colourNames,
  fontFile,
  fonts,
  fontsRoot,
  radius,
  space,
  typeScale,
} from '@emi/tokens';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import { servedFont } from '../../apps/website/app/fonts';
import RootLayout from '../../apps/website/app/layout';
import NotFound from '../../apps/website/app/not-found';
import { SERVED_FACE_VARIABLE } from '../../apps/website/lib/face';
import { fontLoaderCalls } from '../../apps/website/test/doubles/nextFontLocal';
import { whatTheMarkupDraws } from '../../apps/website/test/stylesheet';

const feature = loadFeature(join(__dirname, '26.10-the-component-library.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');
const website = join(repositoryRoot, 'apps', 'website');

/** The companies a page must never ask for a face, or for anything else. */
const otherCompanies: readonly string[] = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'fonts.bunny.net',
  'use.typekit.net',
  'cdn.jsdelivr.net',
  'unpkg.com',
];

/**
 * What a page is built from, which is what reaches her browser. The settings of the command that
 * adds a component name its own schema, and no page is built from them.
 */
const whatAPageIsBuiltFrom = ['app', 'components', 'lib', 'tailwind.config.ts'];

/** Every file under a path, or the path itself when it is one file. */
function filesUnder(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  if (!statSync(path).isDirectory()) {
    return [path];
  }

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    filesUnder(join(path, entry.name)),
  );
}

function everyFileAPageIsBuiltFrom(): string[] {
  return whatAPageIsBuiltFrom.flatMap((name) => filesUnder(join(website, name)));
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
  test('the website components draw in the emi tokens', ({ given, when, then, and }) => {
    let address = '';
    let page = '';
    let painted: Readonly<Record<string, string>> = {};
    let everyDeclaration = '';

    given('a woman opens an address myemi.app does not have', () => {
      address = '/suport';

      expect(address).not.toBe('/');
    });

    when('the site draws her page', async () => {
      page = whatTheSiteSends();
      painted = await whatTheMarkupDraws(page);
      everyDeclaration = Object.values(painted).join(' ');
    });

    then('she reads what happened, and the way back to the Emi home page', () => {
      expect(page).toContain('This page does not exist');
      expect(page).toMatch(/<a[^>]*href="\/"[^>]*>[^<]*Emi[^<]*<\/a>/);
      expect(page).toContain('Emi is made by Atlantic Blue Solutions Limited.');
    });

    and('every colour she is shown is a colour the token package measured', () => {
      const measured = new Set(colourNames.map((name) => colour[name].toLowerCase()));
      const shown = [...everyDeclaration.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(([value]) =>
        value.toLowerCase(),
      );

      expect(shown.length).toBeGreaterThan(0);
      expect(shown.filter((value) => !measured.has(value))).toEqual([]);
      expect(everyDeclaration).toContain(`background-color: ${colour.ground}`);
      expect(everyDeclaration).toContain(`background-color: ${colour.card}`);
      expect(everyDeclaration).toContain(`background-color: ${colour.accent}`);
      expect(everyDeclaration).toContain(`color: ${colour.text}`);
      expect(everyDeclaration).toContain(`color: ${colour.onAccent}`);
    });

    and(
      'the words are set in the letters this site serves, and in no face from a font service',
      () => {
        const asked = fontLoaderCalls[0];

        expect(everyDeclaration).toContain(`font-family: var(${SERVED_FACE_VARIABLE})`);
        expect(asked?.variable).toBe(SERVED_FACE_VARIABLE);
        expect(asked?.src.map((source) => source.path.split('/').pop())).toEqual(
          fonts.figtree.weights.map((weight) => fontFile('figtree', weight).path.split('/').pop()),
        );

        for (const weight of fonts.figtree.weights) {
          expect(
            existsSync(join(repositoryRoot, fontsRoot, fontFile('figtree', weight).path)),
          ).toBe(true);
        }
      },
    );

    and('the gaps, the corners and the sizes are the ones the design system names', () => {
      expect(everyDeclaration).toContain(`padding-inline: ${space.margin}px`);
      expect(everyDeclaration).toContain(`padding: ${space.margin}px`);
      expect(everyDeclaration).toContain(`border-radius: ${radius.full}px`);
      expect(everyDeclaration).toContain(`border-radius: ${radius.xxl}px`);
      expect(everyDeclaration).toContain(`font-size: ${typeScale['headline-lg'].size}px`);
      expect(everyDeclaration).toContain(`min-height: ${space.marginLg}px`);

      // The font loader writes a class of its own, which is the one class on the page Tailwind
      // never saw. Every other class she is sent must be a word the theme gave a value, or the
      // page is asking the browser for something nobody chose.
      const classes = Object.keys(painted).filter((name) => name !== servedFont.variable);
      const drawingNothing = classes.filter((name) => painted[name] === '');

      expect(classes.length).toBeGreaterThan(20);
      expect(drawingNothing).toEqual([]);
    });

    and('nothing of the site asks another company for a thing', () => {
      const built = everyFileAPageIsBuiltFrom();
      const readable = built.filter((file) => ['.ts', '.tsx', '.css'].includes(extname(file)));

      expect(readable.length).toBeGreaterThan(8);

      const reaching = readable.filter((file) => {
        const source = readFileSync(file, 'utf8');

        return /https?:\/\//.test(source) || otherCompanies.some((host) => source.includes(host));
      });

      expect(reaching.map((file) => relative(repositoryRoot, file))).toEqual([]);

      const typing = readable.filter((file) =>
        /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(file, 'utf8')),
      );

      expect(typing.map((file) => relative(repositoryRoot, file))).toEqual([]);
    });
  });
});
