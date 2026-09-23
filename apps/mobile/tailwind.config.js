const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const { colour } = require('@emi/tokens');
const plugin = require('tailwindcss/plugin');

const {
  configuredIn,
  supersededDirectory,
  supersededScreen,
} = require('../../tools/pipeline/prototype.ts');

/**
 * The prototype's own Tailwind configuration, with one substitution: the colours are read from
 * @emi/tokens rather than repeated here. The prototype names a role with hyphens and the token
 * package names it in camel case, and the two carry the same value, so one file holds the palette
 * and the other reads it.
 *
 * Everything else is the prototype's, value for value, read out of the screen it renders with.
 * That reader belongs to the pipeline rather than to the product, and it is borrowed rather than
 * copied on purpose: a second reader of the same file agrees with the first until the day the tool
 * writes the same values in another shape, and then it reads nothing, which looks exactly like
 * agreement.
 */

const repositoryRoot = join(__dirname, '..', '..');

const prototype = configuredIn(
  readFileSync(join(repositoryRoot, supersededDirectory, supersededScreen), 'utf8'),
);

function hyphenated(name) {
  return name.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);
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

const fontFamily = Object.fromEntries(
  Object.entries(prototype.type).map(([role, written]) => [role, written.fontFamily.split(', ')]),
);

/**
 * The eleven text roles, written as plain declarations.
 *
 * The prototype's values are read from its own screen and not one of them is changed. What changes
 * is the shape Tailwind would write them in: given a size and a line height together, it writes
 * `line-height: var(--tw-leading, 14px)`, and react-native-css 3.1.0-rc.0 reads a length inside a
 * variable fallback as a multiple of the font size, so eleven point text draws at 154 points
 * instead of 14. A length it reads directly is correct.
 *
 * So the roles are declared here instead of under `theme.extend.fontSize`, which would have
 * Tailwind write a second rule for each of them in that shape.
 */
const textRoles = plugin(({ addUtilities }) => {
  addUtilities(
    Object.fromEntries(
      Object.entries(prototype.type).map(([role, written]) => [
        `.text-${role}`,
        {
          'font-size': written.fontSize,
          'line-height': written.lineHeight,
          ...(written.letterSpacing === undefined
            ? {}
            : { 'letter-spacing': written.letterSpacing }),
          'font-weight': written.fontWeight,
        },
      ]),
    ),
  );
});

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: prototype.radii,
      colors,
      fontFamily,
      spacing: prototype.spacing,
    },
  },
  plugins: [textRoles],
};
