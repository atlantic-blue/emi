import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * The approved mockups stage, as the repository reads it.
 *
 * Every screen of the product was drawn before it was built, and a step that builds one is proved
 * against its drawing. The drawing is markup, so the part names travel in `data-component` and the
 * comparison reads those names and their order. It never reads the words: the words come from the
 * catalogue in three languages, and the stage says the wording is not its to settle, so a
 * comparison of text would hold the product to a draft.
 */

/** Where the stage file is committed, as a path from the root of the repository. */
export const mockupsArtifact = join('docs', 'design', 'mockups', 'flows.json');

/**
 * The screens the stage delivered on 2026-09-28. A stage that arrives with fewer has lost a
 * drawing somewhere between the tool that wrote it and the file committed here, and a screen
 * nobody can name is a step nobody can prove.
 */
export const screensDelivered = 52;

/** Where the tests that hold a screen against a drawing live. */
export const testRoot = join('apps', 'mobile', 'tests');

/** The extensions the key scan reads under that root. */
export const testExtensions: readonly string[] = ['.ts', '.tsx'];

/**
 * The fixture itself, which is left out of the scan. It declares the calls below and hands the key
 * it was given straight on, so reading it would find a key nobody wrote and refuse the whole run.
 */
export const theFixture = join(testRoot, 'fixtures', 'theMockupScreen.ts');

/**
 * The fixture calls that name a screen key. Each one takes the key as its first argument, so the
 * scan below reads the literal there and the gate knows which drawings the suite claims to use.
 */
export const fixtureCalls: readonly string[] = [
  'thePartsOfTheMockup',
  'partsMissingFromTheScreen',
  'theRowsOfTheMockup',
];

export interface MockupScreen {
  /** What the drawing calls the screen, for a reader rather than for a test. */
  readonly name: string;
  /** The address the built screen answers on. */
  readonly route: string;
  /** The file the drawing was taken from, or the file it replaces. */
  readonly source: string;
  readonly status: 'built' | 'proposed';
  readonly surface: string;
  readonly notes?: readonly string[];
  readonly html: string;
}

export interface Mockups {
  readonly screens: Readonly<Record<string, MockupScreen>>;
  readonly stories: readonly unknown[];
}

export function mockupsIn(root: string): Mockups {
  return JSON.parse(readFileSync(join(root, mockupsArtifact), 'utf8')) as Mockups;
}

export function screenKeysOf(mockups: Mockups): string[] {
  return Object.keys(mockups.screens).sort();
}

/** The elements markup closes on their own, so nothing waits for a closing tag for them. */
const closeThemselves: ReadonlySet<string> = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const aTag = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g;
const aComponent = /data-component="([^"]+)"/;

interface OpenElement {
  readonly tag: string;
  /** Where in the running list of parts this element put its own name, or null where it has none. */
  readonly at: number | null;
}

/**
 * The parts a drawing names, in the order the drawing places them.
 *
 * A wrapper that repeats the name of the part inside it is dropped. The dock is drawn as a bar
 * named `BottomNavigation` holding four columns each named `BottomNavigation`, and the round
 * actions the same way, because the press is the part a building session has to build and the name
 * has to sit where the press is. Counting the bar as well would ask the built screen for five docks
 * where the drawing shows four columns in one.
 */
export function partsOf(html: string): string[] {
  const parts: string[] = [];
  const dropped = new Set<number>();
  const open: OpenElement[] = [];

  aTag.lastIndex = 0;

  for (let found = aTag.exec(html); found !== null; found = aTag.exec(html)) {
    const tag = (found[2] ?? '').toLowerCase();

    if (found[1] === '/') {
      open.pop();
      continue;
    }

    const named = aComponent.exec(found[3] ?? '');
    const name = named?.[1] ?? null;
    let at: number | null = null;

    if (name !== null) {
      for (const ancestor of open) {
        if (ancestor.at !== null && parts[ancestor.at] === name) {
          dropped.add(ancestor.at);
        }
      }

      at = parts.length;
      parts.push(name);
    }

    if (found[4] !== '/' && !closeThemselves.has(tag)) {
      open.push({ tag, at });
    }
  }

  return parts.filter((_unused, at) => !dropped.has(at));
}

/** The parts of one screen of the stage, named so a failure says which drawing it read. */
export function partsOfTheScreen(mockups: Mockups, key: string): string[] {
  const screen = mockups.screens[key];

  if (screen === undefined) {
    throw new Error(
      `the mockups stage holds no screen called "${key}", and it holds ${screenKeysOf(mockups).length}`,
    );
  }

  return partsOf(screen.html);
}

export interface MockupRow {
  /**
   * The screen key the drawing sends the row to, or null where the drawing sends it nowhere. The
   * lock row of Privacy is the second kind: it states what the lock is doing rather than opening
   * anything.
   */
  readonly to: string | null;
}

const aListItem = /<li\b((?:"[^"]*"|'[^']*'|[^>])*)>/g;
const aClass = /class="([^"]*)"/;
const aDestination = /data-to="([^"]*)"/;

/**
 * The rows of a drawing, in the order it places them.
 *
 * A row is read for where it goes and never for the words it carries, for the same reason the
 * parts above are: the wording is the catalogue's to settle in three languages, and the drawing is
 * a draft of it. Where it goes is the drawing's own decision, so that is what a built screen is
 * held to.
 */
export function rowsOf(html: string): MockupRow[] {
  const rows: MockupRow[] = [];

  aListItem.lastIndex = 0;

  for (let found = aListItem.exec(html); found !== null; found = aListItem.exec(html)) {
    const attributes = found[1] ?? '';
    const classes = (aClass.exec(attributes)?.[1] ?? '').split(/\s+/);

    if (!classes.includes('row')) {
      continue;
    }

    rows.push({ to: aDestination.exec(attributes)?.[1] ?? null });
  }

  return rows;
}

/**
 * The rows of one screen of the stage. A drawing with no row is refused rather than answered with
 * an empty list, because a comparison against nothing reads exactly like one every row answered.
 */
export function rowsOfTheScreen(mockups: Mockups, key: string): MockupRow[] {
  const screen = mockups.screens[key];

  if (screen === undefined) {
    throw new Error(
      `the mockups stage holds no screen called "${key}", and it holds ${screenKeysOf(mockups).length}`,
    );
  }

  const rows = rowsOf(screen.html);

  if (rows.length === 0) {
    throw new Error(`the mockup screen "${key}" draws no row, and nothing can be held to no row`);
  }

  return rows;
}

/** Every test file under the application, as paths from the root of the repository. */
export function testFilesOf(root: string): string[] {
  const found: string[] = [];

  const walk = (directory: string): void => {
    for (const entry of readdirSync(join(root, directory)).sort()) {
      const path = join(directory, entry);

      if (statSync(join(root, path)).isDirectory()) {
        walk(path);
        continue;
      }

      if (testExtensions.includes(extname(entry)) && path !== theFixture) {
        found.push(path);
      }
    }
  };

  if (existsSync(join(root, testRoot))) {
    walk(testRoot);
  }

  return found;
}

export interface NamedKeys {
  /** Every screen key a test hands to the fixture, sorted and each one named once. */
  readonly keys: string[];
  /** A call whose first argument is not a literal, which the scan cannot read. */
  readonly unreadable: string[];
}

/**
 * The screen keys a source file names. The key has to be written out at the call, because a key
 * built at run time is a key this gate cannot check and a drawing nobody can tell is missing.
 */
export function screenKeysNamedIn(file: string, source: string): NamedKeys {
  const keys = new Set<string>();
  const unreadable: string[] = [];

  for (const call of fixtureCalls) {
    const written = new RegExp(`\\b${call}\\s*\\(\\s*(.)`, 'g');

    for (let found = written.exec(source); found !== null; found = written.exec(source)) {
      const opens = found[1];

      if (opens !== "'" && opens !== '"') {
        unreadable.push(`${file} calls ${call} with a key that is not written out at the call`);
        continue;
      }

      const literal = new RegExp(`\\b${call}\\s*\\(\\s*${opens}([^${opens}]*)${opens}`, 'y');
      literal.lastIndex = found.index;
      const read = literal.exec(source);

      if (read?.[1] === undefined || read[1].length === 0) {
        unreadable.push(`${file} calls ${call} with a key that is not written out at the call`);
        continue;
      }

      keys.add(read[1]);
    }
  }

  return { keys: [...keys].sort(), unreadable };
}

export function screenKeysNamedUnder(root: string, files: readonly string[]): NamedKeys {
  const keys = new Set<string>();
  const unreadable: string[] = [];

  for (const file of files) {
    const named = screenKeysNamedIn(file, readFileSync(join(root, file), 'utf8'));

    for (const key of named.keys) {
      keys.add(key);
    }

    unreadable.push(...named.unreadable);
  }

  return { keys: [...keys].sort(), unreadable };
}

/** A stage that arrives short of what it delivered has lost a drawing on the way here. */
export function deliveryProblems(screens: readonly string[]): string[] {
  if (screens.length >= screensDelivered) {
    return [];
  }

  return [
    `${mockupsArtifact} holds ${screens.length} screen(s), under the ${screensDelivered} the stage delivered, so a drawing was lost between the stage and this file`,
  ];
}

/** A test that names a drawing the stage does not hold is proving itself against nothing. */
export function namedKeyProblems(named: readonly string[], screens: readonly string[]): string[] {
  return named
    .filter((key) => !screens.includes(key))
    .map(
      (key) =>
        `a test names the mockup screen "${key}", and ${mockupsArtifact} holds no screen of that name`,
    );
}

/** A drawing whose markup names no part cannot be compared against anything. */
export function partlessProblems(mockups: Mockups): string[] {
  return screenKeysOf(mockups)
    .filter((key) => partsOfTheScreen(mockups, key).length === 0)
    .map(
      (key) =>
        `the mockup screen "${key}" names no part, so nothing built against it can be held to it`,
    );
}

/**
 * The count is the check. A suite that names no drawing at all reads exactly like a suite that
 * holds every screen to its drawing, and the second one is the only one worth having.
 */
export function readNothingProblems(named: readonly string[]): string[] {
  if (named.length > 0) {
    return [];
  }

  return [
    `no test under ${testRoot} names a mockup screen, so this check read no screen at all and proved nothing`,
  ];
}

export interface MockupCheck {
  readonly screens: string[];
  readonly named: string[];
  readonly said: string;
  readonly problems: string[];
}

export function mockupProblems(mockups: Mockups, named: NamedKeys): MockupCheck {
  const screens = screenKeysOf(mockups);
  const problems = [
    ...deliveryProblems(screens),
    ...namedKeyProblems(named.keys, screens),
    ...partlessProblems(mockups),
    ...readNothingProblems(named.keys),
    ...named.unreadable,
  ];

  return {
    screens,
    named: [...named.keys],
    said: `${named.keys.length} screen(s) held against ${screens.length} drawing(s) in ${mockupsArtifact}`,
    problems,
  };
}
