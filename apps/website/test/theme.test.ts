import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  colour,
  colourNames,
  letterSpacingOf,
  radius,
  radiusNames,
  space,
  spaceNames,
  stroke,
  typeRoleNames,
  typeScale,
  websiteColour,
  websiteColourNames,
  websiteColours,
  websiteFace,
  websiteFaceNames,
  websiteFaceStack,
  websiteFontCuts,
  websiteFontFile,
  websiteFontsRoot,
  websitePhoneWidth,
  websiteTabletWidth,
  CONTRAST_FLOOR,
  contrastRatio,
} from '@emi/tokens';

import { servedFonts } from '../app/fonts';
import { SERVED_FACE_VARIABLES } from '../lib/face';
import { fontLoaderCalls } from './doubles/nextFontLocal';
import { declarationsOf, stylesheetFor, websiteWorkspace } from './stylesheet';

/**
 * Contract SITE-4. Every colour, face, size, gap and corner of myemi.app comes from
 * `packages/tokens`, and the theme is the one place that reads them.
 *
 * The cases below read what Tailwind writes rather than what the theme says, because a theme is a
 * claim and a rule is what a browser obeys.
 *
 * Two palettes reach the theme. The phone's palette is `colour`, and the site has one of its own in
 * `websiteColour`, taken from the board the operator approved. They are two surfaces drawn in
 * different values, and one flat namespace carries both because every name of the site's own starts
 * with `site`.
 */

const repositoryRoot = join(websiteWorkspace, '..', '..');

const longEnoughToCompile = 60_000;

/**
 * The three names a Mac answers with its own interface face and every other machine answers with
 * nothing. The board asks for them ahead of the heading face, so the site asks for them too.
 */
const theFacesOnlyAMacHolds = ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display'];

/** One compile for the whole file: every class the theme can draw, asked for at once. */
const everyClass = [
  ...colourNames.map((name) => `bg-${name}`),
  ...colourNames.map((name) => `text-${name}`),
  ...websiteColourNames.map((name) => `bg-${name}`),
  ...websiteColourNames.map((name) => `text-${name}`),
  ...typeRoleNames.map((name) => `text-${name}`),
  ...spaceNames.map((name) => `p-${name}`),
  ...radiusNames.map((name) => (name === 'DEFAULT' ? 'rounded' : `rounded-${name}`)),
  ...Object.keys(stroke).map((name) => `h-${name}`),
  ...Object.keys(stroke).map((name) => `border-${name}`),
  'font-display',
  'font-text',
  'font-data',
  'phone:hidden',
  'tablet:hidden',
  'sm:flex',
  'bg-brandBlue',
  'p-brandGap',
];

let stylesheet = '';

beforeAll(async () => {
  stylesheet = await stylesheetFor(everyClass);
}, longEnoughToCompile);

describe('the palette of the phone reaches the site unchanged', () => {
  it.each([...colourNames])('draws %s at the value the token package holds', (name) => {
    expect(declarationsOf(stylesheet, `bg-${name}`)).toBe(`background-color: ${colour[name]};`);
  });

  it('draws no colour the token package never named', () => {
    expect(declarationsOf(stylesheet, 'bg-brandBlue')).toBe('');
  });
});

describe('the palette the approved board paints the site in', () => {
  it.each([...websiteColourNames])('draws %s at the value the board paints', (name) => {
    expect(declarationsOf(stylesheet, `bg-${name}`)).toBe(
      `background-color: ${websiteColour[name]};`,
    );
  });

  it('names every colour of its own apart, so neither palette answers for the other', () => {
    expect(websiteColourNames.filter((name) => (colourNames as string[]).includes(name))).toEqual(
      [],
    );
    expect(websiteColourNames.every((name) => name.startsWith('site'))).toBe(true);
  });

  // Contract TOKEN-2. A text colour whose ground nobody measured is the drift this exists to stop,
  // so the ground is declared beside the value and the ratio is read here rather than approved by
  // eye on a board.
  it.each([...websiteColourNames])('says which grounds %s may carry text on', (name) => {
    const token = websiteColours[name];

    if (!token.roles.includes('text')) {
      expect(token.textOn).toEqual([]);

      return;
    }

    expect(token.textOn.length).toBeGreaterThan(0);

    for (const ground of token.textOn) {
      expect(websiteColours[ground].roles).toContain('ground');
      expect(contrastRatio(token.value, websiteColour[ground])).toBeGreaterThanOrEqual(
        CONTRAST_FLOOR,
      );
    }
  });
});

describe('the type of the site is the type scale of the design system', () => {
  it.each([...typeRoleNames])('writes %s at its size, line height, tracking and weight', (name) => {
    const role = typeScale[name];
    const written = declarationsOf(stylesheet, `text-${name}`);

    expect(written).toContain(`font-size: ${role.size}px`);
    expect(written).toContain(`${role.lineHeight}px`);
    expect(written).toContain(`${letterSpacingOf(role.size, role.letterSpacingEm)}px`);
    expect(written).toContain(`${role.weight}`);
  });
});

describe('the gaps, the corners and the strokes', () => {
  it.each([...spaceNames])('pads by %s at the step the design system names', (name) => {
    expect(declarationsOf(stylesheet, `p-${name}`)).toBe(`padding: ${space[name]}px;`);
  });

  it('pads by no step the design system never named', () => {
    expect(declarationsOf(stylesheet, 'p-brandGap')).toBe('');
  });

  it.each([...radiusNames])('rounds %s to the corner the design system names', (name) => {
    const className = name === 'DEFAULT' ? 'rounded' : `rounded-${name}`;

    expect(declarationsOf(stylesheet, className)).toBe(`border-radius: ${radius[name]}px;`);
  });

  it.each(Object.keys(stroke))('draws the %s stroke at its own width', (name) => {
    const width = stroke[name as keyof typeof stroke];

    expect(declarationsOf(stylesheet, `h-${name}`)).toBe(`height: ${width}px;`);
    expect(declarationsOf(stylesheet, `border-${name}`)).toContain(`border-width: ${width}px`);
  });
});

describe('the two widths the board changes the shape of a band at', () => {
  function queryHolding(prefix: string): { query: string; at: number } {
    const blocks = [...stylesheet.matchAll(/@media \(([^)]*)\) \{([^@]*)\}/g)];
    const found = blocks.find(([, , rules]) => (rules ?? '').includes(`${prefix}\\:`));

    if (found === undefined) {
      throw new Error(`No media query of the stylesheet carries a ${prefix} class.`);
    }

    return { query: found[1] ?? '', at: found.index ?? -1 };
  }

  it('reaches a browser as two widths of its own, and keeps the ones Tailwind ships', () => {
    expect(queryHolding('phone').query).toContain(`${websitePhoneWidth}px`);
    expect(queryHolding('tablet').query).toContain(`${websiteTabletWidth}px`);
    expect(declarationsOf(stylesheet, 'phone:hidden')).toContain('display: none');
    expect(declarationsOf(stylesheet, 'tablet:hidden')).toContain('display: none');
    expect(declarationsOf(stylesheet, 'sm:flex')).toContain('display: flex');
  });

  /**
   * At the width of a phone both queries match, so the one that comes last is the one a browser
   * obeys. The narrower width has to be that one, or a band on a phone draws the shape the board
   * gives a tablet.
   */
  it('writes the narrower width after the wider one, so the narrower one wins', () => {
    expect(queryHolding('phone').at).toBeGreaterThan(queryHolding('tablet').at);
  });
});

describe('the faces the site draws in', () => {
  it.each([...websiteFaceNames])('names the %s face of the board', (name) => {
    const written = declarationsOf(stylesheet, `font-${name}`);

    expect(written).toContain(`var(${SERVED_FACE_VARIABLES[name]})`);
    expect(written).toContain(websiteFace[name]);
  });

  it.each([...websiteFaceNames])(
    'asks for the family the site serves before any family a browser may already hold, for %s',
    (name) => {
      const written = declarationsOf(stylesheet, `font-${name}`);

      expect(written.indexOf(SERVED_FACE_VARIABLES[name])).toBeLessThan(
        written.indexOf(websiteFace[name]),
      );
    },
  );

  it('writes a family of more than one word quoted, or a browser reads each word as a family', () => {
    const written = declarationsOf(stylesheet, 'font-text');

    expect(websiteFace.text).toContain(' ');
    expect(written).toContain(`"${websiteFace.text}"`);
  });

  /**
   * The roles, written out. Three come from the home board. The fourth is the serif the board of
   * the page that explains the encryption sets its headings in, and only that page names it, so a
   * fifth role here is a face the site started serving that no board asked for.
   */
  it('draws the four the boards name and no fifth', () => {
    expect([...websiteFaceNames]).toEqual(['display', 'text', 'data', 'serif']);
  });
});

describe('the files the site serves those faces from', () => {
  it('asked the bundler for exactly the cuts the token package names, in their order', () => {
    expect(fontLoaderCalls.flatMap((call) => call.src.map((source) => source.path))).toEqual(
      websiteFaceNames.flatMap((name) =>
        websiteFontCuts[name].map((cut) => `../assets/fonts/${websiteFontFile(cut)}`),
      ),
    );
  });

  it('asked for a file that is in this repository, for every cut', () => {
    for (const name of websiteFaceNames) {
      for (const cut of websiteFontCuts[name]) {
        expect(existsSync(join(repositoryRoot, websiteFontsRoot, websiteFontFile(cut)))).toBe(true);
      }
    }
  });

  it('asked for each cut at the weight the token package gives it', () => {
    expect(fontLoaderCalls.flatMap((call) => call.src.map((source) => source.weight))).toEqual(
      websiteFaceNames.flatMap((name) => websiteFontCuts[name].map((cut) => `${cut.weight}`)),
    );
  });

  it('names the same custom property the theme reads, which the loader refuses to be handed', () => {
    expect(fontLoaderCalls.map((call) => call.variable)).toEqual(
      websiteFaceNames.map((name) => SERVED_FACE_VARIABLES[name]),
    );
  });

  it('names no font service, and no other host', () => {
    const source = readFileSync(join(websiteWorkspace, 'app', 'fonts.ts'), 'utf8');

    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toContain('next/font/google');
    expect(servedFonts.every((font) => font.variable.length > 0)).toBe(true);
  });
});

describe('the families each role asks a browser for', () => {
  it.each([...websiteFaceNames])('writes the board’s own list for %s, in its order', (name) => {
    const written = declarationsOf(stylesheet, `font-${name}`);
    const asked = /font-family:\s*([^;]+);/.exec(written)?.[1] ?? '';

    const named = asked
      .split(',')
      .map((family) => family.trim().replace(/^"|"$/g, ''))
      .filter((family) => !family.startsWith('var('));

    expect(named).toEqual([...websiteFaceStack[name]]);
  });

  /**
   * A heading on a Mac is drawn in Apple's own interface face, which the board asks for first and
   * which no licence lets Emi ship. Those are the only families allowed in front of the served one,
   * and they are allowed because a face a machine already holds asks nobody for a file. A family
   * from a font service in that position would be a request to another company.
   */
  it.each([...websiteFaceNames])(
    'puts only a face a machine already holds in front of the served one, for %s',
    (name) => {
      const stack = websiteFaceStack[name];
      const ahead = stack.slice(0, stack.indexOf(websiteFace[name]));

      expect(stack).toContain(websiteFace[name]);
      expect(ahead).toEqual(name === 'display' ? theFacesOnlyAMacHolds : []);
    },
  );
});

describe('the stylesheet the site serves', () => {
  const source = readFileSync(join(websiteWorkspace, 'app', 'globals.css'), 'utf8');

  it('holds no value of its own, because a value here is one no gate reads', () => {
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/\b\d+px\b/);
    expect(source).not.toContain(websiteFace.display);
  });

  it('names the theme, which is where the values come from', () => {
    expect(source).toContain('tailwind.config.ts');
  });
});

describe('the shadcn command', () => {
  const settings = JSON.parse(readFileSync(join(websiteWorkspace, 'components.json'), 'utf8')) as {
    tailwind?: { config?: string; css?: string };
    aliases?: Record<string, string>;
  };

  it('is pointed at this theme and this stylesheet, so a component it adds draws in the tokens', () => {
    expect(settings.tailwind?.config).toBe('tailwind.config.ts');
    expect(settings.tailwind?.css).toBe('app/globals.css');
  });

  it('writes an import the runners resolve', () => {
    expect(settings.aliases?.ui).toBe('@/components/ui');
    expect(existsSync(join(websiteWorkspace, 'components', 'ui'))).toBe(true);
  });
});
