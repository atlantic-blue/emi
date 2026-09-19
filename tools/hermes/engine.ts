import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * The engine the phone runs, so a test of the phone can be run here.
 *
 * Node is not that engine. Node carries internationalisation, a crypto object and a module loader
 * that Hermes does not, so a suite that is green on node says nothing about whether the
 * application starts. This is the second tier: the same source, run on Hermes, with only what the
 * phone gives it.
 *
 * What this tier is not: the engine here is the released command line Hermes, and the engine in
 * the build is the one React Native ships. They are the same engine at different versions, and
 * what this tier proves is the class of defect rather than a version of it, which is whether the
 * source reaches for something the engine does not hold.
 */

/** The release this tier runs. A version is pinned, because an engine that moves is not a test. */
export const hermesVersion = 'v0.13.0';

/** The digest of the archive, so a swapped artifact fails here rather than running. */
export const hermesArchiveDigest =
  'aead6eb0b8f563bb022354352eae32dad96c933330b6c1941b6db17674ca68ae';

export function hermesArchiveUrl(version: string = hermesVersion): string {
  return `https://github.com/facebook/hermes/releases/download/${version}/hermes-cli-linux.tar.gz`;
}

/** Where the engine is kept, which is inside the install so nothing has to ignore it. */
export function hermesHome(root: string, version: string = hermesVersion): string {
  return join(root, 'node_modules', '.cache', 'hermes', version);
}

export function hermesPath(root: string, version: string = hermesVersion): string {
  return join(hermesHome(root, version), 'hermes');
}

/**
 * The archive, fetched with curl rather than with the runtime's own fetch. The test runner puts
 * the React Native fetch in front of the node one, and that one reaches no network.
 */
function fetchTheArchive(into: string): void {
  const run = spawnSync(
    'curl',
    ['--fail', '--location', '--silent', '--show-error', '--output', into, hermesArchiveUrl()],
    { encoding: 'utf8' },
  );

  if (run.status !== 0) {
    throw new Error(`${hermesArchiveUrl()} could not be read: ${run.stderr}`);
  }
}

/**
 * The engine, downloaded once and kept. Only the virtual machine is taken out of the archive: the
 * compiler and the debugger beside it are another hundred megabytes nothing here runs.
 */
export function theEngine(root: string): string {
  const binary = hermesPath(root);

  if (existsSync(binary)) {
    return binary;
  }

  const home = hermesHome(root);
  mkdirSync(home, { recursive: true });

  const archive = join(home, 'hermes-cli-linux.tar.gz');
  fetchTheArchive(archive);

  const held = createHash('sha256').update(readFileSync(archive)).digest('hex');

  if (held !== hermesArchiveDigest) {
    rmSync(archive, { force: true });
    throw new Error(
      `${hermesArchiveUrl()} is not the archive this tier pins: ${held} rather than ${hermesArchiveDigest}`,
    );
  }

  const taken = spawnSync('tar', ['xzf', archive, '-C', home, './hermes'], { encoding: 'utf8' });

  if (taken.status !== 0 || !existsSync(binary)) {
    throw new Error(`the archive held no ./hermes: ${taken.stderr}`);
  }

  chmodSync(binary, 0o755);
  rmSync(archive, { force: true });

  return binary;
}

export interface HermesRun {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** Runs one program on the engine and hands back what it printed. */
export function runOnHermes(binary: string, program: string): HermesRun {
  const directory = mkdtempSync(join(tmpdir(), 'emi-hermes-'));
  const file = join(directory, 'program.js');

  writeFileSync(file, program, 'utf8');

  try {
    const run = spawnSync(binary, [file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });

    return { status: run.status, stdout: run.stdout ?? '', stderr: run.stderr ?? '' };
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

export function repositoryRootFrom(here: string): string {
  return resolve(here, '..', '..');
}

/**
 * The compiler the build ships, which is a different thing from the engine above: this one is the
 * version React Native carries, and it reads the syntax the phone's engine reads. A program it
 * refuses is a program the phone could not load.
 */
export function thePhonesCompiler(root: string): string {
  return join(root, 'node_modules', 'hermes-compiler', 'hermesc', 'linux64-bin', 'hermesc');
}

export function compileForThePhone(compiler: string, program: string): HermesRun {
  const directory = mkdtempSync(join(tmpdir(), 'emi-hermesc-'));
  const file = join(directory, 'program.js');

  writeFileSync(file, program, 'utf8');

  try {
    const run = spawnSync(
      compiler,
      ['-emit-binary', '-out', join(directory, 'program.hbc'), file],
      {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      },
    );

    return { status: run.status, stdout: run.stdout ?? '', stderr: run.stderr ?? '' };
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}
