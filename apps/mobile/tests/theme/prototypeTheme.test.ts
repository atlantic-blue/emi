import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { REM_IN_POINTS, type ColourName, colour, colourNames, typeRoleNames } from '@emi/tokens';
import { dockRoom } from '@emi/ui';

import { emiClasses } from '../../../../packages/ui/src/gluestack/emiClasses';
import { textStyle } from '../../../../packages/ui/src/gluestack/text/styles';
import {
  configuredIn,
  footRoomIn,
  supersededDirectory,
  supersededScreen,
} from '../../../../tools/pipeline/prototype';
import theme from '../../tailwind.config';
import { theCompiledTheme, theThemeWithEveryTextRole } from '../fixtures/theTheme';

/**
 * The application is drawn in the prototype's own Tailwind configuration, and the colours in it are
 * the token package's. Two files, one palette, and this is the test that keeps them one.
 *
 * The prototype's values are read out of the screen it renders with, through the reader the
 * pipeline already uses, so there is one reading of one file and nothing here restates a number.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

const prototype = configuredIn(
  readFileSync(join(repositoryRoot, supersededDirectory, supersededScreen), 'utf8'),
);

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
      expect(Object.keys(extended.colors).sort()).toEqual(Object.keys(prototype.colours).sort());
      expect(everyRole).toHaveLength(Object.keys(prototype.colours).length);
    });

    it('carries the prototype’s own values, so reading them from the tokens changed nothing', () => {
      const drifted = Object.entries(prototype.colours)
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
      expect(extended.borderRadius).toEqual(prototype.radii);
      expect(Object.keys(extended.borderRadius)).toHaveLength(4);
    });

    it('takes the spacing steps unrounded and unrenamed', () => {
      expect(extended.spacing).toEqual(prototype.spacing);
      expect(Object.keys(extended.spacing)).toHaveLength(7);
    });

    it('declares the eleven text roles itself rather than through Tailwind’s own scale', () => {
      // Given a size and a line height together, Tailwind writes the line height as a variable
      // fallback, which react-native-css reads as a multiple of the font size. So the roles are
      // written as plain declarations by a plugin and the values are asserted on what compiles.
      expect('fontSize' in extended).toBe(false);
      expect(Object.keys(prototype.type)).toHaveLength(11);
    });

    it('sets every role in the one face the design system names', () => {
      const faces = new Set(Object.values(extended.fontFamily).map((family) => family.join(', ')));

      expect([...faces]).toEqual(['Plus Jakarta Sans']);
      expect(Object.keys(extended.fontFamily)).toHaveLength(11);
    });
  });

  describe('what Tailwind compiles from it', () => {
    const compiled = theCompiledTheme();
    const everyRoleCompiled = theThemeWithEveryTextRole(Object.keys(prototype.type));

    it.each(Object.entries(prototype.type))(
      'writes %s at the size, the tracking and the weight the prototype gives it',
      (role, written) => {
        const rules = rulesFor(everyRoleCompiled, `.text-${role}`);

        expect(rules).toHaveLength(1);
        expect(rules[0]).toContain(`font-size: ${written.fontSize};`);
        expect(rules[0]).toContain(`font-weight: ${written.fontWeight};`);
        if (written.letterSpacing !== undefined) {
          expect(rules[0]).toContain(`letter-spacing: ${written.letterSpacing};`);
        }
      },
    );

    it.each(Object.entries(prototype.type))(
      'gives %s a line height in points rather than a variable a phone reads as a multiple',
      (role, written) => {
        const rule = rulesFor(everyRoleCompiled, `.text-${role}`).join(' ');

        // react-native-css reads a length inside a variable fallback as a multiple of the font
        // size, so `line-height: var(--tw-leading, 14px)` on eleven point text draws at 154.
        expect(rule).toContain(`line-height: ${written.lineHeight};`);
        expect(rule).not.toContain('var(--tw-leading');
      },
    );

    it('draws the capsule in the colour the prototype fills it with, at nine tenths', () => {
      expect(compiled).toContain(
        `.bg-surface-container-lowest\\/90 {\n  background-color: color-mix(in oklab, ${colour.surfaceContainerLowest} 90%, transparent);`,
      );
    });

    it('writes the corner and the margin the dock stands on', () => {
      expect(compiled).toContain(`.rounded-full {\n  border-radius: ${prototype.radii['full']};`);
      expect(compiled).toContain(`.px-margin {\n  padding-inline: ${prototype.spacing['margin']};`);
    });
  });
});

describe('the room the chrome leaves at the foot of a screen is the one the prototype writes', () => {
  const screens = readdirSync(join(repositoryRoot, supersededDirectory))
    .sort()
    .filter((file) => file.endsWith('.html'));

  /** What each screen of the prototype reserves, in points. */
  const reserved = screens.map((file) => ({
    file,
    points: footRoomIn(
      readFileSync(join(repositoryRoot, supersededDirectory, file), 'utf8'),
      REM_IN_POINTS,
    ),
  }));

  it('is the number the prototype writes, and not one typed beside the code', () => {
    // A comment saying a number came from somewhere agrees with the code whatever either one is
    // changed to. This reads the class off the screen and holds the constant against it.
    expect(reserved).not.toHaveLength(0);
    for (const screen of reserved) {
      expect([screen.file, dockRoom]).toEqual([screen.file, screen.points]);
    }
  });

  it('is the same on every screen of the prototype, so one of them speaks for the set', () => {
    expect(screens).toHaveLength(5);
    expect(new Set(reserved.map((screen) => screen.points)).size).toBe(1);
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
