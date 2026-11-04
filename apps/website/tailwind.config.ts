import {
  colour,
  radius,
  space,
  stroke,
  typeRoleNames,
  typeScale,
  letterSpacingOf,
  websiteColour,
  websiteFace,
  websiteFaceNames,
  websiteFaceStack,
  websitePhoneWidth,
  websiteTabletWidth,
} from '@emi/tokens';

import { SERVED_FACE_VARIABLES } from './lib/face';

/**
 * The theme of myemi.app, built from `packages/tokens` and from nothing else.
 *
 * Tailwind reads a theme either from a stylesheet or from a file like this one. The rule that
 * refuses a colour outside the token package is an eslint rule, and eslint reads TypeScript rather
 * than stylesheets, so a palette written in a stylesheet would be a palette no gate measures. That
 * is why the theme is here.
 *
 * The scale is closed: `theme` replaces Tailwind's own values rather than extending them, so a
 * class naming a colour, a size, a gap or a corner that Emi never chose draws nothing at all.
 */

/** Points in the token file, pixels in a browser. The number is the same number. */
function inPixels(value: number): string {
  return `${value}px`;
}

function fromTokens<Value>(
  entries: Readonly<Record<string, Value>>,
  write: (value: Value) => string,
): Record<string, string> {
  return Object.fromEntries(Object.entries(entries).map(([name, value]) => [name, write(value)]));
}

/**
 * A role never travels without its line height, its tracking and its weight. Tailwind carries the
 * four together in one entry, so `text-body-lg` cannot be taken without them.
 */
const text = Object.fromEntries(
  typeRoleNames.map((name) => {
    const role = typeScale[name];

    return [
      name,
      [
        inPixels(role.size),
        {
          lineHeight: inPixels(role.lineHeight),
          letterSpacing: inPixels(letterSpacingOf(role.size, role.letterSpacingEm)),
          fontWeight: `${role.weight}`,
        },
      ],
    ];
  }),
);

/**
 * A family name of more than one word has to arrive quoted, or a browser reads each word as a
 * family of its own and finds none of them.
 */
function asAFamily(name: string): string {
  return name.includes(' ') ? `"${name}"` : name;
}

/**
 * The three families of the approved board, each in the board's own order, with the custom property
 * the font loader built set immediately in front of the family the site serves. A reader whose
 * browser already holds that face reads the same letters before the file arrives, and a reader
 * whose machine holds one of the faces the board names ahead of it reads that one, which is what
 * the board does on the same machine.
 */
const families = Object.fromEntries(
  websiteFaceNames.map((role) => [
    role,
    websiteFaceStack[role].flatMap((family) =>
      family === websiteFace[role]
        ? [`var(${SERVED_FACE_VARIABLES[role]})`, asAFamily(family)]
        : [asAFamily(family)],
    ),
  ]),
);

/**
 * The theme and nothing else. Which directories Tailwind reads for the classes it must write is
 * stated in `app/globals.css`, beside the import, which is where a reader of a Tailwind
 * stylesheet looks for it.
 *
 * Two palettes, because the site and the phone are two surfaces and the board paints them in
 * different values. Every name of the site's own palette starts with `site`, so one flat namespace
 * carries both without either answering for the other.
 */
const config = {
  theme: {
    colors: { ...fromTokens(colour, (value) => value), ...fromTokens(websiteColour, (v) => v) },
    fontFamily: families,
    fontSize: text,
    // A rule Emi draws as a filled box takes its thickness as a height, so the two stroke widths
    // join the scale that drives a height.
    spacing: { ...fromTokens(space, inPixels), ...fromTokens(stroke, inPixels) },
    borderRadius: fromTokens(radius, inPixels),
    borderWidth: fromTokens(stroke, inPixels),
    // The two widths the board changes the shape of a band at. They extend the breakpoints rather
    // than replacing them, so the ones Tailwind ships still draw. The wider one is written first,
    // because Tailwind writes these rules in the order they are read here and the narrower width
    // has to be the one that wins where both of them match.
    extend: {
      screens: {
        tablet: { max: inPixels(websiteTabletWidth) },
        phone: { max: inPixels(websitePhoneWidth) },
      },
    },
  },
} as const;

export default config;
