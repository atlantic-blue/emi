export const privacyDocument = 'docs/privacy.md';

export const keyHeading = 'The keys, and what guards each one';

export const refusalHeading = 'What Emi does not defend against';

export const plainHeading = 'What stays plain on the phone';

/**
 * The values the phone keeps readable, in the order the document names them. The first two are
 * columns of the day log and the rest are the cycle cache, which is every column of that table.
 */
export const plainValues: readonly string[] = [
  'The date of a day',
  'The times a day was written',
  'The start of a cycle',
  'The length of a cycle',
  'The length of a period',
  'Whether a cycle is a forecast',
];

/** The keys of section 7.1 of the design, in the order the document explains them. */
export const designKeys: readonly string[] = [
  'The vault key',
  'The device key',
  'The recovery code',
  'The recovery key',
  'The wrapped vault key',
];

/** The four attacks the design accepts rather than fixes. */
export const acceptedAttacks: readonly string[] = [
  'A lost phone and a lost recovery code',
  'A phone somebody else can unlock',
  'A phone running something hostile',
  'What the outside learns without reading a day',
];

export interface Subsection {
  readonly title: string;
  readonly lines: readonly string[];
}

/**
 * The third level headings under one second level heading, each with the lines that follow it.
 * A heading inside a fenced block is text, so the fence state is carried along the walk.
 */
export function subsectionsUnder(markdown: string, heading: string): Subsection[] {
  const found: Subsection[] = [];
  let inside = false;
  let fenced = false;
  let current: { title: string; lines: string[] } | null = null;

  for (const text of markdown.split('\n')) {
    if (text.startsWith('```')) {
      fenced = !fenced;
    } else if (!fenced && text.startsWith('## ')) {
      inside = text.slice(3).trim() === heading;
      current = null;
    } else if (!fenced && inside && text.startsWith('### ')) {
      current = { title: text.slice(4).trim(), lines: [] };
      found.push(current);
      continue;
    }

    if (current !== null) {
      current.lines.push(text);
    }
  }

  return found;
}

export function labelled(subsection: Subsection, label: string): string | null {
  const line = subsection.lines.find((text) => text.startsWith(`${label}: `));

  return line === undefined ? null : line.slice(label.length + 2).trim();
}

function problemsFor(
  markdown: string,
  heading: string,
  expected: readonly string[],
  labels: readonly string[],
): string[] {
  const found = subsectionsUnder(markdown, heading);
  const titles = found.map((subsection) => subsection.title);

  const missing = expected
    .filter((title) => !titles.includes(title))
    .map((title) => `${privacyDocument} has no "${title}" under "${heading}"`);

  const extra = titles
    .filter((title) => !expected.includes(title))
    .map(
      (title) => `${privacyDocument} names "${title}" under "${heading}", and nothing asked for it`,
    );

  const unexplained = found.flatMap((subsection) =>
    labels
      .filter((label) => {
        const said = labelled(subsection, label);

        return said === null || said.length < 20;
      })
      .map(
        (label) =>
          `${privacyDocument}: "${subsection.title}" carries no ${label.toLowerCase()} line that says anything`,
      ),
  );

  return [...missing, ...extra, ...unexplained];
}

/** Every key of the design must be named, must say where it lives, and must name its defence. */
export function keyProblems(markdown: string, keys: readonly string[] = designKeys): string[] {
  return problemsFor(markdown, keyHeading, keys, ['Lives', 'Defence']);
}

/** Every accepted attack must be named, and must say what she can do about it. */
export function refusalProblems(
  markdown: string,
  attacks: readonly string[] = acceptedAttacks,
): string[] {
  return problemsFor(markdown, refusalHeading, attacks, ['What to do']);
}

/** Every value the phone keeps in the clear must be named, with what a reader of the file learns. */
export function plainValueProblems(
  markdown: string,
  values: readonly string[] = plainValues,
): string[] {
  return problemsFor(markdown, plainHeading, values, ['Lives', 'What a reader learns']);
}

/** The text under a second level heading, before the first third level heading under it. */
export function openingUnder(markdown: string, heading: string): string {
  const from = markdown.indexOf(`## ${heading}`);

  if (from === -1) {
    return '';
  }

  const rest = markdown.slice(from);
  const to = rest.indexOf('\n### ');

  return to === -1 ? rest : rest.slice(0, to);
}

/** What the document must say the setting table's article row holds today. */
export const articleRowHolds = 'as its identifier and the instant she read it';

/** What that row held before the launch pass, and what the document may no longer say of it. */
export const articleRowNoLongerHolds = 'records the cycle phase';

/**
 * The article row of the setting table held a cycle phase, and the opening of the plain value
 * section said so. A launch takes that phase off every phone, so a document that still says the row
 * records one names a plain value the phone does not keep. That is worse than naming none, because a
 * reader trusts the list to be the whole list.
 */
export function articleRowProblems(markdown: string): string[] {
  const opening = openingUnder(markdown, plainHeading);
  const problems: string[] = [];

  if (!opening.includes(articleRowHolds)) {
    problems.push(`${privacyDocument} does not say the article row holds it "${articleRowHolds}"`);
  }

  if (opening.includes(articleRowNoLongerHolds)) {
    problems.push(
      `${privacyDocument} still says the article row "${articleRowNoLongerHolds}", and a launch takes it off`,
    );
  }

  return problems;
}
