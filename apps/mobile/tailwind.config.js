const { colour } = require('@emi/tokens');
const plugin = require('tailwindcss/plugin');

const prototype = require('../../docs/design/prototype-tailwind-config.json');

/**
 * The prototype's own Tailwind configuration, with one substitution: the colours are read from
 * @emi/tokens rather than repeated here. The prototype names a role with hyphens and the token
 * package names it in camel case, and the two carry the same value, so one file holds the palette
 * and the other reads it.
 *
 * Everything else is the prototype's, value for value, from
 * `docs/design/prototype-tailwind-config.json`, which is the file it renders with. A radius, a
 * spacing step or a text size that drifts from that file fails
 * `apps/mobile/tests/theme/prototypeTheme.test.ts`.
 */

const { fontSize: prototypeText, ...rest } = prototype.theme.extend;

function hyphenated(name) {
  return name.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);
}

const byRole = Object.fromEntries(
  Object.entries(colour).map(([name, value]) => [hyphenated(name), value]),
);

/** A colour the prototype draws with and the token package does not hold stops the build here. */
const colors = Object.fromEntries(
  Object.keys(prototype.theme.extend.colors).map((role) => {
    const value = byRole[role];

    if (value === undefined) {
      throw new Error(`the prototype names the colour ${role} and @emi/tokens does not hold it`);
    }

    return [role, value];
  }),
);

/**
 * The eleven text roles, written as plain declarations.
 *
 * The prototype's values are read from its own file and not one of them is changed. What changes
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
      Object.entries(prototypeText).map(([role, [size, rest]]) => [
        `.text-${role}`,
        {
          'font-size': size,
          'line-height': rest.lineHeight,
          ...(rest.letterSpacing === undefined ? {} : { 'letter-spacing': rest.letterSpacing }),
          'font-weight': rest.fontWeight,
        },
      ]),
    ),
  );
});

module.exports = {
  darkMode: prototype.darkMode,
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: { extend: { ...rest, colors } },
  plugins: [textRoles],
};
