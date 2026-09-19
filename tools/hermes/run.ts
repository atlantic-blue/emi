import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { buildBundle } from './bundle.ts';
import { engineBinaryFor, engineVersion } from './engine.ts';
import { describeTierOutcome, readTierOutcome } from './outcome.ts';

/**
 * The third tier. Bundles the entry file, picks the engine for this platform, runs the bundle on
 * it, and reads what came back.
 *
 * Every other test in this repository runs on Node. Node carries globals a phone does not, and
 * the gap between them is where a crash reached a woman who had just finished the first run. This
 * is the only tier where that gap is visible.
 */

const bundleRoot = resolve(import.meta.dirname);
const repositoryRoot = resolve(bundleRoot, '..', '..');

const engine = engineBinaryFor(process.platform, repositoryRoot);
const workingDirectory = mkdtempSync(join(tmpdir(), 'emi-hermes-'));
const bundlePath = join(workingDirectory, 'tier.js');

process.stdout.write(`hermes ${engineVersion}: bundling ${bundleRoot}\n`);

try {
  await buildBundle({ bundleRoot, repositoryRoot, out: bundlePath });

  const run = spawnSync(engine, [bundlePath], { encoding: 'utf8' });

  if (run.error !== undefined) {
    throw run.error;
  }

  const output = `${run.stdout}${run.stderr}`;
  const outcome = readTierOutcome(output, run.status);

  process.stdout.write(output.endsWith('\n') || output === '' ? output : `${output}\n`);
  process.stdout.write(`${describeTierOutcome(outcome)}\n`);

  if (!outcome.passed) {
    process.exitCode = 1;
  }
} finally {
  rmSync(workingDirectory, { force: true, recursive: true });
}
