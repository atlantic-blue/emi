import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { entriesIn } from './archive.ts';
import {
  archiveNameOf,
  bundleFileName,
  type DeployedFunction,
  deployedFunctions,
  handlerName,
} from './functions.ts';
import { telegramChallengeMetadata } from '../../services/vault/src/triggers/createAuthChallenge.ts';
import { customChallengeName } from '../../services/vault/src/triggers/defineAuthChallenge.ts';

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
export const portInsideTheImage = 8080;

/** How long one emulator is given to answer its first request, which includes its own start. */
export const readyWithinMilliseconds = 60_000;

/** What a command answered, with the two streams kept apart. */
export interface Answered {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** How a command is run, so a test drives this check without a container runtime of its own. */
export type RunsACommand = (command: string, args: readonly string[]) => Answered;

export interface LoadCheck {
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

/** One field of what a trigger answered, which the pool reads out of its response. */
function answeredField(answer: unknown, name: string): unknown {
  return fieldOf(fieldOf(answer, 'response'), name);
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
  // A body with no code is refused before the function reads a parameter, reaches Telegram or
  // touches the pool, so a bundle with no account behind it owes this answer.
  'emi-sign-in-telegram': {
    event: {
      rawPath: '/v1/sign-in/telegram',
      headers: {},
      requestContext: { http: { method: 'POST' } },
      body: '{}',
    },
    owes: (answer) => fieldOf(answer, 'statusCode') === 400,
    describes: 'a sign in body with no code is answered 400',
  },
  'emi-sign-in-challenge-define': {
    event: { request: { session: [] }, response: {} },
    owes: (answer) => answeredField(answer, 'challengeName') === customChallengeName,
    describes: 'a session with no challenge yet is asked for the custom challenge',
  },
  'emi-sign-in-challenge-create': {
    event: { request: { challengeName: customChallengeName }, response: {} },
    owes: (answer) => answeredField(answer, 'challengeMetadata') === telegramChallengeMetadata,
    describes: 'the challenge it issues is marked as the Telegram one',
  },
  // An answer that is not base 64 of the length an answer carries has no digest, so the trigger
  // refuses it without reaching the table at all.
  'emi-sign-in-challenge-verify': {
    event: {
      userName: 'tg_0000000000000000000000000',
      request: { challengeAnswer: 'this is not an answer' },
      response: {},
    },
    owes: (answer) => answeredField(answer, 'answerCorrect') === false,
    describes: 'an answer nothing issued is refused',
  },
};

/**
 * The container a start answered with, read from its own stream. It is read from the output alone
 * rather than from the output and the errors together, because a run that has to pull the image
 * first writes the progress of the pull to the errors, and a line of that read as a container is a
 * container nobody then removes.
 */
export function containerIdIn(stdout: string): string | null {
  const last = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .pop();

  return last !== undefined && /^[0-9a-f]{12,64}$/.test(last) ? last : null;
}

/**
 * The port on this machine that reaches the emulator, read back from the container rather than
 * chosen here. Every container is given a port of its own for one reason: two containers on one
 * fixed port collide, and the second one fails to bind while the first is still letting go of it.
 */
export function publishedPortIn(output: string): number | null {
  for (const line of output.split('\n')) {
    const found = /:(\d+)\s*$/.exec(line.trim());
    const port = found?.[1] === undefined ? Number.NaN : Number(found[1]);

    if (Number.isInteger(port) && port > 0) {
      return port;
    }
  }

  return null;
}

/** Everything one run of this check needs, so nothing in it reads the world for itself. */
export interface LoadRun {
  readonly run: RunsACommand;
  /** The directory the build wrote its zips into. */
  readonly builtInto: string;
  readonly report: (line: string) => void;
  readonly functions?: readonly DeployedFunction[];
}

async function answered(address: string, event: unknown, until: number): Promise<unknown> {
  for (;;) {
    try {
      const response = await fetch(address, { method: 'POST', body: JSON.stringify(event) });

      return (await response.json()) as unknown;
    } catch (thrown) {
      if (Date.now() >= until) {
        throw thrown;
      }

      await new Promise((carryOn) => setTimeout(carryOn, 250));
    }
  }
}

/**
 * Every bundle, loaded. It answers how many it loaded, and it raises on the first one that does not
 * load, carrying what the emulator said. Every container it started is removed before it answers or
 * raises, so a failure leaves nothing behind holding a port.
 */
export async function loadEveryBundle(given: LoadRun): Promise<number> {
  const list = given.functions ?? deployedFunctions;
  const containers: string[] = [];
  const directories: string[] = [];

  const remove = (container: string): void => {
    const at = containers.indexOf(container);

    if (at >= 0) {
      containers.splice(at, 1);
      given.run('docker', ['rm', '--force', container]);
    }
  };

  const removeWhatIsLeft = (): void => {
    for (const container of [...containers]) {
      remove(container);
    }

    for (const directory of directories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  };

  try {
    const docker = given.run('docker', ['--version']);

    if (docker.status !== 0) {
      throw new Error(
        `this check runs every bundle in a container and Docker is missing: ${docker.stderr.trim()}`,
      );
    }

    given.report(docker.stdout.trim());

    if (list.length === 0) {
      throw new Error('the list of functions is empty, so this check loaded no bundle at all');
    }

    for (const held of list) {
      const check = loadChecks[held.name];

      if (check === undefined) {
        throw new Error(
          `${held.name} is deployed and no event here proves that its bundle answers`,
        );
      }

      const archive = join(given.builtInto, archiveNameOf(held));
      let bytes: Buffer;

      try {
        bytes = readFileSync(archive);
      } catch {
        throw new Error(`${archive} is not there, so there is no bundle of ${held.name} to load`);
      }

      const entries = entriesIn(bytes);
      const bundle = entries.find((entry) => entry.name === bundleFileName);

      if (bundle === undefined) {
        const names = entries.map((entry) => entry.name).join(', ');

        throw new Error(`${archive} holds no ${bundleFileName} at its root, only: ${names}`);
      }

      const taskRoot = mkdtempSync(join(tmpdir(), `${held.name}-`));

      directories.push(taskRoot);
      writeFileSync(join(taskRoot, bundleFileName), bundle.contents);

      // Docker picks the port on this machine, which is what makes a run of several bundles safe:
      // nothing here names a port, so nothing here can want one another container still holds.
      const started = given.run('docker', [
        'run',
        '--rm',
        '--detach',
        '--publish',
        `0:${portInsideTheImage}`,
        '--volume',
        `${taskRoot}:/var/task:ro`,
        baseImage,
        `index.${handlerName}`,
      ]);
      const container = containerIdIn(started.stdout);

      if (started.status !== 0 || container === null) {
        throw new Error(
          `the image would not start for ${held.name}: ${started.stderr.trim() || started.stdout.trim()}`,
        );
      }

      containers.push(container);

      const read = given.run('docker', ['port', container, `${portInsideTheImage}/tcp`]);
      const port = publishedPortIn(read.stdout);

      if (port === null) {
        throw new Error(
          `the container of ${held.name} published no port this machine can reach: ${read.stdout.trim()}${read.stderr.trim()}`,
        );
      }

      const address = `http://localhost:${port}/2015-03-31/functions/function/invocations`;
      let answer: unknown;

      try {
        answer = await answered(address, check.event, Date.now() + readyWithinMilliseconds);
      } catch (thrown) {
        given.report(given.run('docker', ['logs', container]).stdout);
        throw new Error(`${held.name} answered nothing: ${String(thrown)}`);
      }

      if (!check.owes(answer)) {
        given.report(given.run('docker', ['logs', container]).stdout);
        throw new Error(
          `${held.name} owes that ${check.describes}, and answered ${JSON.stringify(answer)}`,
        );
      }

      given.report(
        `${held.name}: on port ${port}, ${check.describes}, and it answered ${JSON.stringify(answer)}`,
      );

      // Removed as soon as its bundle is judged, so one run of several bundles holds one container
      // at a time rather than every container it has started.
      remove(container);
    }

    return list.length;
  } finally {
    removeWhatIsLeft();
  }
}
