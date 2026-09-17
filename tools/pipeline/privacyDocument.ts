export const privacyDocument = 'docs/privacy.md';

export const keyHeading = 'The keys, and what guards each one';

export const refusalHeading = 'What Emi does not defend against';

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
