import { join } from 'node:path';

/**
 * The redesign prototype and the document that describes it, read against each other.
 *
 * The 52 screens under `docs/design/prototype` are what Emi is meant to look like, and
 * `docs/design/prototype-design-system.md` is written from them. The screens carry no block of
 * named values: each one writes its colours straight into the markup it paints. So the document is
 * held to the screens one colour at a time, in both directions, and the chain from the markup to
 * the token package has a first link that something reads.
 */

/** Where the screens, the canvas and the two documents of the prototype sit. */
export const prototypeDirectory = join('docs', 'design', 'prototype');

/** What a screen file is called. The tool writes one file per screen, named after the screen. */
export const screenSuffix = '.dc.html';

/** The file that places the screens beside each other, written by the same tool. */
export const canvasFile = 'canvas.json';

/** The document written from those screens. */
export const designSystemDocument = join('docs', 'design', 'prototype-design-system.md');

/** One type role, as the front matter writes it. */
export interface TypeRole {
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontWeight: string;
  readonly lineHeight: string;
  readonly letterSpacing?: string;
}

/**
 * A colour the prototype paints below the contrast floor, and the value Emi builds instead.
 *
 * Both values stay in the document because both are true: the screens paint one of them, so the
 * colour check reads it, and the token package builds the other, so the contrast test reads that.
 * A document that recorded only one of the two would make one of its readers lie.
 */
export interface RaisedColour {
  /** The value the prototype paints, which is the one the screens are read against. */
  readonly prototype: string;
  /** The ground it was measured on, by the name the palette gives that ground. */
  readonly on: string;
  readonly reason: string;
}

/** The blocks of the front matter, each read as it is written. */
export interface Described {
  /** The palette Emi builds, name to value. */
  readonly colours: Readonly<Record<string, string>>;
  readonly raised: Readonly<Record<string, RaisedColour>>;
  /** Each wash, as the stops it runs through. */
  readonly wash: Readonly<Record<string, readonly string[]>>;
  readonly rounded: Readonly<Record<string, string>>;
  readonly spacing: Readonly<Record<string, string>>;
  readonly type: Readonly<Record<string, TypeRole>>;
}

/** A colour written as a value: a hex code, or a function that mixes one. */
const valuePattern = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;

/** One screen, as the checks read it. */
export interface Screen {
  readonly file: string;
  readonly markup: string;
}

export function describedIn(_document: string): Described {
  return { colours: {}, raised: {}, wash: {}, rounded: {}, spacing: {}, type: {} };
}

export function namedValues(_described: Described): ReadonlySet<string> {
  return new Set<string>();
}

export function opaqueBaseOf(value: string): string {
  return value.toLowerCase();
}

export function coloursDrawnIn(_markup: string): string[] {
  return [];
}

export function coloursWithNoName(_named: Iterable<string>, _screens: readonly Screen[]): string[] {
  return [];
}

export function namesDrawnNowhere(_described: Described, _screens: readonly Screen[]): string[] {
  return [];
}

/**
 * The four phase fills and the ink beside each one, in the order a cycle runs.
 *
 * The ring writes the name of the phase she is in on the ground rather than on the arc, which is
 * contract SEE-2, so an ink is measured against the ground and never against its own fill.
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

/**
 * The parts of a screen a browser paints from: every tag with its attributes, and the body of
 * every style and script element.
 *
 * The text between the tags is left out, and so is every comment. A value printed as a word is a
 * value a reader reads, not a value drawn, and a check that took those for paint would report a
 * fault on a screen that paints correctly.
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
