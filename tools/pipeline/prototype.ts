import { runInNewContext } from 'node:vm';
import { join } from 'node:path';

import { parse } from 'yaml';

/**
 * The prototype and the document that describes it, read against each other.
 *
 * The six screens under `docs/design/prototype` are what Emi is meant to look like, and
 * `docs/design/prototype-design-system.md` is written from them. A description and the thing it
 * describes drift the moment nothing reads the two together, and the drift is invisible, because
 * each side is internally consistent and every test downstream reads the description.
 */

/** Where the six screens and their pictures sit. */
export const prototypeDirectory = join('docs', 'design', 'prototype');

/**
 * The screen the front matter is read from. All six carry the same configuration, byte for byte,
 * and one of them is named here so a failure points at a file rather than at a set. It is the
 * style sheet, because that is also the one screen that draws all eight phase colours.
 */
export const sourceScreen = 'screen-0-style-sheet.html';

/** The document written from that configuration. */
export const designSystemDocument = join('docs', 'design', 'prototype-design-system.md');

/** The element each screen carries, holding the configuration the page draws itself with. */
export const configurationElement = 'tailwind-config';

/** One type role, as both sides write it. A role the design system does not track has no tracking. */
export interface TypeRole {
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontWeight: string;
  readonly lineHeight: string;
  readonly letterSpacing?: string;
}

/** The four blocks the two sides both name. */
export interface Theme {
  readonly colours: Readonly<Record<string, string>>;
  readonly radii: Readonly<Record<string, string>>;
  readonly spacing: Readonly<Record<string, string>>;
  readonly type: Readonly<Record<string, TypeRole>>;
}

interface TailwindTheme {
  colors?: Record<string, string>;
  borderRadius?: Record<string, string>;
  spacing?: Record<string, string>;
  fontFamily?: Record<string, string[]>;
  fontSize?: Record<string, [string, Record<string, string>]>;
}

/**
 * The configuration a screen draws itself with, run the way the browser runs it rather than read
 * with a pattern. The element is JavaScript and not JSON: it names some of its keys without quotes
 * and it assigns to a global the page has already made. A reader built out of patterns agrees with
 * it until the day the tool writes the same values in a different shape, and then it reads nothing
 * and an empty read looks exactly like agreement.
 */
export function configuredIn(html: string): Theme {
  const found = new RegExp(`<script id="${configurationElement}">([\\s\\S]*?)</script>`).exec(html);

  if (found?.[1] === undefined) {
    throw new Error(
      `the screen carries no ${configurationElement} element, so it configures nothing`,
    );
  }

  const page: { config?: { theme?: { extend?: TailwindTheme } } } = {};

  runInNewContext(found[1], { tailwind: page }, { timeout: 5000 });

  const extended = page.config?.theme?.extend;

  if (extended === undefined) {
    throw new Error(`the ${configurationElement} element extends no theme, so it names no values`);
  }

  return {
    colours: extended.colors ?? {},
    radii: extended.borderRadius ?? {},
    spacing: extended.spacing ?? {},
    type: rolesOf(extended),
  };
}

/** The type scale, which the configuration writes as two blocks: the family, and everything else. */
function rolesOf(extended: TailwindTheme): Record<string, TypeRole> {
  const roles: Record<string, TypeRole> = {};

  for (const [name, written] of Object.entries(extended.fontSize ?? {})) {
    const [size, rest] = written;
    const family = extended.fontFamily?.[name]?.join(', ');

    roles[name] = {
      fontFamily: family ?? '',
      fontSize: size,
      fontWeight: rest.fontWeight ?? '',
      lineHeight: rest.lineHeight ?? '',
      ...(rest.letterSpacing === undefined ? {} : { letterSpacing: rest.letterSpacing }),
    };
  }

  return roles;
}

interface FrontMatter {
  colors?: Record<string, string>;
  rounded?: Record<string, string>;
  spacing?: Record<string, string>;
  typography?: Record<string, TypeRole>;
}

/**
 * The front matter of the design system document, parsed as the YAML it is. A value the document
 * writes without quotes arrives as a number, and every value here is compared as it is written, so
 * each one is put back into the spelling the page uses.
 */
export function describedIn(document: string): Theme {
  const front = document.split('\n---')[0]?.replace(/^---\n/, '');

  if (front === undefined || front.trim().length === 0) {
    throw new Error(`${designSystemDocument} has no front matter, so it describes nothing`);
  }

  const read = parse(front) as FrontMatter | null;

  if (read === null) {
    throw new Error(`${designSystemDocument} has front matter that reads as nothing`);
  }

  return {
    colours: written(read.colors),
    radii: written(read.rounded),
    spacing: written(read.spacing),
    type: read.typography ?? {},
  };
}

function written(block: Record<string, string> | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(block ?? {}).map(([name, value]) => [name, String(value)]),
  );
}

/** The five properties a type role carries, so a missing one is a disagreement and not a skip. */
const typeProperties: readonly (keyof TypeRole)[] = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
];

/**
 * Every value the two sides write differently, one sentence each, sorted so the list reads the
 * same on every machine. A name only one side holds is a disagreement too: it is written as
 * nothing on the side that does not hold it.
 */
export function disagreements(prototype: Theme, document: Theme): string[] {
  return [
    ...valuesApart('colour', prototype.colours, withoutPhases(document.colours)),
    ...valuesApart('radius', prototype.radii, document.radii),
    ...valuesApart('spacing', prototype.spacing, document.spacing),
    ...typeApart(prototype.type, document.type),
  ].sort();
}

function valuesApart(
  block: string,
  prototype: Readonly<Record<string, string>>,
  document: Readonly<Record<string, string>>,
): string[] {
  return namesOf(prototype, document)
    .filter((name) => prototype[name] !== document[name])
    .map((name) => said(`${block} ${name}`, prototype[name], document[name]));
}

function typeApart(
  prototype: Readonly<Record<string, TypeRole>>,
  document: Readonly<Record<string, TypeRole>>,
): string[] {
  return namesOf(prototype, document).flatMap((role) =>
    typeProperties
      .filter((property) => prototype[role]?.[property] !== document[role]?.[property])
      .map((property) =>
        said(`${role} ${property}`, prototype[role]?.[property], document[role]?.[property]),
      ),
  );
}

function namesOf(one: Readonly<Record<string, unknown>>, other: Readonly<Record<string, unknown>>) {
  return [...new Set([...Object.keys(one), ...Object.keys(other)])].sort();
}

function said(what: string, prototype: string | undefined, document: string | undefined): string {
  return `${what}: the prototype says ${spelt(prototype)} and the design system says ${spelt(document)}`;
}

function spelt(value: string | undefined): string {
  return value === undefined ? 'nothing' : value;
}

/**
 * The one block the two sides do not agree about, written out value for value.
 *
 * The prototype names four corners, and all four carry the value Tailwind already gives that name.
 * The document names six under a scale one step wider, so three of the four shared names hold a
 * different value and the document names two corners the prototype never sets. The corner the
 * markup reaches for most is `xl`, 54 times, and the two sides are a factor of two apart on it.
 *
 * Emi draws the document's scale. The tokens took the front matter, and
 * `apps/mobile/tailwind.config.js` reads the tokens, which answers
 * https://github.com/atlantic-blue/emi/issues/159. The export keeps its own corners because it is an
 * export: a value that moves in there moves everything, so the difference is recorded rather than
 * edited away.
 *
 * It is recorded one sentence at a time rather than by allowing the block, so a move on either
 * side reddens the check that reads them.
 */
export const radiiTheExportKeeps: readonly string[] = [
  'radius DEFAULT: the prototype says 0.25rem and the design system says 0.5rem',
  'radius lg: the prototype says 0.5rem and the design system says 1rem',
  'radius md: the prototype says nothing and the design system says 0.75rem',
  'radius sm: the prototype says nothing and the design system says 0.25rem',
  'radius xl: the prototype says 0.75rem and the design system says 1.5rem',
];

/**
 * The four phase fills and the ink beside each one, in the order a cycle runs.
 *
 * These eight are the one part of the palette the Tailwind configuration does not name. The screens
 * draw the four arcs and the four labels as plain values inside the ring, so the front matter names
 * them and they are read back out of the markup rather than out of the configuration. A phase whose
 * fill is named and never drawn is the failure this exists to catch: the ring would then be
 * described in a colour the prototype does not use.
 */
export const phaseColourNames: readonly string[] = [
  'period',
  'period-ink',
  'follicular',
  'follicular-ink',
  'ovulation',
  'ovulation-ink',
  'luteal',
  'luteal-ink',
];

/** The palette without the eight, which is the part the configuration is held against. */
function withoutPhases(colours: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colours).filter(([name]) => !phaseColourNames.includes(name)),
  );
}

/** The eight as the document names them, in the order above, so a missing one is not a skip. */
export function phaseColoursIn(document: Theme): Record<string, string | undefined> {
  return Object.fromEntries(phaseColourNames.map((name) => [name, document.colours[name]]));
}

/**
 * Every phase colour the front matter names and the screen does not draw, one sentence each. The
 * screen writes them in capitals and the front matter writes them in lower case, so both sides are
 * put into one spelling before they are compared.
 */
export function phaseColoursNotDrawn(document: Theme, markup: string): string[] {
  const drawn = markup.toLowerCase();

  return phaseColourNames
    .map((name) => {
      const value = document.colours[name];

      if (value === undefined) {
        return `phase colour ${name}: the design system names nothing`;
      }
      if (!drawn.includes(value.toLowerCase())) {
        return `phase colour ${name}: the design system says ${value} and ${sourceScreen} draws it nowhere`;
      }

      return '';
    })
    .filter((said) => said.length > 0);
}

/** One line of the document, with the number a reader would find it on. */
export interface Line {
  readonly number: number;
  readonly text: string;
}

/**
 * Everything below the front matter. The front matter is the one place a value is written, so the
 * prose is read separately and held to naming roles alone.
 */
export function proseOf(document: string): Line[] {
  const lines = document.split('\n');
  const closed = lines.findIndex((line, at) => at > 0 && line === '---');

  if (closed < 0) {
    throw new Error(`${designSystemDocument} has no front matter, so it has no prose beneath one`);
  }

  return lines.slice(closed + 1).map((text, at) => ({ number: closed + 2 + at, text }));
}

/** A colour written as a value: a hex code, or a function that mixes one. */
const valuePattern = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;

/**
 * Every colour the prose writes as a value, one sentence each.
 *
 * The prose is the half nothing read on the style before this one, and it named a whole second
 * palette in its own values while the front matter named the first. So the rule here is not that
 * the prose agrees with the palette, it is that the prose holds no value at all: it names a role,
 * and the front matter is the only place a value is written.
 */
export function coloursInTheProse(document: string): string[] {
  return proseOf(document).flatMap((line) =>
    [...line.text.matchAll(valuePattern)].map(
      (found) =>
        `${designSystemDocument} line ${line.number} writes ${found[0]}, and the prose names a role rather than a value: ${line.text.trim()}`,
    ),
  );
}
