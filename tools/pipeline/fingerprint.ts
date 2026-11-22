import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * The fingerprint the Expo build service takes of the application before it queues a build, taken
 * in the pipeline so a pull request finds out rather than a release.
 *
 * Expo resolves `@expo/fingerprint` out of the installed tree, so what it runs is whatever the lock
 * file wrote. A nested dependency the lock left unsatisfied makes the call throw, the release stops
 * after the upload and before the build, and no check before the tag said anything.
 *
 * The command exits 1 when it throws, and it also exits 0 while printing its usage, so the status
 * alone is not the reading. It prints the fingerprint as one JSON object, and this reads the hash
 * and counts the sources the hash was taken over, because a fingerprint of nothing is a hash all
 * the same.
 *
 * The root is passed in so a test can point the readers at output it wrote itself rather than at a
 * run of the real command.
 */

/** The workspace Expo builds, which is the project the fingerprint is taken of. */
export const fingerprintedWorkspace = join('apps', 'mobile');

/** What the fingerprint command left behind. */
export interface FingerprintRun {
  readonly status: number | null;
  readonly output: string;
}

/** A fingerprint, as the command prints it. */
export interface Fingerprint {
  readonly hash: string;
  readonly sources: number;
}

interface PrintedFingerprint {
  readonly hash?: unknown;
  readonly sources?: unknown;
}

/**
 * The fingerprint the command printed, or undefined when the output carries none. The hash is
 * printed on a line of its own as a JSON object, and anything else the run wrote is skipped rather
 * than parsed, so a warning in front of it does not read as a missing fingerprint.
 */
export function fingerprintIn(output: string): Fingerprint | undefined {
  for (const line of output.split('\n')) {
    const text = line.trim();
    if (!text.startsWith('{')) {
      continue;
    }

    let printed: PrintedFingerprint;
    try {
      printed = JSON.parse(text) as PrintedFingerprint;
    } catch {
      continue;
    }

    if (typeof printed.hash !== 'string' || printed.hash === '') {
      continue;
    }

    return {
      hash: printed.hash,
      sources: Array.isArray(printed.sources) ? printed.sources.length : 0,
    };
  }

  return undefined;
}

/** Why the run did not compute a fingerprint, or undefined when it did. */
export function fingerprintProblem(run: FingerprintRun): string | undefined {
  if (run.status !== 0) {
    return `the fingerprint command left with status ${run.status}, saying: ${run.output.trim()}`;
  }

  const fingerprint = fingerprintIn(run.output);
  if (fingerprint === undefined) {
    return `the fingerprint command printed no fingerprint, saying: ${run.output.trim()}`;
  }
  if (fingerprint.sources === 0) {
    return `the fingerprint ${fingerprint.hash} was taken over no source`;
  }

  return undefined;
}

/**
 * Run the fingerprint command the way Expo runs it, from the copy the install wrote. `--no` refuses
 * to fetch a copy from the registry, so a tree missing the package fails here rather than quietly
 * fingerprinting with a version nobody locked.
 *
 * The printed object carries every source the hash was taken over, which runs to megabytes, so the
 * buffer is raised well past the default.
 */
export function runFingerprint(root: string): FingerprintRun {
  const run = spawnSync(
    'npx',
    ['--no', '@expo/fingerprint', 'fingerprint:generate', fingerprintedWorkspace],
    { cwd: root, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 },
  );

  if (run.error !== undefined) {
    return { status: null, output: run.error.message };
  }

  return { status: run.status, output: `${run.stdout ?? ''}${run.stderr ?? ''}` };
}
