import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { contractDocument, contractsMappedIn, featureDocument } from './documentation.ts';

/**
 * `docs/design/first-run.md` writes SCREEN-1 out in full, and `docs/contracts.md` carries the same
 * words. Two copies of one contract drift the moment somebody edits the nearer one, so the readers
 * below take each copy and hold them to each other.
 *
 * The contract itself is the thing the design moved: the first run used to write her answer as she
 * left each screen, and it now holds every answer until she presses and holds the ring. So the
 * checks here read for the hold, and refuse the old wording that held the first run to three
 * screens.
 */

export const firstRunDesign = 'docs/design/first-run.md';

const headingPattern = /^#{2,3}\s+(.*)$/;

const contractPattern = /^([A-Z]+-\d+)\b/;

export interface ContractSection {
  readonly contract: string;
  readonly heading: string;
  readonly body: string;
}

/**
 * Every contract a document writes out, taken from the `###` headings that open with an
 * identifier. A heading inside a fenced block is text, so the reader carries the fence state with
 * it the way the document checks do.
 */
export function contractSectionsIn(markdown: string): ContractSection[] {
  const sections: ContractSection[] = [];
  let open: { contract: string; heading: string; body: string[] } | null = null;
  let fenced = false;

  const close = (): void => {
    if (open !== null) {
      sections.push({ contract: open.contract, heading: open.heading, body: open.body.join('\n') });
    }

    open = null;
  };

  for (const text of markdown.split('\n')) {
    if (text.startsWith('```')) {
      fenced = !fenced;
    } else if (!fenced) {
      const heading = headingPattern.exec(text);

      if (heading !== null) {
        close();

        const title = (heading[1] as string).trim();
        const named = contractPattern.exec(title);

        if (named !== null && text.startsWith('### ')) {
          open = { contract: named[1] as string, heading: title, body: [] };
        }

        continue;
      }
    }

    if (open !== null) {
      open.body.push(text);
    }
  }

  close();

  return sections;
}

export function sectionFor(sections: readonly ContractSection[], contract: string): string | null {
  return sections.find((section) => section.contract === contract)?.body ?? null;
}

/** One space between words, so a document that wrapped a sentence still reads as that sentence. */
export function wordsOf(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** One section read as the paragraphs a reader sees, each one on a single line. */
export function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map(wordsOf)
    .filter((text) => text.length > 0);
}

/** The wording the first run no longer carries, because the design took the limit of three off it. */
export const retiredWording: readonly string[] = ['three screens', 'fourth screen'];

/** What SCREEN-1 must say now: the hold, and that nothing is written before it. */
export const requiredWording: readonly string[] = ['at the hold', 'before the hold'];

export interface FirstRunResult {
  readonly problems: readonly string[];
  /** How many contracts each document wrote out, so a read of nothing cannot report agreement. */
  readonly designSections: number;
  readonly contractSections: number;
}

export function firstRunProblems(
  design: string,
  contracts: string,
  features: string,
): FirstRunResult {
  const designSections = contractSectionsIn(design);
  const contractSections = contractSectionsIn(contracts);
  const problems: string[] = [];

  const designed = sectionFor(designSections, 'SCREEN-1');
  const shipped = sectionFor(contractSections, 'SCREEN-1');

  if (designed === null) {
    problems.push(
      `${firstRunDesign} writes out no SCREEN-1, so nothing there says what the first run is`,
    );
  }

  if (shipped === null) {
    problems.push(`${contractDocument} declares no SCREEN-1`);
  }

  if (designed !== null && shipped !== null && wordsOf(designed) !== wordsOf(shipped)) {
    problems.push(
      `${contractDocument} and ${firstRunDesign} disagree about SCREEN-1:\n` +
        `  ${contractDocument} says: ${wordsOf(shipped)}\n` +
        `  ${firstRunDesign} says: ${wordsOf(designed)}`,
    );
  }

  if (shipped !== null) {
    const said = wordsOf(shipped).toLowerCase();

    for (const wording of requiredWording) {
      if (!said.includes(wording)) {
        problems.push(
          `${contractDocument}: SCREEN-1 never says "${wording}", and the hold is the only moment the first run writes`,
        );
      }
    }

    for (const wording of retiredWording) {
      if (said.includes(wording)) {
        problems.push(
          `${contractDocument}: SCREEN-1 still says "${wording}", and the first run is no longer held to three`,
        );
      }
    }
  }

  const envelope = sectionFor(contractSections, 'ENVELOPE-2');

  if (envelope === null) {
    problems.push(
      `${contractDocument} declares no ENVELOPE-2, and the profile record travels in it`,
    );
  } else {
    // What travels in the shape is the input, so the input is where the reader looks. A refusal
    // further down that names a profile, under an input that names only a day, is the drift.
    const input = paragraphsOf(envelope).find((text) => text.startsWith('Input:')) ?? '';

    for (const record of ['day record', 'profile record']) {
      if (!input.toLowerCase().includes(record)) {
        problems.push(
          `${contractDocument}: the input of ENVELOPE-2 never names the ${record}, so nothing says the shape carries one`,
        );
      }
    }
  }

  const table = sectionFor(contractSections, 'TABLE-5');

  if (table === null) {
    problems.push(
      `${contractDocument} declares no TABLE-5, so nothing says where a sealed profile lands`,
    );
  }

  const owners = contractsMappedIn(features).filter((mapped) => mapped.contract === 'TABLE-5');

  if (owners.length !== 1) {
    const named =
      owners.length === 0 ? 'no feature' : owners.map((owner) => owner.feature).join(' and ');

    problems.push(
      `${featureDocument} gives TABLE-5 to ${named}, and one feature builds a contract`,
    );
  }

  return {
    problems,
    designSections: designSections.length,
    contractSections: contractSections.length,
  };
}

export function firstRunProblemsOf(root: string): FirstRunResult {
  const read = (file: string): string => readFileSync(join(root, file), 'utf8');

  return firstRunProblems(read(firstRunDesign), read(contractDocument), read(featureDocument));
}
