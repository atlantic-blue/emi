import { runInNewContext } from 'node:vm';
import { join } from 'node:path';

import { parse } from 'yaml';

/**
 * The prototype and the document that describes it, read against each other.
 *
 * The five screens under `docs/design/prototype` are what Emi is meant to look like, and
 * `docs/design/prototype-design-system.md` is written from them. A description and the thing it
 * describes drift the moment nothing reads the two together, and the drift is invisible, because
 * each side is internally consistent and every test downstream reads the description.
 */

/** Where the five screens and their pictures sit. */
export const prototypeDirectory = join('docs', 'design', 'prototype');

/**
 * The screen the front matter is read from. All five carry the same configuration, byte for byte,
 * and one of them is named here so a failure points at a file rather than at a set.
 */
export const sourceScreen = 'today-dashboard.html';

/** The document written from that configuration. */
export const designSystemDocument = join('docs', 'design', 'prototype-design-system.md');

/** The element each screen carries, holding the configuration the page draws itself with. */
export const configurationElement = 'tailwind-config';

/** The element each screen wraps its content in, which is where the room at the foot is written. */
export const contentElement = 'main';

/**
 * Tailwind's own spacing scale, as a multiple of a rem. A class like `pb-28` is twenty eight of
 * these, and it is the scale Tailwind ships rather than one the prototype configures.
 */
export const SPACING_STEP_IN_REM = 0.25;

/**
 * The room a screen reserves at its foot, in steps of Tailwind's spacing scale.
 *
 * The dock hangs over the screen rather than standing beside it, so a screen leaves room for it at
 * its foot and the prototype writes that room as a padding class on the content element. It is
 * read here rather than typed anywhere, because a number typed beside the code it describes agrees
 * with it whatever either one is changed to.
 */
export function footStepsIn(html: string): number {
  const element = new RegExp(`<${contentElement} class="([^"]*)"`).exec(html);

  if (element?.[1] === undefined) {
    throw new Error(`the screen carries no ${contentElement} element, so it reserves nothing`);
  }

  const reserved = /(?:^| )pb-(\d+)(?: |$)/.exec(element[1]);

  if (reserved?.[1] === undefined) {
    throw new Error(`the ${contentElement} element reserves no room at its foot: ${element[1]}`);
  }

  return Number(reserved[1]);
}

/** The same room in points, at the size a rem is drawn on a phone. */
export function footRoomIn(html: string, remInPoints: number): number {
  return footStepsIn(html) * SPACING_STEP_IN_REM * remInPoints;
}

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
    ...valuesApart('colour', prototype.colours, document.colours),
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
 * The document names six under a different scale, so three of the four shared names hold a
 * different value, the document names two corners the prototype never sets, and the corner the
 * markup reaches for 25 times, `rounded-md`, is drawn at a value neither list holds. Which scale
 * Emi means is a decision nobody has taken, and it is
 * https://github.com/atlantic-blue/emi/issues/159.
 *
 * It is recorded here one sentence at a time rather than by allowing the block, so a move on
 * either side, the decision included, reddens the check that reads them.
 */
export const radiiNobodyHasDecided: readonly string[] = [
  'radius DEFAULT: the prototype says 0.25rem and the design system says 0.5rem',
  'radius lg: the prototype says 0.5rem and the design system says 1rem',
  'radius md: the prototype says nothing and the design system says 0.75rem',
  'radius sm: the prototype says nothing and the design system says 0.25rem',
  'radius xl: the prototype says 0.75rem and the design system says 1.5rem',
];
