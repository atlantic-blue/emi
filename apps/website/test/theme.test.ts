import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  colour,
  colourNames,
  face,
  fontFile,
  fonts,
  fontsRoot,
  letterSpacingOf,
  radius,
  radiusNames,
  space,
  spaceNames,
  stroke,
  typeRoleNames,
  typeScale,
} from '@emi/tokens';

import { servedFont } from '../app/fonts';
import { SERVED_FACE_VARIABLE } from '../lib/face';
import { fontLoaderCalls } from './doubles/nextFontLocal';
import { declarationsOf, stylesheetFor, websiteWorkspace } from './stylesheet';

/**
 * Contract SITE-4. Every colour, face, size, gap and corner of myemi.app comes from
 * `packages/tokens`, and the theme is the one place that reads them.
 *
 * The cases below read what Tailwind writes rather than what the theme says, because a theme is a
 * claim and a rule is what a browser obeys.
 */

const repositoryRoot = join(websiteWorkspace, '..', '..');

const longEnoughToCompile = 60_000;

/** One compile for the whole file: every class the theme can draw, asked for at once. */
const everyClass = [
  ...colourNames.map((name) => `bg-${name}`),
  ...colourNames.map((name) => `text-${name}`),
  ...typeRoleNames.map((name) => `text-${name}`),
  ...spaceNames.map((name) => `p-${name}`),
  ...radiusNames.map((name) => (name === 'DEFAULT' ? 'rounded' : `rounded-${name}`)),
  ...Object.keys(stroke).map((name) => `h-${name}`),
  ...Object.keys(stroke).map((name) => `border-${name}`),
  'font-display',
  'font-text',
  'font-data',
  'bg-brandBlue',
  'p-brandGap',
];

let stylesheet = '';

beforeAll(async () => {
  stylesheet = await stylesheetFor(everyClass);
}, longEnoughToCompile);

describe('the palette of the site is the palette of the phone', () => {
  it.each([...colourNames])('draws %s at the value the token package holds', (name) => {
    expect(declarationsOf(stylesheet, `bg-${name}`)).toBe(`background-color: ${colour[name]};`);
  });

  it('draws no colour the token package never named', () => {
    expect(declarationsOf(stylesheet, 'bg-brandBlue')).toBe('');
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

describe('the faces the site draws in', () => {
  it.each(['display', 'text'] as const)('names the %s face the token package names', (name) => {
    const written = declarationsOf(stylesheet, `font-${name}`);

    expect(written).toContain(`var(${SERVED_FACE_VARIABLE})`);
    expect(written).toContain(face[name]);
  });

  it('names no face the site does not serve yet', () => {
    expect(declarationsOf(stylesheet, 'font-data')).toBe('');
  });

  it('asks the browser for the family the site serves before any family it may already hold', () => {
    const written = declarationsOf(stylesheet, 'font-text');

    expect(written.indexOf(SERVED_FACE_VARIABLE)).toBeLessThan(written.indexOf(face.text));
  });
});

describe('the files the site serves those faces from', () => {
  const asked = fontLoaderCalls[0];

  it('asked the bundler for exactly the Figtree cuts the token package ships', () => {
    expect(asked?.src.map((source) => source.path.split('/').pop())).toEqual(
      fonts.figtree.weights.map((weight) => fontFile('figtree', weight).path.split('/').pop()),
    );
  });

  it('asked for a file that is in this repository, for every cut', () => {
    for (const weight of fonts.figtree.weights) {
      expect(existsSync(join(repositoryRoot, fontsRoot, fontFile('figtree', weight).path))).toBe(
        true,
      );
    }
  });

  it('asked for each cut at the weight the token package gives it', () => {
    expect(asked?.src.map((source) => source.weight)).toEqual(
      fonts.figtree.weights.map((weight) => `${fontFile('figtree', weight).weight}`),
    );
  });

  it('names the same custom property the theme reads, which the loader refuses to be handed', () => {
    expect(asked?.variable).toBe(SERVED_FACE_VARIABLE);
  });

  it('names no font service, and no other host', () => {
    const source = readFileSync(join(websiteWorkspace, 'app', 'fonts.ts'), 'utf8');

    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toContain('next/font/google');
    expect(servedFont.variable.length).toBeGreaterThan(0);
  });
});

describe('the stylesheet the site serves', () => {
  const source = readFileSync(join(websiteWorkspace, 'app', 'globals.css'), 'utf8');

  it('holds no value of its own, because a value here is one no gate reads', () => {
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/\b\d+px\b/);
    expect(source).not.toContain(face.display);
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
