import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  colour,
  websiteFaceNames,
  websiteFontCuts,
  websiteFontFile,
  websiteFontsRoot,
  websitePhoneWidth,
} from '@emi/tokens';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { renderToStaticMarkup } from 'react-dom/server';

import { servedFonts } from '../../apps/website/app/fonts';
import { wordsIn } from '../../apps/website/app/words';
import {
  SiteFooter,
  footerGroups,
  theGroupsOfTheBand,
  theTerms,
} from '../../apps/website/components/siteFooter';
import { ICON_FILE, SiteHeader, mainLinks } from '../../apps/website/components/siteHeader';
import { fontLoaderCalls } from '../../apps/website/test/doubles/nextFontLocal';
import { declarationsOf, stylesheetFor } from '../../apps/website/test/stylesheet';
import { moduleDirectory } from '../../infrastructure/modules/nextjs-site/tests/runArtifact';
import { approvedDenials, claimsIn } from '../../tools/pipeline/forbiddenClaims';
import { bodyOf, configurationOf, listedIn } from '../../tools/pipeline/policy';

const feature = loadFeature(
  join(__dirname, '26.19-the-approved-faces-the-header-and-the-footer.feature'),
);

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

/** The mark the community chose, as three files that have to be one drawing. */
const theIcon = {
  theSiteServes: join(websiteWorkspace, 'public', ICON_FILE),
  thePhoneShows: join(repositoryRoot, 'apps', 'mobile', 'assets', 'icon', 'emi-icon.svg'),
  theBoardDraws: join(
    repositoryRoot,
    'docs',
    'design',
    'website',
    'home-v2',
    'render',
    'assets',
    '2f3b95d653826b5ca02acab62e8534de.svg',
  ),
};

/** The drawing the community did not choose, which no part of the site may name any more. */
const theMarkNobodyChose = 'emi-wordmark.svg';

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

/** Every attribute of one element of the markup, found by a thing only that element carries. */
function theElementCarrying(markup: string, marker: string): string {
  const at = markup.indexOf(marker);

  expect(at).toBeGreaterThanOrEqual(0);

  return markup.slice(markup.lastIndexOf('<', at), markup.indexOf('>', at) + 1);
}

/** The drawing the band at the top of the page carries, as the markup she is sent. */
function thePictureIn(markup: string): string {
  return markup.slice(markup.indexOf('<svg'), markup.indexOf('</svg>') + '</svg>'.length);
}

/** Every outline of a drawing, in the order it is painted. */
function outlinesOf(drawing: string): string[] {
  return [...drawing.matchAll(/ d="([^"]+)"/g)].map(([, outline]) => outline ?? '');
}

/** What a drawing is painted on, which the file declares and the copy has to declare too. */
function canvasOf(drawing: string): string {
  return /viewBox="([^"]+)"/.exec(drawing)?.[1] ?? '';
}

/** The addresses of every link in a piece of markup, in the order a reader meets them. */
function linksIn(markup: string): { readonly address: string; readonly words: string }[] {
  return [...markup.matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map(
    ([, address, words]) => ({
      address: address ?? '',
      words: (words ?? '').replace(/<[^>]*>/g, ''),
    }),
  );
}

defineFeature(feature, (test) => {
  test('the header carries the approved icon', ({ given, then, and }) => {
    const words = wordsIn('en');
    let header = '';
    let footer = '';

    given('a woman opens myemi.app for the first time', () => {
      header = renderToStaticMarkup(<SiteHeader language="en" />);
      footer = renderToStaticMarkup(<SiteFooter language="en" />);

      expect(header).toContain('<header');
      expect(footer).toContain('<footer');
    });

    then(
      'the mark at the top of the page is the drawing the community chose, and the same drawing her phone will show her',
      () => {
        const shipped = read(theIcon.thePhoneShows);
        const drawn = thePictureIn(header);

        // Three files and one copy inside the page, held to one drawing. The file is served under
        // its own name as well, because a link somebody shares asks for the mark by name.
        expect(read(theIcon.theSiteServes)).toBe(shipped);
        expect(read(theIcon.theBoardDraws)).toBe(shipped);
        expect(ICON_FILE).toBe('/emi-icon.svg');

        expect(outlinesOf(shipped)).toHaveLength(2);
        expect(outlinesOf(drawn)).toEqual(outlinesOf(shipped));
        expect(canvasOf(drawn)).toBe(canvasOf(shipped));
        expect(drawn).toContain('transform="translate(0.3295 0.0856) scale(9.9934)"');
        expect(drawn).toContain(colour.accent);
        expect(drawn).toContain(colour.onAccent);
      },
    );

    and('her software reads that mark out to her as Emi', () => {
      expect(thePictureIn(header)).toContain('role="img"');
      expect(thePictureIn(header)).toContain('aria-label="Emi"');
      // A policy that names a secret for a style refuses one written on an element, so the band
      // writes none and whatever a style would have done still happens.
      expect(header).not.toContain('style=');
    });

    and(
      'she can follow the ways into the product whose page exists from the top of the page',
      () => {
        const main = header.slice(header.indexOf('<nav'), header.indexOf('</nav>'));

        expect(main).toContain(`aria-label="${words.headerMainLabel}"`);
        expect(linksIn(main)).toEqual([
          { address: '/en/', words: words.headerEmi },
          { address: '/en/privacy/', words: words.headerPrivacy },
        ]);

        // The band holds all six the board drew. Four of them wait for a page: the calculator, Pulse,
        // the till and support are each marked in the code, so each one is drawn again by taking one
        // line off its entry on the day its page ships.
        expect(mainLinks).toHaveLength(6);
        expect(
          mainLinks.filter((link) => link.waitsForItsPage === true).map((link) => link.path),
        ).toEqual(['calculator/', 'pulse/', 'buy/', 'support/']);

        for (const waiting of ['Calculator', 'Pulse', 'Buy', 'Support']) {
          expect({ waiting, drawn: main.includes(`>${waiting}</a>`) }).toEqual({
            waiting,
            drawn: false,
          });
        }
      },
    );

    and('on a phone those fold into one button she can press', async () => {
      const button = theElementCarrying(header, `aria-label="${words.headerMenuLabel}"`);
      const main = theElementCarrying(header, `aria-label="${words.headerMainLabel}"`);
      const stylesheet = await stylesheetFor([
        'phone:hidden',
        'phone:flex',
        'hidden',
        'flex',
        'h-[44px]',
        'w-[44px]',
      ]);
      const atThePhoneWidth = [...stylesheet.matchAll(/@media \(([^)]*)\) \{([^@]*)\}/g)].find(
        ([, , rules]) => (rules ?? '').includes('phone\\:'),
      );

      expect(main).toContain('phone:hidden');
      expect(button).toContain('phone:flex');
      expect(button).toContain('type="button"');
      expect(atThePhoneWidth?.[1]).toContain(`${websitePhoneWidth}px`);
      expect(declarationsOf(stylesheet, 'phone:hidden')).toContain('display: none');
      expect(declarationsOf(stylesheet, 'phone:flex')).toContain('display: flex');
      expect(declarationsOf(stylesheet, 'h-[44px]')).toBe('height: 44px;');
      expect(declarationsOf(stylesheet, 'w-[44px]')).toBe('width: 44px;');
    });

    and(
      'every word she reads is set in the three faces of the approved design, served by Emi itself',
      async () => {
        // Importing the loader is what asks it for the files, because it runs in the bundler, so
        // the three it built are read first and the calls it recorded second.
        expect(servedFonts.every((font) => font.variable.length > 0)).toBe(true);

        const asked = fontLoaderCalls.flatMap((call) =>
          call.src.map((source) => source.path.split('/').pop() ?? ''),
        );
        const wanted = websiteFaceNames.flatMap((name) =>
          websiteFontCuts[name].map((cut) => websiteFontFile(cut)),
        );
        const stylesheet = await stylesheetFor(websiteFaceNames.map((name) => `font-${name}`));

        expect(asked).toEqual(wanted);

        for (const file of wanted) {
          expect(readFileSync(join(repositoryRoot, websiteFontsRoot, file)).length).toBeGreaterThan(
            0,
          );
        }

        for (const name of websiteFaceNames) {
          expect(declarationsOf(stylesheet, `font-${name}`).length).toBeGreaterThan(0);
        }

        expect(read(join(websiteWorkspace, 'app', 'fonts.ts'))).not.toMatch(/https?:\/\//);
      },
    );

    and(
      'the foot of the page says what Emi is not, in words the honesty gate reads as a denial',
      () => {
        const [sentence] = words.footerDisclaimer.split('. ');
        const saidPlainly = `${sentence ?? ''}.`;

        expect(footer).toContain(words.footerDisclaimer);
        expect(approvedDenials).toContain(saidPlainly);
        expect(claimsIn('the footer', words.footerDisclaimer)).toEqual([]);
        expect(
          claimsIn('the footer', words.footerDisclaimer.replace(' is not a', ' is a')).length,
        ).toBeGreaterThan(0);
      },
    );

    and(
      'the foot of the page tells her where to get the application, how Emi protects her and how to reach somebody',
      () => {
        expect(footerGroups.map((group) => words[group.title])).toEqual([
          words.footerEmiGroup,
          words.footerPrivacyGroup,
          words.footerLearnGroup,
          words.footerHelpGroup,
        ]);

        // The group about learning offers the calculator, the guides and Pulse, and none of the
        // three pages exists, so the band draws neither it nor its heading. A heading over nothing
        // reads as a part of the page that failed to load.
        expect(theGroupsOfTheBand().map((group) => words[group.title])).toEqual([
          words.footerEmiGroup,
          words.footerPrivacyGroup,
          words.footerHelpGroup,
        ]);
        expect(footer).not.toContain(`aria-label="${words.footerLearnGroup}"`);

        for (const group of theGroupsOfTheBand()) {
          const whole = footer.slice(
            footer.indexOf(`aria-label="${words[group.title]}"`),
            footer.indexOf('</nav>', footer.indexOf(`aria-label="${words[group.title]}"`)),
          );

          expect(linksIn(whole).map((link) => link.words)).toEqual(
            group.links.map((link) => words[link.word]),
          );
        }

        for (const group of footerGroups) {
          expect(group.links).toHaveLength(3);
        }
      },
    );

    and(
      'the foot of the page names who she would be paying, and lets her read the page in her own language',
      () => {
        expect(footer).toContain(words.footerCopyright);
        expect(footer).toContain('Atlantic Blue Solutions Limited.');

        const legal = linksIn(footer.slice(footer.lastIndexOf('<div')));

        // The terms are the one press of the legal line that waits for its page, and the press is
        // drawn again by taking one line off its entry on the day that page ships.
        expect(legal.map((link) => link.words)).toEqual([
          words.footerPrivacyPolicy,
          'English',
          'Русский',
          'Español',
        ]);
        expect(theTerms.waitsForItsPage).toBe(true);
        expect(footer).not.toContain(`>${words.footerTerms}</a>`);
        expect(legal.slice(1).map((link) => link.address)).toEqual(['/en/', '/ru/', '/es/']);
      },
    );

    and('the mark the community did not choose has gone from the site', () => {
      const site = configurationOf(moduleDirectory);

      expect(header).not.toContain(theMarkNobodyChose);
      expect(footer).not.toContain(theMarkNobodyChose);
      expect(listedIn(bodyOf(site, 'locals'), 'asset_paths')).not.toContain(
        `/${theMarkNobodyChose}`,
      );
      expect(() => readFileSync(join(websiteWorkspace, 'public', theMarkNobodyChose))).toThrow();
      for (const file of ['siteHeader.tsx', 'siteFooter.tsx', 'emiIcon.tsx']) {
        expect(read(join(websiteWorkspace, 'components', file))).not.toContain(theMarkNobodyChose);
      }
    });
  });
});
