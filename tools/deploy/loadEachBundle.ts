import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { entriesIn } from './archive.ts';
import {
  archiveNameOf,
  buildDirectory,
  bundleFileName,
  deployedFunctions,
  handlerName,
} from './functions.ts';

/**
 * Loads every bundle the way the platform loads it, and refuses the ones it cannot.
 *
 * An import in node proves that a file parses. It says nothing about whether the runtime can find
 * the handler, and that is the fault that costs a deploy: a runtime resolves an entry point its own
 * way, and a handler it cannot resolve fails on the first real invocation. So each bundle is
 * unpacked, put where the function would be given it, and invoked through the runtime interface
 * emulator that the official base image carries.
 *
 * Three things make this refuse rather than report a pass it did not earn. A run with no bundle
 * fails, because a loop over an empty list reports success just the same. A run that cannot start
 * the image fails and says so, rather than skipping. An answer that is not the one the function owes
 * fails with what the emulator returned.
 */

/** The official base image for the runtime `infra/lambda.tf` sets on every function. */
export const baseImage = 'public.ecr.aws/lambda/nodejs:22';

/** The port the emulator listens on inside the image. */
const portInsideTheImage = 8080;

/** The port it is reached on here. */
const port = 9000;

const invocationAddress = `http://localhost:${port}/2015-03-31/functions/function/invocations`;

/** How long the emulator is given to answer the first request, which includes its own start. */
const readyWithinMilliseconds = 60_000;

interface LoadCheck {
  /** An event the function can answer with no account behind it. */
  readonly event: unknown;
  /** What the answer owes, read from the answer itself. */
  readonly owes: (answer: unknown) => boolean;
  /** The sentence a failure prints, which says what was owed. */
  readonly describes: string;
}

function fieldOf(answer: unknown, name: string): unknown {
  return typeof answer === 'object' && answer !== null && name in answer
    ? (answer as Readonly<Record<string, unknown>>)[name]
    : undefined;
}

/**
 * One check for each function, by name. A function in the list with no check here fails the run, so
 * a bundle cannot join the deploy without an event that proves it answers.
 */
export const loadChecks: Readonly<Record<string, LoadCheck>> = {
  'emi-authorizer': {
    event: {
      rawPath: '/v1/records',
      headers: {},
      requestContext: { http: { method: 'GET' } },
    },
    owes: (answer) => fieldOf(answer, 'isAuthorized') === false,
    describes: 'a request carrying no signature is refused',
  },
  'emi-vault': {
    event: {
      rawPath: '/v1/nothing-is-here',
      headers: {},
      requestContext: { http: { method: 'GET' } },
    },
    owes: (answer) => fieldOf(answer, 'statusCode') === 404,
    describes: 'a path no route names is answered 404',
  },
  'emi-articles': {
    event: {
      rawPath: '/v1/articles/nothing-is-here',
      pathParameters: { phase: 'nothing-is-here' },
      headers: {},
      requestContext: { http: { method: 'GET' } },
    },
    owes: (answer) => fieldOf(answer, 'statusCode') === 404,
    describes: 'a phase this product does not know is answered 404',
  },
};

function ran(command: string, args: readonly string[]): { status: number; output: string } {
  const run = spawnSync(command, args, { encoding: 'utf8' });

  return { status: run.status ?? 1, output: `${run.stdout ?? ''}${run.stderr ?? ''}`.trim() };
}

function refuse(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function answered(event: unknown, until: number): Promise<unknown> {
  for (;;) {
    try {
      const response = await fetch(invocationAddress, {
        method: 'POST',
        body: JSON.stringify(event),
      });

      return (await response.json()) as unknown;
    } catch (thrown) {
      if (Date.now() >= until) {
        throw thrown;
      }

      await new Promise((carryOn) => setTimeout(carryOn, 250));
    }
  }
}

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const given = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const builtInto = given === undefined ? join(repositoryRoot, buildDirectory) : resolve(given);

const docker = ran('docker', ['--version']);

if (docker.status !== 0) {
  refuse(`this check runs every bundle in a container and Docker is missing: ${docker.output}`);
}

process.stdout.write(`${docker.output}\n`);

if (deployedFunctions.length === 0) {
  refuse('the list of functions is empty, so this check loaded no bundle at all');
}

for (const held of deployedFunctions) {
  const check = loadChecks[held.name];

  if (check === undefined) {
    refuse(`${held.name} is deployed and no event here proves that its bundle answers`);
  }

  const archive = join(builtInto, archiveNameOf(held));
  let bytes: Buffer;

  try {
    bytes = readFileSync(archive);
  } catch {
    refuse(`${archive} is not there, so there is no bundle of ${held.name} to load`);
  }

  const entries = entriesIn(bytes);
  const bundle = entries.find((entry) => entry.name === bundleFileName);

  if (bundle === undefined) {
    const names = entries.map((entry) => entry.name).join(', ');

    refuse(`${archive} holds no ${bundleFileName} at its root, only: ${names}`);
  }

  const taskRoot = mkdtempSync(join(tmpdir(), `${held.name}-`));

  writeFileSync(join(taskRoot, bundleFileName), bundle.contents);

  const started = ran('docker', [
    'run',
    '--rm',
    '--detach',
    '--publish',
    `${port}:${portInsideTheImage}`,
    '--volume',
    `${taskRoot}:/var/task:ro`,
    baseImage,
    `index.${handlerName}`,
  ]);

  if (started.status !== 0) {
    rmSync(taskRoot, { force: true, recursive: true });
    refuse(`the image would not start for ${held.name}: ${started.output}`);
  }

  const container = started.output.split('\n').pop() ?? '';
  let answer: unknown;
  let failure: string | null = null;

  try {
    answer = await answered(check.event, Date.now() + readyWithinMilliseconds);
  } catch (thrown) {
    failure = `${held.name} answered nothing: ${String(thrown)}`;
  }

  if (failure === null && !check.owes(answer)) {
    failure = `${held.name} owes that ${check.describes}, and answered ${JSON.stringify(answer)}`;
  }

  if (failure !== null) {
    process.stderr.write(`${ran('docker', ['logs', container]).output}\n`);
  }

  ran('docker', ['rm', '--force', container]);
  rmSync(taskRoot, { force: true, recursive: true });

  if (failure !== null) {
    refuse(failure);
  }

  process.stdout.write(
    `${held.name}: ${check.describes}, and it answered ${JSON.stringify(answer)}\n`,
  );
}

process.stdout.write(`${deployedFunctions.length} bundles load the way the platform loads them\n`);
