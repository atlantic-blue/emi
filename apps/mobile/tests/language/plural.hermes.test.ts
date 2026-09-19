import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { bundleForHermes } from '../../../../tools/hermes/bundle';
import {
  compileForThePhone,
  compilerDirectories,
  hermesArchiveFor,
  hermesArchiveUrl,
  hermesArchives,
  hermesPath,
  hermesVersion,
  runOnHermes,
  theEngine,
  thePhonesCompiler,
} from '../../../../tools/hermes/engine';

/**
 * The plural, read on the engine the phone runs.
 *
 * Every other test in this repository runs on node, and node carries internationalisation that
 * Hermes does not. That is how a build reached a simulator with 2243 green tests and a red box on
 * the first screen: `Intl.PluralRules` is undefined there, and `new undefined(...)` throws.
 *
 * So this file runs the real source through the real engine. It bundles
 * `apps/mobile/src/language/words.ts` and everything it imports, hands the bundle to Hermes, and
 * reads back what the engine answered.
 *
 * One thing is stood in for, and it is named below: `expo-localization` is a native module, so no
 * engine can load it and the phone's language is handed over instead. Nothing else is stood in
 * for, and the plural rule itself is the source the application ships.
 *
 * Two things this tier is not, said here rather than left to be found. The released command line
 * engine is older than the one React Native ships and it predates the class, so what it runs is
 * written down to ES5 first: it answers which globals the source reaches for, on its own
 * semantics, and not which syntax the phone parses. That half is answered by the last case, which
 * hands the source to the compiler the build itself uses.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

/** The counts that separate one rule from another, which is why each one is here. */
const theCounts = [0, 1, 2, 5, 11, 21, 22, 101];

/**
 * What each language answers at those counts. English and Spanish use two categories, so only one
 * is `one`. Russian uses three, and the ones that catch a rule written from a guess are 11, which
 * is many rather than one, and 101, which is one rather than many.
 */
const theAnswers: Readonly<Record<string, readonly string[]>> = {
  en: ['other', 'one', 'other', 'other', 'other', 'other', 'other', 'other'],
  es: ['other', 'one', 'other', 'other', 'other', 'other', 'other', 'other'],
  ru: ['many', 'one', 'few', 'many', 'many', 'one', 'few', 'one'],
};

/**
 * What the phone's engine carries under `Intl`, and nothing else. Reading the built application
 * names three constructors, `Collator`, `DateTimeFormat` and `NumberFormat`, and a search of the
 * same binary for `PluralRules` returns nothing.
 *
 * The command line engine this tier runs is built with no internationalisation at all, so the
 * three are given their names here. They are names and not implementations: this tier answers
 * which names exist, and anything that calls one is told so rather than answered wrongly.
 */
const thePhonesIntl = `
var Intl = {
  Collator: function () { throw new Error('this tier holds the name Collator and not the thing'); },
  DateTimeFormat: function () { throw new Error('this tier holds the name DateTimeFormat and not the thing'); },
  NumberFormat: function () { throw new Error('this tier holds the name NumberFormat and not the thing'); },
};
`;

/** The locale lookup is native, so the engine is handed a phone that speaks English. */
const theStandIns = {
  'expo-localization': '{ getLocales: function () { return [{ languageTag: "en-GB" }]; } }',
};

interface Answered {
  readonly ok: boolean;
  readonly error?: string;
  readonly categories?: Readonly<Record<string, readonly string[]>>;
  readonly plurals?: Readonly<Record<string, string>>;
}

function askTheEngine(binary: string): { answered: Answered; files: string[]; stderr: string } {
  const bundle = bundleForHermes({
    root: repositoryRoot,
    entry: 'apps/mobile/src/language/words.ts',
    standIns: theStandIns,
  });

  const asked = `
var __counts = ${JSON.stringify(theCounts)};
var __languages = ${JSON.stringify(Object.keys(theAnswers))};

try {
  var categories = {};

  for (var at = 0; at < __languages.length; at += 1) {
    var language = __languages[at];
    var read = [];

    for (var count = 0; count < __counts.length; count += 1) {
      read.push(__entry.pluralCategory(language, __counts[count]));
    }

    categories[language] = read;
  }

  print(JSON.stringify({
    ok: true,
    categories: categories,
    plurals: { one: __entry.words('forecast.cyclesWanted', 1), two: __entry.words('forecast.cyclesWanted', 2) },
  }));
} catch (thrown) {
  print(JSON.stringify({ ok: false, error: String(thrown && thrown.message ? thrown.message : thrown) }));
}
`;

  const run = runOnHermes(binary, `${thePhonesIntl}\n${bundle.program}\n${asked}`);
  const printed = run.stdout.trim();

  if (printed.length === 0) {
    return {
      answered: { ok: false, error: `the engine printed nothing: ${run.stderr.trim()}` },
      files: bundle.files,
      stderr: run.stderr,
    };
  }

  return {
    answered: JSON.parse(printed) as Answered,
    files: bundle.files,
    stderr: run.stderr,
  };
}

/**
 * The sentence the screen asks for, built by the function the screen calls. The red box named
 * `Learning.tsx (29:8)` above `words.ts (81:30)`, so this is that call, on the engine.
 */
function askTheScreen(binary: string): Answered {
  const bundle = bundleForHermes({
    root: repositoryRoot,
    entry: 'apps/mobile/src/features/forecast/copy.ts',
    standIns: theStandIns,
  });

  const asked = `
try {
  print(JSON.stringify({
    ok: true,
    plurals: {
      one: __entry.cyclesWantedSentence({ needsCycles: 3, completeCycles: 2 }),
      two: __entry.cyclesWantedSentence({ needsCycles: 3, completeCycles: 1 }),
    },
  }));
} catch (thrown) {
  print(JSON.stringify({ ok: false, error: String(thrown && thrown.message ? thrown.message : thrown) }));
}
`;

  const run = runOnHermes(binary, `${thePhonesIntl}\n${bundle.program}\n${asked}`);
  const printed = run.stdout.trim();

  return printed.length === 0
    ? { ok: false, error: `the engine printed nothing: ${run.stderr.trim()}` }
    : (JSON.parse(printed) as Answered);
}

describe('the words she reads, on the engine her phone runs', () => {
  let binary = '';
  let asked: ReturnType<typeof askTheEngine> | undefined = undefined;

  beforeAll(() => {
    binary = theEngine(repositoryRoot);
    asked = askTheEngine(binary);
  }, 300000);

  const answered = (): ReturnType<typeof askTheEngine> => {
    if (asked === undefined) {
      throw new Error('the engine was never asked');
    }

    return asked;
  };

  it('runs the source the application ships, and says what it ran', () => {
    expect(binary).toContain(hermesVersion);
    expect(answered().files).toContain('apps/mobile/src/language/words.ts');
    expect(answered().files.length).toBeGreaterThan(3);
  });

  it('carries the three the phone carries, and not the fourth', () => {
    const run = runOnHermes(
      binary,
      `${thePhonesIntl}
print([typeof Intl.Collator, typeof Intl.DateTimeFormat, typeof Intl.NumberFormat, typeof Intl.PluralRules].join(','));`,
    );

    expect(run.stdout.trim()).toBe('function,function,function,undefined');
  });

  it('reads a word without reaching for anything the engine does not hold', () => {
    const held = answered().answered;

    expect(held.error).toBeUndefined();
    expect(held.ok).toBe(true);
  });

  it.each(Object.keys(theAnswers))('gives %s the category the language really uses', (language) => {
    const held = answered().answered;

    expect(held.categories?.[language]).toEqual(theAnswers[language]);
  });

  it('builds the sentence through the function the screen calls', () => {
    const held = askTheScreen(binary);

    expect(held.error).toBeUndefined();
    expect(held.plurals?.one).toContain('1 more complete cycle');
    expect(held.plurals?.two).toContain('2 more complete cycles');
  });

  it('is read by the compiler the build ships, in the syntax the source wrote', () => {
    const bundle = bundleForHermes({
      root: repositoryRoot,
      entry: 'apps/mobile/src/language/words.ts',
      standIns: theStandIns,
      syntax: 'modern',
    });

    const compiled = compileForThePhone(thePhonesCompiler(repositoryRoot), bundle.program);

    expect(compiled.stderr).toBe('');
    expect(compiled.status).toBe(0);
  });

  describe('the machine this runs on', () => {
    it('takes the archive its own platform can execute', () => {
      expect(hermesArchiveFor('linux').file).toBe('hermes-cli-linux.tar.gz');
      expect(hermesArchiveFor('darwin').file).toBe('hermes-cli-darwin.tar.gz');
      expect(hermesArchiveUrl('darwin')).toContain(`${hermesVersion}/hermes-cli-darwin`);
    });

    it('pins a digest for every platform it offers, and each one is a sha256', () => {
      const named = Object.entries(hermesArchives);

      expect(named.length).toBeGreaterThan(1);

      for (const [platform, archive] of named) {
        expect(archive.digest).toMatch(/^[0-9a-f]{64}$/);
        expect(archive.file).toContain(platform === 'darwin' ? 'darwin' : platform);
      }
    });

    it('refuses a platform it has no engine for, and says what it wanted', () => {
      expect(() => hermesArchiveFor('sunos')).toThrow(/no engine for sunos/);
      expect(() => hermesArchiveFor('sunos')).toThrow(/darwin and linux/);
      expect(() => hermesArchiveFor('win32')).toThrow(/sha256/);
    });

    it('keeps each platform engine under its own name, so one cannot be read as another', () => {
      expect(hermesPath(repositoryRoot, 'darwin')).toContain('darwin');
      expect(hermesPath(repositoryRoot, 'linux')).not.toEqual(hermesPath(repositoryRoot, 'darwin'));
      expect(binary).toEqual(hermesPath(repositoryRoot));
    });

    it('takes the compiler its own platform can execute, out of the three installed', () => {
      expect(thePhonesCompiler(repositoryRoot, 'linux')).toContain('linux64-bin');
      expect(thePhonesCompiler(repositoryRoot, 'darwin')).toContain('osx-bin');
      expect(thePhonesCompiler(repositoryRoot, 'win32')).toContain('win64-bin');
      expect(thePhonesCompiler(repositoryRoot, 'win32')).toContain('hermesc.exe');
    });

    it('finds every compiler it names on disk, because the install carries all three', () => {
      const missing = Object.keys(compilerDirectories).filter(
        (platform) => !existsSync(thePhonesCompiler(repositoryRoot, platform)),
      );

      expect(missing).toEqual([]);
    });

    it('refuses a platform the install has no compiler for, and names the three it has', () => {
      expect(() => thePhonesCompiler(repositoryRoot, 'sunos')).toThrow(/no build for sunos/);
      expect(() => thePhonesCompiler(repositoryRoot, 'sunos')).toThrow(/linux64-bin/);
    });
  });

  describe('an engine that cannot run', () => {
    it('is refused rather than read as an empty answer', () => {
      expect(() => runOnHermes('/dev/null', 'print(1);')).toThrow(/\/dev\/null/);
      expect(() => runOnHermes('/dev/null', 'print(1);')).toThrow(/status/);
    });

    it('names the status and what the engine said, when the engine itself refuses', () => {
      let said = '';

      try {
        runOnHermes(binary, 'this is not a program(');
      } catch (thrown) {
        said = thrown instanceof Error ? thrown.message : String(thrown);
      }

      expect(said).toContain('status 2');
      expect(said).toContain('error:');
      expect(said).toContain(binary);
    });
  });

  it('draws the sentence that stopped the product, in both of its forms', () => {
    const held = answered().answered;

    expect(held.plurals?.one).toContain('1');
    expect(held.plurals?.two).toContain('2');
    expect(held.plurals?.one).not.toEqual(held.plurals?.two);
  });
});
