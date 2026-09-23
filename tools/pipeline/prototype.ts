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

/** Where the copy review of screens 6 to 22 sits, word for word as it was written. */
export const copyReviewDocument = join(prototypeDirectory, 'copy-review.md');

/** The readme that records what the export says and Emi never builds. */
export const prototypeReadme = join(prototypeDirectory, 'README.md');

/** The heading in that readme the false copy is recorded under. */
export const claimsHeading =
  '## Copy on these screens that must never be built, because it is false';

/**
 * The parts of a screen a browser paints from: every tag with its attributes, and the body of every
 * style and script element.
 *
 * The text between the tags is left out, and so is every comment. The style sheet screen prints
 * colour values as labels a reader reads, and a value printed as a word is not a value drawn. A
 * reader that took those for paint would report a fault on a screen that draws the palette
 * correctly, and the fix for it would be to edit the export.
 */
export function drawnParts(markup: string): string[] {
  const withoutComments = markup.replace(/<!--[\s\S]*?-->/g, ' ');

  return [
    ...[...withoutComments.matchAll(/<[a-zA-Z][^>]*>/g)].map((found) => found[0]),
    ...[...withoutComments.matchAll(/<(style|script)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(
      (found) => found[2] ?? '',
    ),
  ];
}

/**
 * A value drawn at full strength. A translucent one is a shadow, and the front matter names no
 * shadow: the screens write their shadows as a black or an ink at a few per cent, which is a depth
 * and not a colour of the palette.
 */
function opaque(value: string): boolean {
  if (value.startsWith('#')) {
    return true;
  }

  const inside = value.slice(value.indexOf('(') + 1, -1);
  const alpha = inside.split(/[,/]/)[3];

  return alpha === undefined || Number.parseFloat(alpha) >= 1;
}

/**
 * Every colour a screen paints with that the palette does not hold, one value each and sorted.
 *
 * The configuration comparison above reads the block the screens share, so a screen that paints a
 * value straight into an attribute passes it untouched. That is the route the retired canvas took
 * into four screens: it never reached the configuration, so nothing read it.
 */
export function coloursDrawnOutsideThePalette(palette: Iterable<string>, markup: string): string[] {
  const held = new Set([...palette].map((value) => value.toLowerCase()));
  const found = new Set<string>();

  for (const part of drawnParts(markup)) {
    for (const [written] of part.matchAll(valuePattern)) {
      const value = written.toLowerCase().replace(/\s+/g, '');

      if (opaque(value) && !held.has(value)) {
        found.add(written);
      }
    }
  }

  return [...found].sort();
}

/**
 * The claims the copy review refuses because they are untrue, each written as the review writes it.
 *
 * The review is the reading and this is the index of it, so the readme carries every one under the
 * heading that says what is never built. Both documents are read against this list, so a claim
 * dropped from either one is named rather than quietly lost.
 */
export const falseClaimsOfTheCopyReview: readonly string[] = [
  'Never write AES, enclave, hardware key, audited, zero knowledge or zero cloud.',
  'Never write "never leaves this phone" about a day.',
  'Saved strictly on this device. Never transmitted or stored on remote servers.',
  'Cycle rhythm, Regular pattern',
  'Global average 26 to 30 days',
  'Adaptive Calibration',
  'Most periods last between 3 and 7 days',
  'Rhythm waveform preview',
  'We will broaden windows into softer horizon ranges',
  'toxic positivity and actionable physiology',
  'Encrypted and Stored Privately in Journal',
  'No health profiling data leaves your device.',
  'stored only in your local key vault',
  '±2 days tolerance',
  'Calibration complete',
  'Model version 1.0-local',
  'Zero Cloud Inference',
  'hardware enclave',
  'Not even our engineers',
  'No mandatory email',
  'zero residual backups',
  'Audited cryptographic baseline',
  'Zero cloud telemetry',
  'No lockscreen leak',
  'Zero server push',
  'Cycle Calibration Model',
  'AES-256 · Local Enclave',
  'Encrypted offline repository ready',
  'Generates your private cryptographic key in local enclave storage.',
  'Private enclave',
  'Local Key Generation · 256-bit AES',
  'Stored on device, encrypted in transit',
  'We never hold your health history hostage',
  'Vault Setup Complete',
  'Device enclave locked',
  'Hardware key verified · Local storage only',
  'Estrogen gently rising',
  'Light social capacity',
  'Balanced and calm',
  'Zero knowledge local vault, Key active',
];

/** One run of spaces, so a claim wrapped over two lines of a document still reads as one phrase. */
function flowed(document: string): string {
  return document.replace(/\s+/g, ' ');
}

/** The part of a document under one heading, which ends where the next heading of that depth opens. */
export function sectionUnder(document: string, heading: string): string {
  const opened = document.indexOf(heading);

  if (opened < 0) {
    return '';
  }

  const rest = document.slice(opened + heading.length);
  const closed = rest.indexOf('\n## ');

  return closed < 0 ? rest : rest.slice(0, closed);
}

/**
 * Every claim one of the two documents does not carry, one sentence each.
 *
 * A claim has to be in the review, because the review is where it was found, and under the heading
 * of the readme, because the readme is the one file a person building a screen reads.
 */
export function claimsNotRecorded(review: string, readme: string): string[] {
  const written = flowed(review);
  const recorded = flowed(sectionUnder(readme, claimsHeading));

  return falseClaimsOfTheCopyReview.flatMap((claim) => [
    ...(written.includes(flowed(claim)) ? [] : [`${copyReviewDocument} does not name ${claim}`]),
    ...(recorded.includes(flowed(claim))
      ? []
      : [`${prototypeReadme} does not record ${claim} under ${claimsHeading.slice(3)}`]),
  ]);
}
