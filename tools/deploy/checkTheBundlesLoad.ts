import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

import { buildDirectory } from './functions.ts';
import { type Answered, loadEveryBundle } from './loadEachBundle.ts';

/** The pipeline command. It runs the real Docker and writes what every bundle answered. */

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const given = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const builtInto = given === undefined ? join(repositoryRoot, buildDirectory) : resolve(given);

function run(command: string, args: readonly string[]): Answered {
  const answered = spawnSync(command, args, { encoding: 'utf8' });

  return {
    status: answered.status ?? 1,
    stdout: answered.stdout ?? '',
    stderr: answered.stderr ?? '',
  };
}

try {
  const loaded = await loadEveryBundle({
    run,
    builtInto,
    report: (line) => process.stdout.write(`${line}\n`),
  });

  process.stdout.write(`${loaded} bundles load the way the platform loads them\n`);
} catch (thrown) {
  process.stderr.write(`${thrown instanceof Error ? thrown.message : String(thrown)}\n`);
  process.exit(1);
}
