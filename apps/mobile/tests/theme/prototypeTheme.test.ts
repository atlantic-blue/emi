import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { type ColourName, colour, colourNames, typeRoleNames } from '@emi/tokens';

import { emiClasses } from '../../../../packages/ui/src/gluestack/emiClasses';
import { textStyle } from '../../../../packages/ui/src/gluestack/text/styles';

import theme from '../../tailwind.config';
import { theCompiledTheme, theThemeWithEveryTextRole } from '../fixtures/theTheme';

/**
 * The application is drawn in the prototype's own Tailwind configuration, and the colours in it are
 * the token package's. Two files, one palette, and this is the test that keeps them one.
 *
 * `docs/design/prototype-tailwind-config.json` is the configuration the prototype renders with,
 * copied in whole. Everything but the colours is read straight out of it, so a radius or a text
 * size cannot drift from the prototype without this failing.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

const prototype = JSON.parse(
  readFileSync(join(repositoryRoot, 'docs/design/prototype-tailwind-config.json'), 'utf8'),
) as {
  theme: {
    extend: {
      colors: Readonly<Record<string, string>>;
      borderRadius: Readonly<Record<string, string>>;
      spacing: Readonly<Record<string, string>>;
      fontSize: Readonly<Record<string, readonly [string, Readonly<Record<string, string>>]>>;
      fontFamily: Readonly<Record<string, readonly string[]>>;
    };
  };
};

const extended = theme.theme.extend;

/** The design system names a colour in camel case, and Tailwind names the same role with hyphens. */
function hyphenated(name: string): string {
  return name.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);
}

const everyRole: readonly ColourName[] = colourNames;

/** Every rule Tailwind wrote for one class, because a utility can be written more than once. */
function rulesFor(compiled: string, selector: string): string[] {
  return [...compiled.matchAll(new RegExp(`\\${selector} \\{([^}]*)\\}`, 'g'))].map(
    (found) => found[1] ?? '',
  );
}

describe('the theme the application draws in is the prototype, and its palette is the token package', () => {
  describe('one palette, read from @emi/tokens', () => {
    it.each(everyRole)('%s is the same colour in the configuration as in the tokens', (name) => {
      const role = hyphenated(name);

      expect(extended.colors[role]).toBe(colour[name]);
    });

    it('names every role the prototype names, and no role it does not', () => {
      expect(Object.keys(extended.colors).sort()).toEqual(
        Object.keys(prototype.theme.extend.colors).sort(),
      );
      expect(everyRole).toHaveLength(Object.keys(prototype.theme.extend.colors).length);
    });

    it('carries the prototype’s own values, so reading them from the tokens changed nothing', () => {
      const drifted = Object.entries(prototype.theme.extend.colors)
        .filter(([role, value]) => extended.colors[role]?.toLowerCase() !== value.toLowerCase())
        .map(([role]) => role);

      expect(drifted).toEqual([]);
    });

    it('holds no hex code of its own, because the palette has one home', () => {
      const configuration = readFileSync(
        join(repositoryRoot, 'apps/mobile/tailwind.config.js'),
        'utf8',
      );

      expect(configuration).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });
  });

  describe('everything else is the prototype, value for value', () => {
    it('takes the radii unrounded and unrenamed', () => {
      expect(extended.borderRadius).toEqual(prototype.theme.extend.borderRadius);
    });

    it('takes the spacing steps unrounded and unrenamed', () => {
      expect(extended.spacing).toEqual(prototype.theme.extend.spacing);
    });

    it('declares the eleven text roles itself rather than through Tailwind’s own scale', () => {
      // Given a size and a line height together, Tailwind writes the line height as a variable
      // fallback, which react-native-css reads as a multiple of the font size. So the roles are
      // written as plain declarations by a plugin and the values are asserted on what compiles.
      expect('fontSize' in extended).toBe(false);
      expect(Object.keys(prototype.theme.extend.fontSize)).toHaveLength(11);
    });

    it('sets every role in the one face the design system names', () => {
      expect(extended.fontFamily).toEqual(prototype.theme.extend.fontFamily);
    });
  });

  describe('what Tailwind compiles from it', () => {
    const compiled = theCompiledTheme();
    const everyRoleCompiled = theThemeWithEveryTextRole(
      Object.keys(prototype.theme.extend.fontSize),
    );

    it.each(Object.entries(prototype.theme.extend.fontSize))(
      'writes %s at the size, the line height, the tracking and the weight the prototype gives it',
      (role, [size, rest]) => {
        const written = rulesFor(everyRoleCompiled, `.text-${role}`);

        expect(written).toHaveLength(1);
        expect(written[0]).toContain(`font-size: ${size};`);
        expect(written[0]).toContain(`font-weight: ${rest.fontWeight};`);
        if (rest.letterSpacing !== undefined) {
          expect(written[0]).toContain(`letter-spacing: ${rest.letterSpacing};`);
        }
      },
    );

    it.each(Object.entries(prototype.theme.extend.fontSize))(
      'gives %s a line height in points rather than a variable a phone reads as a multiple',
      (role, [, rest]) => {
        const written = rulesFor(everyRoleCompiled, `.text-${role}`).join(' ');

        // react-native-css reads a length inside a variable fallback as a multiple of the font
        // size, so `line-height: var(--tw-leading, 14px)` on eleven point text draws at 154.
        expect(written).toContain(`line-height: ${rest.lineHeight};`);
        expect(written).not.toContain('var(--tw-leading');
      },
    );

    it('draws the capsule in the colour the prototype fills it with, at nine tenths', () => {
      expect(compiled).toContain(
        `.bg-surface-container-lowest\\/90 {\n  background-color: color-mix(in oklab, ${colour.surfaceContainerLowest} 90%, transparent);`,
      );
    });
  });
});

describe('the class merge in @emi/ui knows the scale it is merging', () => {
  it('keeps the text role when a colour follows it, because both are spelled text', () => {
    // gluestack merges what a caller passes with what a component carries, and the merge drops the
    // earlier of two classes it reads as the same property. Untaught, it reads text-label-sm and
    // text-primary as one, keeps the colour, and every word in the product loses its size.
    expect(textStyle({ class: 'text-label-sm text-primary' })).toContain('text-label-sm');
    expect(textStyle({ class: 'text-label-sm text-primary' })).toContain('text-primary');
  });

  it('still drops a second size, because two sizes on one word is a mistake', () => {
    const merged = textStyle({ class: 'text-body-lg text-label-sm' });

    expect(merged).toContain('text-label-sm');
    expect(merged).not.toContain('text-body-lg');
  });

  it('names every role and every colour the token package holds', () => {
    expect(emiClasses.classGroups['font-size'][0]?.text).toEqual([...typeRoleNames]);
    expect(emiClasses.classGroups['text-color'][0]?.text).toHaveLength(colourNames.length);
  });
});
