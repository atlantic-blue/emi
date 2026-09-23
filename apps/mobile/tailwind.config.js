const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const {
  colour,
  fontNameFor,
  letterSpacingOf,
  radius,
  space,
  typeRoleNames,
  typeScale,
} = require('@emi/tokens');

const plugin = require('tailwindcss/plugin');

const {
  configuredIn,
  prototypeDirectory,
  sourceScreen,
} = require('../../tools/pipeline/prototype.ts');

/**
 * The theme the application is drawn in, read from @emi/tokens.
 *
 * The token package is held to the front matter of `docs/design/prototype-design-system.md` value
 * for value by `packages/tokens/tests/designSystem.test.ts`, and that front matter is read out of
 * the prototype itself. So the palette, the scale, the corners and the spacing have one home, and
 * this file converts them into the shape Tailwind reads rather than restating any of them.
 *
 * The corners are the one block where the front matter and the prototype's own configuration
 * disagree, and the front matter is the side the tokens took, which is the decision in
 * https://github.com/atlantic-blue/emi/issues/159.
 *
 * The roles the palette is allowed to name are still read from the prototype, so a colour the
 * screens draw with and the token package does not hold stops the build here.
 */

const repositoryRoot = join(__dirname, '..', '..');

const prototype = configuredIn(
  readFileSync(join(repositoryRoot, prototypeDirectory, sourceScreen), 'utf8'),
);

function hyphenated(name) {
  return name.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);
}

function points(measured) {
  return `${String(measured)}px`;
}

const byRole = Object.fromEntries(
  Object.entries(colour).map(([name, value]) => [hyphenated(name), value]),
);

/** A colour the prototype draws with and the token package does not hold stops the build here. */
const colors = Object.fromEntries(
  Object.keys(prototype.colours).map((role) => {
    const value = byRole[role];

    if (value === undefined) {
      throw new Error(`the prototype names the colour ${role} and @emi/tokens does not hold it`);
    }

    return [role, value];
  }),
);

const borderRadius = Object.fromEntries(
  Object.entries(radius).map(([name, measured]) => [name, points(measured)]),
);

const spacing = Object.fromEntries(
  Object.entries(space).map(([name, measured]) => [hyphenated(name), points(measured)]),
);

/** Every role draws in the file the application registers, never in the family the design calls it. */
const fontFamily = Object.fromEntries(
  typeRoleNames.map((role) => [role, [fontNameFor(typeScale[role].face, typeScale[role].weight)]]),
);

/**
 * The thirteen text roles, written as plain declarations.
 *
 * Given a size and a line height together, Tailwind writes `line-height: var(--tw-leading, 14px)`,
 * and react-native-css 3.1.0-rc.0 reads a length inside a variable fallback as a multiple of the
 * font size, so eleven point text draws at 154 points instead of 14. A length it reads directly is
 * correct, so the roles are declared here rather than under `theme.extend.fontSize`.
 */
const textRoles = plugin(({ addUtilities }) => {
  addUtilities(
    Object.fromEntries(
      typeRoleNames.map((role) => {
        const step = typeScale[role];
        const tracking = letterSpacingOf(step.size, step.letterSpacingEm);

        return [
          `.text-${role}`,
          {
            'font-size': points(step.size),
            'line-height': points(step.lineHeight),
            ...(tracking === 0 ? {} : { 'letter-spacing': points(tracking) }),
            'font-weight': String(step.weight),
          },
        ];
      }),
    ),
  );
});

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius,
      colors,
      fontFamily,
      spacing,
    },
  },
  plugins: [textRoles],
};
