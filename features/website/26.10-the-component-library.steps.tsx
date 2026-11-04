import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import {
  colour,
  colourNames,
  radius,
  space,
  typeScale,
  websiteColour,
  websiteColourNames,
  websiteFaceNames,
  websiteFontCuts,
  websiteFontFile,
  websiteFontsRoot,
} from '@emi/tokens';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import { servedFonts } from '../../apps/website/app/fonts';
import RootLayout from '../../apps/website/app/[lang]/layout';
import NotFound from '../../apps/website/app/[lang]/not-found';
import { SERVED_FACE_VARIABLES } from '../../apps/website/lib/face';
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
 * This site, written out whole. A page has to name its own host in the tags a chat reads, because
 * the chat reads them on its own server where a path points at the chat company instead. Naming
 * itself is not asking anybody for anything, so it comes out of the text before the search.
 */
const theSiteItself = 'https://myemi.app';

/**
 * The one address outside this site that a page is allowed to hold: the invite to the Emi
 * Community. A press is not a request, so a page that writes this down asks nobody for anything
 * until she decides to open it, and it comes out of the text before the search.
 *
 * The whole address and not the host. Any other address on the same chat is still refused, so this
 * stays one invite the operator chose rather than permission to reach that company.
 */
const theCommunitySheCanOpen = 'https://t.me/+89GgSCh6Ff85YTZk';

/**
 * The second, and the same argument: the code of Emi, which the page about the encryption invites
 * her to go and read. A press is not a request, and the whole address rather than the host, so
 * anything else on that company is still refused.
 */
const theCodeSheCanRead = 'https://github.com/atlantic-blue/emi';

function reachesAnotherCompany(source: string): boolean {
  const withoutWhatSheChose = [theSiteItself, theCommunitySheCanOpen, theCodeSheCanRead].reduce(
    (text, allowed) => text.split(allowed).join(''),
    source,
  );

  return (
    /https?:\/\//.test(withoutWhatSheChose) ||
    otherCompanies.some((host) => withoutWhatSheChose.includes(host))
  );
}

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
async function whatTheSiteSends(): Promise<string> {
  return renderToStaticMarkup(
    await RootLayout({ children: <NotFound />, params: Promise.resolve({ lang: 'en' }) }),
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
      page = await whatTheSiteSends();
      painted = await whatTheMarkupDraws(page);
      everyDeclaration = Object.values(painted).join(' ');
    });

    then('she reads what happened, and the way back to the Emi home page', () => {
      expect(page).toContain('This page does not exist');
      expect(page).toMatch(/<a[^>]*href="\/"[^>]*>[^<]*Emi[^<]*<\/a>/);
      expect(page).toContain('Atlantic Blue Solutions Limited.');
    });

    and('every colour she is shown is a colour the token package measured', () => {
      // Two palettes reach a page of the site: the phone's, and the one the approved board paints
      // the site itself in. Both are measured in the token package.
      const measured = new Set([
        ...colourNames.map((name) => colour[name].toLowerCase()),
        ...websiteColourNames.map((name) => websiteColour[name].toLowerCase()),
      ]);
      const shown = [...everyDeclaration.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(([value]) =>
        value.toLowerCase(),
      );

      expect(shown.length).toBeGreaterThan(0);
      expect(shown.filter((value) => !measured.has(value))).toEqual([]);
      expect(everyDeclaration).toContain(`background-color: ${websiteColour.siteGround}`);
      expect(everyDeclaration).toContain(`background-color: ${colour.card}`);
      expect(everyDeclaration).toContain(`background-color: ${colour.accent}`);
      expect(everyDeclaration).toContain(`color: ${colour.text}`);
      expect(everyDeclaration).toContain(`color: ${colour.onAccent}`);
    });

    and(
      'the words are set in the letters this site serves, and in no face from a font service',
      () => {
        expect(everyDeclaration).toContain(`font-family: var(${SERVED_FACE_VARIABLES.text})`);
        expect(fontLoaderCalls.map((call) => call.variable)).toEqual(
          websiteFaceNames.map((name) => SERVED_FACE_VARIABLES[name]),
        );
        expect(fontLoaderCalls.flatMap((call) => call.src.map((source) => source.path))).toEqual(
          websiteFaceNames.flatMap((name) =>
            websiteFontCuts[name].map((cut) => `../assets/fonts/${websiteFontFile(cut)}`),
          ),
        );

        for (const name of websiteFaceNames) {
          for (const cut of websiteFontCuts[name]) {
            expect(existsSync(join(repositoryRoot, websiteFontsRoot, websiteFontFile(cut)))).toBe(
              true,
            );
          }
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
      const written = new Set(servedFonts.map((font) => font.variable));
      const classes = Object.keys(painted).filter((name) => !written.has(name));
      const drawingNothing = classes.filter((name) => painted[name] === '');

      expect(classes.length).toBeGreaterThan(20);
      expect(drawingNothing).toEqual([]);
    });

    and('nothing of the site asks another company for a thing', () => {
      const built = everyFileAPageIsBuiltFrom();
      const readable = built.filter((file) => ['.ts', '.tsx', '.css'].includes(extname(file)));

      expect(readable.length).toBeGreaterThan(8);

      const reaching = readable.filter((file) => reachesAnotherCompany(readFileSync(file, 'utf8')));

      expect(reaching.map((file) => relative(repositoryRoot, file))).toEqual([]);

      // Letting the site name itself did not turn the search off: a face asked of anybody else is
      // still found, and so is a host nobody put on the list above.
      expect(reachesAnotherCompany(`the card points at ${theSiteItself}/share-preview.png`)).toBe(
        false,
      );
      expect(
        reachesAnotherCompany('@import url("https://fonts.googleapis.com/css2?family=Inter")'),
      ).toBe(true);
      expect(reachesAnotherCompany('fetch("http://someone-elses-host.example/count")')).toBe(true);

      // Letting her open the community did not open the chat company either. The one invite reads
      // clean and every other address on the same host is still refused.
      expect(reachesAnotherCompany(`she presses ${theCommunitySheCanOpen}`)).toBe(false);
      expect(reachesAnotherCompany('https://t.me/+somebody-elses-invite')).toBe(true);
      expect(reachesAnotherCompany('fetch("https://api.telegram.org/sendMessage")')).toBe(true);

      const typing = readable.filter((file) =>
        /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(file, 'utf8')),
      );

      expect(typing.map((file) => relative(repositoryRoot, file))).toEqual([]);
    });
  });
});
