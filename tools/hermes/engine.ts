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
 *
 * Everything below is chosen by the platform it runs on. A tier that reads one platform's name out
 * of a string is a tier that is green on the pipeline and red on a laptop, which is the same shape
 * as the defect it was built to catch.
 */

/** The release this tier runs. A version is pinned, because an engine that moves is not a test. */
export const hermesVersion = 'v0.13.0';

/** What one platform downloads, and the digest it must have. */
export interface EngineArchive {
  /** The file in the release. */
  readonly file: string;
  /** The sha256 of that file, so a swapped artifact fails here rather than running. */
  readonly digest: string;
  /** The member inside the archive that is the virtual machine. */
  readonly member: string;
}

/**
 * The archives this tier is pinned to, by the name node calls the platform. The darwin one is a
 * universal binary and carries both an x86-64 and an arm64 Mach-O, so it runs on either Mac.
 *
 * The release carries a Windows archive too, and it is deliberately not here: nothing has run it,
 * so a digest written from the file alone would be a claim nobody checked.
 */
export const hermesArchives: Readonly<Record<string, EngineArchive>> = {
  linux: {
    file: 'hermes-cli-linux.tar.gz',
    digest: 'aead6eb0b8f563bb022354352eae32dad96c933330b6c1941b6db17674ca68ae',
    member: './hermes',
  },
  darwin: {
    file: 'hermes-cli-darwin.tar.gz',
    digest: 'f16b0214f7b96eccbd47766f5a3914e847a4387649b2f6b60820d309879200bd',
    member: './hermes',
  },
};

/** The archive one platform takes, or a refusal naming the platform and what it did not find. */
export function hermesArchiveFor(platform: string = process.platform): EngineArchive {
  const held = hermesArchives[platform];

  if (held === undefined) {
    throw new Error(
      `this tier has no engine for ${platform}. Release ${hermesVersion} is pinned for ` +
        `${Object.keys(hermesArchives).sort().join(' and ')}, and nothing here names an archive ` +
        `or a digest for ${platform}. Add one to hermesArchives with the file from the release, ` +
        `its sha256, and the member inside it, and run the tier once on that platform.`,
    );
  }

  return held;
}

export function hermesArchiveUrl(
  platform: string = process.platform,
  version: string = hermesVersion,
): string {
  return `https://github.com/facebook/hermes/releases/download/${version}/${hermesArchiveFor(platform).file}`;
}

/**
 * Where the engine is kept, which is inside the install so nothing has to ignore it. The platform
 * is part of the path, so a machine that once held another platform's binary reads nothing of it.
 */
export function hermesHome(
  root: string,
  platform: string = process.platform,
  version: string = hermesVersion,
): string {
  return join(root, 'node_modules', '.cache', 'hermes', version, platform);
}

export function hermesPath(
  root: string,
  platform: string = process.platform,
  version: string = hermesVersion,
): string {
  return join(hermesHome(root, platform, version), 'hermes');
}

/**
 * The archive, fetched with curl rather than with the runtime's own fetch. The test runner puts
 * the React Native fetch in front of the node one, and that one reaches no network.
 */
function fetchTheArchive(url: string, into: string): void {
  const run = spawnSync(
    'curl',
    ['--fail', '--location', '--silent', '--show-error', '--output', into, url],
    { encoding: 'utf8' },
  );

  if (run.status !== 0) {
    throw new Error(`${url} could not be read: ${run.stderr}`);
  }
}

/**
 * The engine, downloaded once and kept. Only the virtual machine is taken out of the archive: the
 * compiler and the debugger beside it are another hundred megabytes nothing here runs.
 */
export function theEngine(root: string, platform: string = process.platform): string {
  const binary = hermesPath(root, platform);

  if (existsSync(binary)) {
    return binary;
  }

  const wanted = hermesArchiveFor(platform);
  const url = hermesArchiveUrl(platform);
  const home = hermesHome(root, platform);

  mkdirSync(home, { recursive: true });

  const archive = join(home, wanted.file);
  fetchTheArchive(url, archive);

  const held = createHash('sha256').update(readFileSync(archive)).digest('hex');

  if (held !== wanted.digest) {
    rmSync(archive, { force: true });
    throw new Error(
      `${url} is not the archive this tier pins: ${held} rather than ${wanted.digest}`,
    );
  }

  const taken = spawnSync('tar', ['xzf', archive, '-C', home, wanted.member], {
    encoding: 'utf8',
  });

  if (taken.status !== 0 || !existsSync(binary)) {
    throw new Error(`the archive held no ${wanted.member}: ${taken.stderr}`);
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

/**
 * Runs one program on the engine and hands back what it printed.
 *
 * A run that did not run is refused here rather than answered with an empty string. A binary built
 * for another platform answers a status and no output at all, and a caller reading that as an
 * answer reports that the engine said nothing, which tells nobody what happened. This is the one
 * place that knows, so this is the place that says it.
 */
export function runOnHermes(binary: string, program: string): HermesRun {
  const directory = mkdtempSync(join(tmpdir(), 'emi-hermes-'));
  const file = join(directory, 'program.js');

  writeFileSync(file, program, 'utf8');

  try {
    const run = spawnSync(binary, [file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const stderr = run.stderr ?? '';

    if (run.error !== undefined || run.status !== 0) {
      const spawned =
        run.error === undefined ? '' : ` The run itself failed with ${run.error.message}.`;

      throw new Error(
        `the engine at ${binary} answered status ${String(run.status)} rather than running the ` +
          `program, on ${process.platform} ${process.arch}.${spawned} It said ` +
          `${JSON.stringify(stderr)}.`,
      );
    }

    return { status: run.status, stdout: run.stdout ?? '', stderr };
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

export function repositoryRootFrom(here: string): string {
  return resolve(here, '..', '..');
}

/**
 * Where each platform's copy of the compiler sits inside the installed package. All three are
 * installed beside each other, so this is a lookup and never a download.
 */
export const compilerDirectories: Readonly<Record<string, string>> = {
  linux: 'linux64-bin',
  darwin: 'osx-bin',
  win32: 'win64-bin',
};

/**
 * The compiler the build ships, which is a different thing from the engine above: this one is the
 * version React Native carries, and it reads the syntax the phone's engine reads. A program it
 * refuses is a program the phone could not load.
 */
export function thePhonesCompiler(root: string, platform: string = process.platform): string {
  const directory = compilerDirectories[platform];

  if (directory === undefined) {
    throw new Error(
      `the installed compiler has no build for ${platform}. It carries ` +
        `${Object.values(compilerDirectories).sort().join(', ')}, which are ` +
        `${Object.keys(compilerDirectories).sort().join(', ')}.`,
    );
  }

  const file = platform === 'win32' ? 'hermesc.exe' : 'hermesc';

  return join(root, 'node_modules', 'hermes-compiler', 'hermesc', directory, file);
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
