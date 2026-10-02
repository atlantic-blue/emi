import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

import {
  type ColourName,
  colour,
  colourNames,
  fontFiles,
  fontNameFor,
  letterSpacingOf,
  radius,
  radiusNames,
  space,
  spaceNames,
  typeRoleNames,
  typeScale,
} from '@emi/tokens';

import { emiClasses } from '../../../../packages/ui/src/gluestack/emiClasses';
import { textStyle } from '../../../../packages/ui/src/gluestack/text/styles';
import { phaseColourNames } from '../../../../tools/pipeline/prototype';
import theme from '../../tailwind.config';
import { theCompiledTheme, theThemeWithEveryTextRole } from '../fixtures/theTheme';

/**
 * The application is drawn in a Tailwind configuration, and every value in it is the token
 * package's. Two files, one design system, and this is the test that keeps them one.
 *
 * The tokens are held to the front matter of the design system document by
 * `packages/tokens/tests/designSystem.test.ts`, and that front matter is read out of the prototype
 * itself. So nothing here restates a measurement: it reads the configuration against the tokens
 * and lets that chain carry the rest.
 *
 * The redesign prototype writes every value into the markup it paints, so there is no
 * configuration of its own to compare with. The front matter is the one place a value is
 * written, and `tools/pipeline/prototype.test.ts` holds it to the screens colour by colour.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

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

describe('the theme the application draws in is the token package, in the shape Tailwind reads', () => {
  describe('one palette, read from @emi/tokens', () => {
    it.each(everyRole)('%s is the same colour in the configuration as in the tokens', (name) => {
      const role = hyphenated(name);

      // The four phase fills and the four inks are drawn inside the ring rather than configured,
      // so the configuration names neither them nor a colour in their place.
      if (phaseColourNames.includes(role)) {
        expect(extended.colors[role]).toBeUndefined();
        return;
      }

      expect(extended.colors[role]).toBe(colour[name]);
    });

    it('names every role of the token package but the eight the ring draws itself', () => {
      const configured = Object.keys(extended.colors).sort();

      expect(configured).toEqual(
        everyRole
          .map(hyphenated)
          .filter((role) => !phaseColourNames.includes(role))
          .sort(),
      );
      expect(configured.length).toBeGreaterThan(20);
    });

    it('leaves the eight out, because the ring reads them from the tokens and draws them itself', () => {
      const unconfigured = everyRole
        .map(hyphenated)
        .filter((role) => extended.colors[role] === undefined);

      expect(unconfigured.sort()).toEqual([...phaseColourNames].sort());
    });

    it('holds no hex code of its own, because the palette has one home', () => {
      const configuration = readFileSync(
        join(repositoryRoot, 'apps/mobile/tailwind.config.js'),
        'utf8',
      );

      expect(configuration).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });
  });

  describe('the corners, the spacing and the faces are the tokens too', () => {
    it('takes all seven corners, at the scale the front matter names', () => {
      expect(extended.borderRadius).toEqual(
        Object.fromEntries(radiusNames.map((name) => [name, `${String(radius[name])}px`])),
      );
      expect(Object.keys(extended.borderRadius)).toHaveLength(7);
    });

    it('takes all eight spacing steps, under the names Tailwind writes them with', () => {
      expect(extended.spacing).toEqual(
        Object.fromEntries(
          spaceNames.map((name) => [hyphenated(name), `${String(space[name])}px`]),
        ),
      );
      expect(Object.keys(extended.spacing)).toHaveLength(8);
    });

    it('declares the fifteen text roles itself rather than through Tailwind’s own scale', () => {
      // Given a size and a line height together, Tailwind writes the line height as a variable
      // fallback, which react-native-css reads as a multiple of the font size. So the roles are
      // written as plain declarations by a plugin and the values are asserted on what compiles.
      expect('fontSize' in extended).toBe(false);
      expect(typeRoleNames).toHaveLength(15);
    });

    it('sets every role in the file the application registers, never in the family’s own name', () => {
      expect(extended.fontFamily).toEqual(
        Object.fromEntries(
          typeRoleNames.map((role) => [
            role,
            [fontNameFor(typeScale[role].face, typeScale[role].weight)],
          ]),
        ),
      );

      // A role that named the design's own family would draw in none of the files that ship, so
      // every name here is one of the six the application registers.
      const registered = new Set(fontFiles.map((file) => file.name));
      const named = Object.values(extended.fontFamily).flat();

      expect(named.filter((family) => !registered.has(family))).toEqual([]);
    });
  });

  describe('what Tailwind compiles from it', () => {
    const compiled = theCompiledTheme();
    const everyRoleCompiled = theThemeWithEveryTextRole([...typeRoleNames]);

    it.each([...typeRoleNames])(
      'writes %s at the size, the tracking and the weight the tokens give it',
      (role) => {
        const step = typeScale[role];
        const rules = rulesFor(everyRoleCompiled, `.text-${role}`);
        const tracking = letterSpacingOf(step.size, step.letterSpacingEm);

        expect(rules).toHaveLength(1);
        expect(rules[0]).toContain(`font-size: ${String(step.size)}px;`);
        expect(rules[0]).toContain(`font-weight: ${String(step.weight)};`);
        if (tracking !== 0) {
          expect(rules[0]).toContain(`letter-spacing: ${String(tracking)}px;`);
        }
      },
    );

    it.each([...typeRoleNames])(
      'gives %s a line height in points rather than a variable a phone reads as a multiple',
      (role) => {
        const rule = rulesFor(everyRoleCompiled, `.text-${role}`).join(' ');

        // react-native-css reads a length inside a variable fallback as a multiple of the font
        // size, so `line-height: var(--tw-leading, 14px)` on eleven point text draws at 154.
        expect(rule).toContain(`line-height: ${String(typeScale[role].lineHeight)}px;`);
        expect(rule).not.toContain('var(--tw-leading');
      },
    );

    it('draws the dock on the card ground, at the corner every container takes', () => {
      expect(compiled).toContain(`.bg-card {\n  background-color: ${colour.card};`);
      expect(compiled).toContain(`.rounded-xl {\n  border-radius: ${String(radius.xl)}px;`);
      expect(compiled).toContain(`.border-line {\n  border-color: ${colour.line};`);
    });

    it('pads the dock by the screen margin rather than by the rhythm gap, and names its face', () => {
      expect(compiled).toContain(`.px-margin {\n  padding-inline: ${String(space.margin)}px;`);
      expect(compiled).not.toContain(`.px-margin {\n  padding-inline: ${String(space.spaceMd)}px;`);
      expect(compiled).toContain(
        `.font-label-sm {\n  font-family: ${fontNameFor(typeScale['label-sm'].face, typeScale['label-sm'].weight)};`,
      );
    });
  });
});

describe('the class merge in @emi/ui knows the scale it is merging', () => {
  it('keeps the text role when a colour follows it, because both are spelled text', () => {
    // gluestack merges what a caller passes with what a component carries, and the merge drops the
    // earlier of two classes it reads as the same property. Untaught, it reads text-label-sm and
    // text-accent as one, keeps the colour, and every word in the product loses its size.
    expect(textStyle({ class: 'text-label-sm text-accent' })).toContain('text-label-sm');
    expect(textStyle({ class: 'text-label-sm text-accent' })).toContain('text-accent');
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
