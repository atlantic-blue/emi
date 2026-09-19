import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * The story document, held against the features it tells and the pictures it shows.
 *
 * `features.md` says what Emi does and `contracts.md` says what each part must do. Neither shows
 * anybody the product. The story is the document that does, and the danger of a document made of
 * pictures is that it goes quietly out of date: a screen changes, a picture is renamed, a feature
 * arrives and nobody writes its section. Each reader below is a way that happens.
 *
 * The root is passed in so a test can point the same readers at a fixture repository rather than at
 * this one.
 */

export const storyDocument = 'docs/story.md';
export const featureDocument = 'docs/features.md';
export const pictureDirectory = 'brand/screens';

/** A feature as `features.md` names it: its number, and the title on its own heading. */
export interface Feature {
  readonly number: number;
  readonly title: string;
}

export interface Beat {
  /** The sentence the picture sits under. */
  readonly sentence: string;
  /** The picture as the story writes it, relative to the document. */
  readonly picture: string;
  /** The line under the picture, which says where the picture came from. */
  readonly caveat: string | null;
}

export interface StorySection {
  readonly number: number;
  readonly title: string;
  readonly beats: readonly Beat[];
}

const featureHeading = /^## Feature (\d+): (.+)$/;

function headingsOf(markdown: string): string[] {
  let fenced = false;

  return markdown.split('\n').filter((line) => {
    if (line.startsWith('```')) {
      fenced = !fenced;
      return false;
    }

    return !fenced && line.startsWith('## ');
  });
}

export function featuresIn(markdown: string): Feature[] {
  return headingsOf(markdown).flatMap((line) => {
    const found = featureHeading.exec(line);

    return found === null ? [] : [{ number: Number(found[1]), title: String(found[2]).trim() }];
  });
}

const picture = /^!\[[^\]]*\]\(([^)]+)\)\s*$/;

/** The paragraph under a picture, which is where the story says where the picture came from. */
function paragraphAfter(lines: readonly string[], index: number): string | null {
  const held: string[] = [];

  for (const line of lines.slice(index + 1)) {
    if (line.trim().length === 0) {
      if (held.length > 0) {
        break;
      }
      continue;
    }
    if (picture.test(line) || line.startsWith('#')) {
      break;
    }
    held.push(line.trim());
  }

  return held.length === 0 ? null : held.join(' ');
}

/**
 * The sections of the story, each with the beats under it. A beat is the sentence, the picture
 * under it and the line under that, because those three travel together: a reader given two of
 * them has been told what the picture shows or where it came from, never both.
 */
export function sectionsIn(markdown: string): StorySection[] {
  const sections: StorySection[] = [];
  const lines = markdown.split('\n');
  let fenced = false;
  let paragraph: string[] = [];
  // The sentence sits in the paragraph above the picture, and a blank line separates the two, so
  // the paragraph that just closed is held rather than thrown away when that blank line arrives.
  let closed: string[] = [];

  for (const [index, line] of lines.entries()) {
    if (line.startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced) {
      continue;
    }

    const heading = featureHeading.exec(line);

    if (heading !== null) {
      sections.push({ number: Number(heading[1]), title: String(heading[2]).trim(), beats: [] });
      paragraph = [];
      closed = [];
      continue;
    }

    const shown = picture.exec(line);

    if (shown === null) {
      if (line.trim().length === 0 || line.startsWith('#')) {
        if (paragraph.length > 0) {
          closed = paragraph;
        }
        paragraph = [];
      } else {
        paragraph.push(line.trim());
      }
      continue;
    }

    const open = sections[sections.length - 1];

    if (open !== undefined) {
      (open.beats as Beat[]).push({
        sentence: (paragraph.length > 0 ? paragraph : closed).join(' '),
        picture: String(shown[1]).trim(),
        caveat: paragraphAfter(lines, index),
      });
    }

    paragraph = [];
    closed = [];
  }

  return sections;
}

/** Every picture in `brand/screens`, named the way the story has to name it to show one. */
export function picturesOnDisk(root: string): string[] {
  const directory = join(root, pictureDirectory);

  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .filter((name) => name.endsWith('.png'))
    .sort();
}

/** Where a picture the story names actually sits, which the story writes relative to itself. */
export function pictureAt(root: string, named: string): string {
  return resolve(root, dirname(storyDocument), named);
}

const caveatParts: readonly { readonly held: RegExp; readonly missing: string }[] = [
  { held: /under the test runner/i, missing: 'that it was rendered under the test runner' },
  { held: /\b\d+ by \d+ points\b/, missing: 'the size it was rendered at, as "390 by 844 points"' },
  { held: /not captured from a phone/i, missing: 'that it was not captured from a phone' },
];

export function caveatProblems(beat: Beat): string[] {
  if (beat.caveat === null) {
    return [
      `${storyDocument}: the picture ${beat.picture} carries no line under it saying where it came from`,
    ];
  }

  return caveatParts
    .filter((part) => !part.held.test(beat.caveat ?? ''))
    .map((part) => `${storyDocument}: the line under ${beat.picture} does not say ${part.missing}`);
}

export interface StoryResult {
  readonly features: readonly Feature[];
  readonly told: readonly Feature[];
  readonly untold: readonly Feature[];
  readonly beats: number;
  /** The pictures the story shows, each named once however many beats show it. */
  readonly shown: readonly string[];
  readonly onDisk: readonly string[];
  /** Named by no section, which is how a picture nobody removed stays visible. */
  readonly unnamed: readonly string[];
  /** What fails the run. */
  readonly problems: readonly string[];
  /** What the run says out loud and does not fail on. Step 8 turns the untold features into
   * problems, once every feature has a section to turn. */
  readonly notes: readonly string[];
}

function read(root: string, file: string): string | null {
  const path = join(root, file);

  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

export function storyProblems(root: string): StoryResult {
  const storyText = read(root, storyDocument);
  const featureText = read(root, featureDocument);
  const features = featureText === null ? [] : featuresIn(featureText);
  const sections = storyText === null ? [] : sectionsIn(storyText);
  const onDisk = picturesOnDisk(root);
  const problems: string[] = [];
  const notes: string[] = [];

  if (featureText === null) {
    problems.push(`${featureDocument} is missing, so there is nothing to hold the story against.`);
  }
  if (storyText === null) {
    problems.push(
      `${storyDocument} is missing. It is the document that shows somebody the product.`,
    );
  }

  const beats = sections.flatMap((section) => section.beats);

  if (sections.length === 0 && beats.length === 0) {
    problems.push(
      `${storyDocument} tells no feature and shows no picture, so this check read nothing. ` +
        'A check that finds nothing to check reports success, which is worth nothing.',
    );
  }

  const told = features.filter((feature) =>
    sections.some((section) => section.number === feature.number),
  );
  const untold = features.filter((feature) => !told.includes(feature));

  for (const section of sections) {
    const named = features.find((feature) => feature.number === section.number);

    if (named === undefined) {
      problems.push(
        `${storyDocument}: the section "Feature ${section.number}: ${section.title}" names no feature in ${featureDocument}`,
      );
      continue;
    }

    if (named.title !== section.title) {
      problems.push(
        `${storyDocument}: feature ${section.number} is called "${section.title}" here and "${named.title}" in ${featureDocument}`,
      );
    }

    if (section.beats.length === 0) {
      problems.push(
        `${storyDocument}: the section "Feature ${section.number}: ${section.title}" shows no picture, so it tells nobody what the product looks like`,
      );
    }
  }

  for (const beat of beats) {
    if (!existsSync(pictureAt(root, beat.picture))) {
      problems.push(
        `${storyDocument}: the picture ${beat.picture} is named there and is not on disk`,
      );
      continue;
    }

    problems.push(...caveatProblems(beat));
  }

  const shown = [...new Set(beats.map((beat) => beat.picture))].sort();
  const named = new Set(
    shown.map((each) => relative(join(root, pictureDirectory), pictureAt(root, each))),
  );
  const unnamed = onDisk.filter((file) => !named.has(file));

  for (const feature of untold) {
    notes.push(`${storyDocument} tells no story for feature ${feature.number}: ${feature.title}`);
  }

  for (const file of unnamed) {
    notes.push(`${join(pictureDirectory, file)} is on disk and no section of the story shows it`);
  }

  return {
    features,
    told,
    untold,
    beats: beats.length,
    shown,
    onDisk,
    unnamed,
    problems,
    notes,
  };
}
