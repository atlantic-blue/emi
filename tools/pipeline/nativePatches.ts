import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The shape the installed copy of a native package must have for the iOS build to compile, held
 * against the files on disk.
 *
 * An install rewrites node_modules, so a change made by hand inside it is gone the next time
 * anybody installs. patch-package puts a change this repository makes back from `patches/` on
 * postinstall, and it reports a patch it could not match as a warning and still exits 0, so the
 * exit code of the install says nothing. This reads the installed files instead, and the iOS build
 * that needs them is the reason it runs in the pipeline: the pipeline runs on Linux and cannot
 * build the application, so reading the files is the only proof it can offer.
 *
 * expo-modules-jsi carried these three shapes as a patch of this repository until 57.1.3, which
 * took all three upstream. The reading stays, because a copy older than that carries none of them.
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

/**
 * A package whose installed sources the iOS build needs a particular shape of, and what that shape
 * is. `patch` names the patch file that puts it there, or is null where the package carries the
 * shape itself.
 */
export interface PatchedPackage {
  readonly name: string;
  readonly patch: string | null;
  /** Read exactly when a patch is written against it, and as a floor when none is. */
  readonly version: string;
  readonly changes: readonly Change[];
}

const runtimeFile = 'apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift';

export const patchedPackages: readonly PatchedPackage[] = [
  {
    name: 'expo-modules-jsi',
    patch: null,
    version: '57.1.3',
    changes: [
      {
        name: 'the two scheduler constructors claim no retained return',
        file: 'apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h',
        gone: ['SWIFT_RETURNS_RETAINED RuntimeScheduler('],
        there: [
          { text: '  RuntimeScheduler(void *scheduler, ScheduleFn fn) noexcept', times: 1 },
          { text: '  RuntimeScheduler() noexcept {}', times: 1 },
          {
            text: 'static RuntimeScheduler *create(void *scheduler, ScheduleFn fn) noexcept SWIFT_RETURNS_RETAINED {',
            times: 1,
          },
          { text: 'static RuntimeScheduler *create() noexcept SWIFT_RETURNS_RETAINED {', times: 1 },
        ],
      },
      {
        name: 'the pointer wrapper exists',
        file: 'apple/Sources/ExpoModulesJSI/Utilities/UncheckedSendable.swift',
        gone: [],
        there: [
          { text: 'internal struct UncheckedSendable<Value>: @unchecked Sendable {', times: 1 },
          { text: 'let value: Value', times: 1 },
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
          { text: 'let thisPtr = UncheckedSendable(thisPtr)', times: 2 },
          { text: 'let argumentsPtr = UncheckedSendable(argumentsPtr)', times: 2 },
          { text: 'let resultPtr = UncheckedSendable(resultPtr)', times: 3 },
          { text: 'thisPtr.value', times: 2 },
          { text: 'argumentsPtr.value', times: 2 },
          { text: 'resultPtr.value', times: 3 },
        ],
      },
    ],
  },
];

/** What the install must run for any of this to happen at all. */
export const postinstallCommand = 'patch-package';
export const patchTool = 'patch-package';

/** True when the installed version is the floor or above it, read part by part. */
function readsAtOrAbove(installed: string, floor: string): boolean {
  const left = installed.split('.');
  const right = floor.split('.');

  for (let index = 0; index < right.length; index += 1) {
    const here = Number(left[index]);

    if (!Number.isInteger(here)) {
      return false;
    }

    const wanted = Number(right[index]);

    if (here !== wanted) {
      return here > wanted;
    }
  }

  return true;
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

export function patchProblems(
  root: string,
  packages: readonly PatchedPackage[] = patchedPackages,
): PatchResult {
  const problems: string[] = [...installProblems(root)];
  let applied = 0;
  let rules = 0;

  for (const entry of packages) {
    const patch = entry.patch;

    if (patch !== null && !existsSync(join(root, patch))) {
      problems.push(`${patch} is not in the repository, so an install has nothing to apply`);
    }

    const directory = installedDirectoryOf(entry);
    const manifest = manifestAt(join(root, directory, 'package.json'));

    if (manifest === null) {
      problems.push(`${directory} is not installed, so the changes it carries cannot be read`);
      continue;
    }

    if (patch === null) {
      if (!readsAtOrAbove(manifest.version ?? '', entry.version)) {
        problems.push(
          `${entry.name} is installed at ${String(manifest.version)} and the changes below ` +
            `arrived in ${entry.version}, so an older copy carries none of them`,
        );
      }
    } else if (manifest.version !== entry.version) {
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
