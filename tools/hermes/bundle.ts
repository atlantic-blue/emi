import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { transformSync } from '@babel/core';

/**
 * One file of the application, and everything it imports, written out as a single program the
 * engine can run. Hermes has no module loader, so the modules are wrapped and handed a `require`
 * of their own.
 *
 * A bare specifier is a package, and a package is not source this tier can run. Each one is named
 * by the caller with the value it stands for, so every stand in is visible in the test that asked
 * for it rather than hidden here.
 */

export const sourceExtensions: readonly string[] = ['.ts', '.tsx', '.js', '.jsx'];

/** The file a specifier names, as the runtime would resolve it. */
export function resolveFrom(from: string, specifier: string): string {
  const path = resolve(dirname(from), specifier);

  // A directory of that name is not the module: it holds one. The candidates are files, and the
  // index inside the directory is tried after all of them.
  for (const candidate of [path, ...sourceExtensions.map((extension) => `${path}${extension}`)]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  for (const extension of sourceExtensions) {
    const inside = join(path, `index${extension}`);

    if (existsSync(inside)) {
      return inside;
    }
  }

  throw new Error(`${from} imports ${specifier}, and no file of that name is on disk`);
}

/**
 * The file a workspace package starts at, or nothing where the specifier names an installed
 * package. A workspace is source in this repository, so this tier runs it; anything else is an
 * install or native code, and the caller says what it stands for.
 */
export function workspaceEntry(root: string, specifier: string): string | null {
  const manifest = join(root, 'node_modules', specifier, 'package.json');

  if (!existsSync(manifest)) {
    return null;
  }

  const held = JSON.parse(readFileSync(manifest, 'utf8')) as { main?: string };
  const entry = realpathSync(join(dirname(manifest), held.main ?? 'index.js'));

  const inside = relative(realpathSync(root), entry);

  // A workspace resolves to source in this repository. An installed package resolves inside
  // node_modules, and an install is not source this tier runs.
  return inside.startsWith('..') || inside.startsWith('node_modules') ? null : entry;
}

/** Every specifier a module names, in the order it names them. */
export function specifiersIn(code: string): string[] {
  const found = new Set<string>();

  for (const match of code.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) {
    found.add(match[1] as string);
  }

  return [...found];
}

/**
 * How far the syntax is written down. The released command line engine predates the class, so a
 * program it runs is written as `es5`. The compiler the build ships is current, so a program it
 * reads keeps the syntax the source wrote, which is what `modern` is for.
 */
export type SyntaxLevel = 'es5' | 'modern';

const targetFor: Readonly<Record<SyntaxLevel, Record<string, string>>> = {
  es5: { ie: '11' },
  modern: { node: '18' },
};

/** The source with its types taken off and its modules turned into the shape a bundle wraps. */
export function asCommonJs(file: string, source: string, syntax: SyntaxLevel = 'es5'): string {
  const transformed = transformSync(source, {
    filename: file,
    babelrc: false,
    configFile: false,
    presets: [
      ['@babel/preset-env', { targets: targetFor[syntax], modules: 'commonjs' }],
      ['@babel/preset-typescript', { allExtensions: true, isTSX: file.endsWith('x') }],
    ],
  });

  if (transformed?.code === undefined || transformed.code === null) {
    throw new Error(`${file} produced no code`);
  }

  return transformed.code;
}

export interface Bundle {
  readonly program: string;
  /** Every source file the bundle holds, written from the root, so a test can say what it ran. */
  readonly files: string[];
  /** Every bare specifier a stand in answered, so a test can say what it did not run. */
  readonly standIns: string[];
}

export interface BundleRequest {
  readonly root: string;
  /** How far the syntax is written down. Everything the engine runs here is `es5`. */
  readonly syntax?: SyntaxLevel;
  /** The file the program starts at, written from the root. */
  readonly entry: string;
  /**
   * What each package specifier stands for, as a line of JavaScript the engine evaluates. A
   * package is native code or an install, and this tier runs neither.
   */
  readonly standIns?: Readonly<Record<string, string>>;
}

/**
 * The program, ending in the entry module's exports held in `__entry`. Nothing is printed here:
 * the caller writes what it wants to read, so the assertions live in the test and the engine only
 * answers.
 */
export function bundleForHermes(request: BundleRequest): Bundle {
  const standIns = request.standIns ?? {};
  const entry = resolve(request.root, request.entry);
  const written: string[] = [];
  const held = new Map<string, string>();
  const stood = new Set<string>();

  const keyOf = (file: string): string => relative(request.root, file);

  const walk = (file: string): void => {
    const key = keyOf(file);

    if (held.has(key)) {
      return;
    }

    const code = asCommonJs(file, readFileSync(file, 'utf8'), request.syntax ?? 'es5');
    held.set(key, code);

    const map: string[] = [];

    for (const specifier of specifiersIn(code)) {
      if (specifier.startsWith('.')) {
        const next = resolveFrom(file, specifier);

        map.push(`${JSON.stringify(specifier)}: ${JSON.stringify(keyOf(next))}`);
        walk(next);
        continue;
      }

      const workspace = workspaceEntry(request.root, specifier);

      if (workspace !== null) {
        map.push(`${JSON.stringify(specifier)}: ${JSON.stringify(keyOf(workspace))}`);
        walk(workspace);
        continue;
      }

      const standIn = standIns[specifier];

      if (standIn === undefined) {
        throw new Error(
          `${key} imports the package ${specifier}, and this tier runs source and not packages. Name what it stands for.`,
        );
      }

      stood.add(specifier);
      map.push(`${JSON.stringify(specifier)}: ${JSON.stringify(`package:${specifier}`)}`);
    }

    written.push(
      `__modules[${JSON.stringify(key)}] = { names: { ${map.join(', ')} }, body: function (module, exports, require) {\n${code}\n} };`,
    );
  };

  walk(entry);

  const packages = [...stood].map(
    (specifier) =>
      `__modules[${JSON.stringify(`package:${specifier}`)}] = { names: {}, body: function (module, exports, require) { module.exports = (${standIns[specifier] as string}); } };`,
  );

  const preamble = `var __modules = {};
var __held = {};
function __require(key) {
  if (__held[key] !== undefined) { return __held[key]; }
  var found = __modules[key];
  if (found === undefined) { throw new Error('this bundle holds no ' + key); }
  var module = { exports: {} };
  __held[key] = module.exports;
  found.body(module, module.exports, function (specifier) {
    var named = found.names[specifier];
    if (named === undefined) { throw new Error(key + ' asks for ' + specifier + ', which the bundle never mapped'); }
    return __require(named);
  });
  __held[key] = module.exports;
  return module.exports;
}`;

  return {
    program: [
      preamble,
      ...packages,
      ...written,
      `var __entry = __require(${JSON.stringify(keyOf(entry))});`,
    ].join('\n\n'),
    files: [...held.keys()].sort(),
    standIns: [...stood].sort(),
  };
}
