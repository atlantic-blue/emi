import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import {
  type PatchedPackage,
  installedDirectoryOf,
  patchProblems,
  patchedPackages,
} from './nativePatches';

const repositoryRoot = resolve(__dirname, '..', '..');
const command = join(repositoryRoot, 'tools', 'pipeline', 'checkPatches.ts');

const jsi = patchedPackages[0] as PatchedPackage;
const [scheduler, wrapper, runtime] = jsi.changes;

/** The same package as the repository carried it before 57.1.3 took the three changes upstream. */
const asPatched: PatchedPackage = {
  ...jsi,
  patch: join('patches', `${jsi.name}+${jsi.version}.patch`),
};

function run(...args: string[]): { status: number | null; output: string } {
  const finished = spawnSync(
    process.execPath,
    ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', command, ...args],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  return { status: finished.status, output: `${finished.stdout}${finished.stderr}` };
}

const made: string[] = [];

function write(root: string, file: string, contents: string): void {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function installedFile(change: { readonly file: string }): string {
  return join(installedDirectoryOf(jsi), change.file);
}

/**
 * A tree shaped like this repository after an install: the manifest that asks for the patches, and
 * the three files the build reads copied out of the installed package. The files are copied rather
 * than written, so a case that takes one change away is taking it out of the real text the pipeline
 * reads.
 */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'emi-patches-'));
  made.push(root);

  write(
    root,
    'package.json',
    `${JSON.stringify(
      {
        name: 'fixture',
        scripts: { postinstall: 'patch-package' },
        devDependencies: { 'patch-package': '8.0.1' },
      },
      null,
      2,
    )}\n`,
  );

  write(
    root,
    join(installedDirectoryOf(jsi), 'package.json'),
    `${JSON.stringify({ name: jsi.name, version: jsi.version }, null, 2)}\n`,
  );

  for (const change of jsi.changes) {
    const file = installedFile(change);
    write(root, file, readFileSync(join(repositoryRoot, file), 'utf8'));
  }

  return root;
}

/** Reads a fixture file, changes it, and hands back what it said before. */
function replaceIn(root: string, file: string, from: string, to: string): string {
  const path = join(root, file);
  const before = readFileSync(path, 'utf8');

  if (!before.includes(from)) {
    throw new Error(`${file} does not hold "${from}"`);
  }

  writeFileSync(path, before.split(from).join(to));

  return before;
}

afterAll(() => {
  for (const root of made) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('the three changes the iOS build needs are in the installed expo-modules-jsi', () => {
  describe('the installed tree carries every change', () => {
    it('reads a rule for every piece of text the build needs, so agreement is never an empty list', () => {
      const result = patchProblems(repositoryRoot);

      expect(jsi.changes.length).toBe(3);
      expect(result.rules).toBeGreaterThan(10);
    });

    it('finds all three changes on disk and no problem', () => {
      const result = patchProblems(repositoryRoot);

      expect(result.problems).toEqual([]);
      expect(result.applied).toBe(3);
    });

    it('says the counts and leaves with nothing to report', () => {
      const finished = run();

      expect(finished.output).toContain('3 of 3 change(s) are in the installed tree');
      expect(finished.status).toBe(0);
    });

    it('holds the same three changes on a copy of the installed files', () => {
      expect(patchProblems(fixture()).problems).toEqual([]);
    });
  });

  describe('a change missing from the installed tree', () => {
    it('names the header when the attribute comes back onto a constructor', () => {
      const root = fixture();
      const file = installedFile(scheduler as { readonly file: string });
      const before = replaceIn(
        root,
        file,
        '  RuntimeScheduler() noexcept {}',
        '  SWIFT_RETURNS_RETAINED RuntimeScheduler() noexcept {}',
      );

      expect(patchProblems(root).problems).toEqual([
        `${file} still holds "SWIFT_RETURNS_RETAINED RuntimeScheduler(" 1 time(s), so ` +
          `"${scheduler?.name}" is not applied`,
        `${file} holds "  RuntimeScheduler() noexcept {}" 0 time(s) and the change needs 1, so ` +
          `"${scheduler?.name}" is not applied`,
      ]);

      writeFileSync(join(root, file), before);
      expect(patchProblems(root).problems).toEqual([]);
    });

    it('names the utilities file when the wrapper is gone', () => {
      const root = fixture();
      const file = installedFile(wrapper as { readonly file: string });
      const before = replaceIn(
        root,
        file,
        'internal struct UncheckedSendable<Value>: @unchecked Sendable {',
        'internal struct SomethingElse {',
      );

      expect(patchProblems(root).problems).toEqual([
        `${file} holds "internal struct UncheckedSendable<Value>: @unchecked Sendable {" 0 ` +
          `time(s) and the change needs 1, so "${wrapper?.name}" is not applied`,
      ]);

      writeFileSync(join(root, file), before);
      expect(patchProblems(root).problems).toEqual([]);
    });

    it('names the runtime when one call path goes back to the old binding', () => {
      const root = fixture();
      const file = installedFile(runtime as { readonly file: string });
      const anchor =
        '    // per-call `weak`-runtime form/destroy and heap object that the owning `this` pays.\n';
      const before = replaceIn(
        root,
        file,
        anchor +
          '    let thisPtr = UncheckedSendable(thisPtr)\n' +
          '    let argumentsPtr = UncheckedSendable(argumentsPtr)\n' +
          '    let resultPtr = UncheckedSendable(resultPtr)\n',
        anchor +
          '    nonisolated(unsafe) let thisPtr = thisPtr\n' +
          '    nonisolated(unsafe) let argumentsPtr = argumentsPtr\n' +
          '    nonisolated(unsafe) let resultPtr = resultPtr\n',
      );

      const problems = patchProblems(root).problems;

      expect(problems).toContain(
        `${file} still holds "nonisolated(unsafe) let thisPtr = thisPtr" 1 time(s), so "${runtime?.name}" is not applied`,
      );
      expect(problems).toContain(
        `${file} holds "let thisPtr = UncheckedSendable(thisPtr)" 1 time(s) and the change needs 2, so "${runtime?.name}" is not applied`,
      );

      writeFileSync(join(root, file), before);
      expect(patchProblems(root).problems).toEqual([]);
    });

    it('leaves with a problem rather than a count', () => {
      const root = fixture();
      replaceIn(
        root,
        installedFile(runtime as { readonly file: string }),
        'resultPtr.value',
        'resultPtr',
      );

      const finished = run(root);

      expect(finished.output).toContain('is not applied');
      expect(finished.status).toBe(1);
    });
  });

  describe('a copy of the package that predates the changes', () => {
    it('names the version the changes arrived in, because an older one carries none of them', () => {
      const root = fixture();
      const manifest = join(installedDirectoryOf(jsi), 'package.json');
      write(root, manifest, `${JSON.stringify({ name: jsi.name, version: '57.1.2' }, null, 2)}\n`);

      expect(patchProblems(root).problems).toEqual([
        `${jsi.name} is installed at 57.1.2 and the changes below arrived in ${jsi.version}, ` +
          'so an older copy carries none of them',
      ]);
    });

    it('takes a later copy, because the changes arrived before it', () => {
      const root = fixture();
      const manifest = join(installedDirectoryOf(jsi), 'package.json');
      write(root, manifest, `${JSON.stringify({ name: jsi.name, version: '57.2.0' }, null, 2)}\n`);

      expect(patchProblems(root).problems).toEqual([]);
    });

    it('refuses a version it cannot read as numbers rather than taking it', () => {
      const root = fixture();
      const manifest = join(installedDirectoryOf(jsi), 'package.json');
      write(root, manifest, `${JSON.stringify({ name: jsi.name }, null, 2)}\n`);

      expect(patchProblems(root).problems).toEqual([
        `${jsi.name} is installed at undefined and the changes below arrived in ${jsi.version}, ` +
          'so an older copy carries none of them',
      ]);
    });
  });

  describe('a package this repository does patch itself', () => {
    it('names the patch file when the repository does not carry it', () => {
      const root = fixture();

      expect(patchProblems(root, [asPatched]).problems).toEqual([
        `${String(asPatched.patch)} is not in the repository, so an install has nothing to apply`,
      ]);
    });

    it('wants that exact version, because a patch is written against one', () => {
      const root = fixture();
      write(root, String(asPatched.patch), 'a patch the tool wrote\n');
      const manifest = join(installedDirectoryOf(jsi), 'package.json');
      write(root, manifest, `${JSON.stringify({ name: jsi.name, version: '57.2.0' }, null, 2)}\n`);

      expect(patchProblems(root, [asPatched]).problems).toEqual([
        `${jsi.name} is installed at 57.2.0 and ${String(asPatched.patch)} is written against ` +
          `${jsi.version}, so patch-package warns and applies nothing`,
      ]);
    });
  });

  describe('the install is what applies a patch', () => {
    it('names the missing postinstall script', () => {
      const root = fixture();
      write(
        root,
        'package.json',
        `${JSON.stringify({ name: 'fixture', devDependencies: { 'patch-package': '8.0.1' } }, null, 2)}\n`,
      );

      expect(patchProblems(root).problems).toEqual([
        'package.json has no postinstall script running patch-package, so an install leaves ' +
          'every patch on the floor',
      ]);
    });

    it('names the missing development dependency', () => {
      const root = fixture();
      write(
        root,
        'package.json',
        `${JSON.stringify({ name: 'fixture', scripts: { postinstall: 'patch-package' } }, null, 2)}\n`,
      );

      expect(patchProblems(root).problems).toEqual([
        'package.json does not name patch-package as a development dependency, so the ' +
          'postinstall script has nothing to run',
      ]);
    });

    it('reads both of them off this repository', () => {
      const manifest = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
        scripts: Record<string, string>;
        devDependencies: Record<string, string>;
      };

      expect(manifest.scripts.postinstall).toBe('patch-package');
      expect(manifest.devDependencies['patch-package']).toBeDefined();
    });
  });

  describe('a run that reads nothing fails rather than passing', () => {
    it('says so when the package is not installed at all', () => {
      const root = fixture();
      rmSync(join(root, installedDirectoryOf(jsi)), { recursive: true });

      expect(patchProblems(root)).toEqual({
        problems: [
          `${installedDirectoryOf(jsi)} is not installed, so the changes it carries cannot be read`,
          'no rule was read, so this check proved nothing and a green line here means nothing',
        ],
        applied: 0,
        rules: 0,
      });
    });
  });
});
