import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The changes this repository makes to an installed package, held against the files on disk.
 *
 * An install rewrites node_modules, so a change made by hand inside it is gone the next time
 * anybody installs. patch-package puts each change back from `patches/` on postinstall. It reports
 * a patch it could not match as a warning and still exits 0, so the exit code of the install says
 * nothing. This reads the installed files instead, and the iOS build that needs them is the reason
 * it runs in the pipeline: the pipeline runs on Linux and cannot build the application, so reading
 * the files is the only proof it can offer.
 *
 * The root is passed in so a test can point the same readers at a fixture tree rather than at this
 * repository.
 */

/** Text that must appear in a file, and the number of times it must appear. */
export interface Occurrence {
  readonly text: string;
  readonly times: number;
}

/** One change the patch makes to one file. */
export interface Change {
  /** What the change does, written as the failure names it. */
  readonly name: string;
  /** The file it changes, under the installed package. */
  readonly file: string;
  /** Text the change takes out, which may appear no times at all. */
  readonly gone: readonly string[];
  /** Text the change puts in, with the count that proves every site was changed. */
  readonly there: readonly Occurrence[];
}

/** A package the repository patches, and what the patch does to it. */
export interface PatchedPackage {
  readonly name: string;
  readonly version: string;
  readonly changes: readonly Change[];
}

const runtimeFile = 'apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift';

export const patchedPackages: readonly PatchedPackage[] = [
  {
    name: 'expo-modules-jsi',
    version: '57.1.0',
    changes: [
      {
        name: 'the two scheduler constructors claim no retained return',
        file: 'apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h',
        gone: ['SWIFT_RETURNS_RETAINED'],
        there: [
          { text: '  RuntimeScheduler(void *scheduler, ScheduleFn fn) noexcept', times: 1 },
          { text: '  RuntimeScheduler() {}', times: 1 },
        ],
      },
      {
        name: 'the two pointer wrappers exist',
        file: 'apple/Sources/ExpoModulesJSI/Utilities/NonisolatedUnsafeVar.swift',
        gone: [],
        there: [
          {
            text: 'internal struct NonisolatedUnsafePointer<Pointee: ~Copyable>: @unchecked Sendable {',
            times: 1,
          },
          {
            text: 'internal struct NonisolatedUnsafeMutablePointer<Pointee: ~Copyable>: @unchecked Sendable {',
            times: 1,
          },
          { text: 'let pointer: UnsafePointer<Pointee>', times: 1 },
          { text: 'let pointer: UnsafeMutablePointer<Pointee>', times: 1 },
        ],
      },
      {
        name: 'every raw pointer crosses a host call inside a wrapper',
        file: runtimeFile,
        gone: [
          'nonisolated(unsafe) let thisPtr = thisPtr',
          'nonisolated(unsafe) let argumentsPtr = argumentsPtr',
          'nonisolated(unsafe) let resultPtr = resultPtr',
        ],
        there: [
          { text: 'NonisolatedUnsafePointer(thisPtr)', times: 2 },
          { text: 'NonisolatedUnsafePointer(argumentsPtr)', times: 2 },
          { text: 'NonisolatedUnsafeMutablePointer(resultPtr)', times: 3 },
          { text: 'thisBox.pointer', times: 2 },
          { text: 'argumentsBox.pointer', times: 2 },
          { text: 'resultBox.pointer', times: 3 },
        ],
      },
    ],
  },
];

/** What the install must run for any of this to happen at all. */
export const postinstallCommand = 'patch-package';
export const patchTool = 'patch-package';

export function patchFileOf(entry: PatchedPackage): string {
  return join('patches', `${entry.name}+${entry.version}.patch`);
}

export function installedDirectoryOf(entry: PatchedPackage): string {
  return join('node_modules', entry.name);
}

function countOf(text: string, wanted: string): number {
  return text.split(wanted).length - 1;
}

interface Manifest {
  readonly version?: string;
  readonly scripts?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

function manifestAt(path: string): Manifest | null {
  if (!existsSync(path)) {
    return null;
  }

  return JSON.parse(readFileSync(path, 'utf8')) as Manifest;
}

/** The root manifest has to ask for the patches, or nothing applies them. */
export function installProblems(root: string): string[] {
  const manifest = manifestAt(join(root, 'package.json'));

  if (manifest === null) {
    return ['the root holds no package.json, so nothing says how an install applies the patches'];
  }

  const problems: string[] = [];
  const postinstall = manifest.scripts?.postinstall;

  if (postinstall === undefined || !postinstall.includes(postinstallCommand)) {
    problems.push(
      `package.json has no postinstall script running ${postinstallCommand}, so an install ` +
        'leaves every patch on the floor',
    );
  }

  if (manifest.devDependencies?.[patchTool] === undefined) {
    problems.push(
      `package.json does not name ${patchTool} as a development dependency, so the postinstall ` +
        'script has nothing to run',
    );
  }

  return problems;
}

export interface PatchResult {
  /** The problems, one line each, empty when every change is on disk. */
  readonly problems: string[];
  /** The changes that were read and found whole. */
  readonly applied: number;
  /** The rules that were read, counting each piece of text looked for. */
  readonly rules: number;
}

export function patchProblems(root: string): PatchResult {
  const problems: string[] = [...installProblems(root)];
  let applied = 0;
  let rules = 0;

  for (const entry of patchedPackages) {
    const patch = patchFileOf(entry);

    if (!existsSync(join(root, patch))) {
      problems.push(`${patch} is not in the repository, so an install has nothing to apply`);
    }

    const directory = installedDirectoryOf(entry);
    const manifest = manifestAt(join(root, directory, 'package.json'));

    if (manifest === null) {
      problems.push(`${directory} is not installed, so the changes it carries cannot be read`);
      continue;
    }

    if (manifest.version !== entry.version) {
      problems.push(
        `${entry.name} is installed at ${String(manifest.version)} and ${patch} is written ` +
          `against ${entry.version}, so patch-package warns and applies nothing`,
      );
    }

    for (const change of entry.changes) {
      const file = join(directory, change.file);
      const path = join(root, file);

      if (!existsSync(path)) {
        problems.push(`${file} is not installed, so "${change.name}" cannot be read`);
        continue;
      }

      const contents = readFileSync(path, 'utf8');
      const before = problems.length;

      for (const gone of change.gone) {
        rules += 1;
        const found = countOf(contents, gone);

        if (found > 0) {
          problems.push(
            `${file} still holds "${gone}" ${found} time(s), so "${change.name}" is not applied`,
          );
        }
      }

      for (const occurrence of change.there) {
        rules += 1;
        const found = countOf(contents, occurrence.text);

        if (found !== occurrence.times) {
          problems.push(
            `${file} holds "${occurrence.text}" ${found} time(s) and the change needs ` +
              `${occurrence.times}, so "${change.name}" is not applied`,
          );
        }
      }

      if (problems.length === before) {
        applied += 1;
      }
    }
  }

  if (rules === 0) {
    problems.push(
      'no rule was read, so this check proved nothing and a green line here means nothing',
    );
  }

  return { problems, applied, rules };
}
