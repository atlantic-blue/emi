import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { zipOf } from './archive';
import { bundleFileName, type DeployedFunction } from './functions';
import {
  type Answered,
  containerIdIn,
  loadChecks,
  loadEveryBundle,
  portInsideTheImage,
  publishedPortIn,
} from './loadEachBundle';
import { createAuthChallenge } from '../../services/vault/src/triggers/createAuthChallenge';
import { customChallengeName } from '../../services/vault/src/triggers/defineAuthChallenge';

/**
 * The check that loads every bundle, driven without a container runtime.
 *
 * The stand in below starts a listener for each container, on a port the operating system picked,
 * and answers the port back the way `docker port` answers it. So the check reaches a real address
 * over a real request, and a run of several bundles is what it is in the pipeline: several
 * containers, one after another, each on a port of its own.
 */

interface Container {
  readonly id: string;
  readonly listener: Server;
  readonly port: number;
}

interface StandIn {
  readonly run: (command: string, args: readonly string[]) => Answered;
  /** Every command the check ran, so a removal that never happened is visible. */
  readonly commands: string[][];
  /** Every container started, in the order it was started. */
  readonly started: Container[];
  /** The containers still listening, which must be none once the check has answered. */
  readonly running: () => string[];
  readonly closeEverything: () => void;
}

/** What one listener answers, which stands for what the handler in that bundle answers. */
type Answers = Readonly<Record<string, unknown>>;

function listenerAnswering(answer: unknown): Promise<Container> {
  return new Promise((ready) => {
    const listener = createServer((request, response) => {
      request.resume();
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(answer));
    });

    listener.listen(0, '127.0.0.1', () => {
      const address = listener.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;

      ready({ id: `${port.toString(16)}0a1b2c3d4e5f`.slice(0, 16), listener, port });
    });
  });
}

/**
 * A container runtime that answers the way Docker answers. The started listeners are made before
 * the check runs, because a command runner is a plain function and cannot wait for one.
 */
function standInStarting(prepared: readonly Container[]): StandIn {
  const commands: string[][] = [];
  const started: Container[] = [];
  const closed = new Set<string>();
  let at = 0;

  const run = (command: string, args: readonly string[]): Answered => {
    commands.push([command, ...args]);

    if (args[0] === '--version') {
      return { status: 0, stdout: 'Docker version 28.0.4, build b8034c0\n', stderr: '' };
    }

    if (args[0] === 'run') {
      const container = prepared[at];

      at += 1;

      if (container === undefined) {
        return { status: 1, stdout: '', stderr: 'the stand in prepared no further container' };
      }

      started.push(container);

      // The progress of a pull goes to the errors, which is where reading the container out of
      // both streams together went wrong.
      return {
        status: 0,
        stdout: `${container.id}\n`,
        stderr: `Unable to find image '${args[args.length - 2] ?? ''}' locally\nStatus: Downloaded newer image\n`,
      };
    }

    if (args[0] === 'port') {
      const container = started.find((held) => held.id === args[1]);

      return container === undefined
        ? { status: 1, stdout: '', stderr: 'no such container' }
        : {
            status: 0,
            stdout: `${portInsideTheImage}/tcp -> 0.0.0.0:${container.port}\n${portInsideTheImage}/tcp -> [::]:${container.port}\n`,
            stderr: '',
          };
    }

    if (args[0] === 'rm') {
      const container = started.find((held) => held.id === args[2]);

      if (container !== undefined) {
        container.listener.close();
        closed.add(container.id);
      }

      return { status: 0, stdout: `${String(args[2])}\n`, stderr: '' };
    }

    return { status: 0, stdout: '', stderr: '' };
  };

  return {
    run,
    commands,
    started,
    running: () => started.filter((held) => !closed.has(held.id)).map((held) => held.id),
    closeEverything: () => {
      for (const held of prepared) {
        held.listener.close();
      }
    },
  };
}

const theAuthorizer: DeployedFunction = {
  name: 'emi-authorizer',
  entryPoint: 'services/vault/src/functions/authorizer.ts',
  resource: 'aws_lambda_function.authorizer',
};

const theVault: DeployedFunction = {
  name: 'emi-vault',
  entryPoint: 'services/vault/src/functions/vault.ts',
  resource: 'aws_lambda_function.vault',
};

const refused = { isAuthorized: false };
const notFound = { statusCode: 404, headers: {}, body: '{"error":"nothing answers that path"}' };

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'emi-load-check-'));
});

afterEach(() => {
  rmSync(directory, { force: true, recursive: true });
});

function aBundleFor(held: DeployedFunction, name = bundleFileName): void {
  const contents = new TextEncoder().encode('export const handler = async () => ({});\n');

  writeFileSync(join(directory, `${held.name}.zip`), zipOf([{ name, contents }]));
}

async function checkWith(
  list: readonly DeployedFunction[],
  answers: readonly Answers[],
): Promise<{ standIn: StandIn; lines: string[]; thrown: Error | null; loaded: number }> {
  const prepared = [];

  for (const answer of answers) {
    prepared.push(await listenerAnswering(answer));
  }

  const standIn = standInStarting(prepared);
  const lines: string[] = [];
  let thrown: Error | null = null;
  let loaded = 0;

  try {
    loaded = await loadEveryBundle({
      run: standIn.run,
      builtInto: directory,
      report: (line) => lines.push(line),
      functions: list,
    });
  } catch (raised) {
    thrown = raised instanceof Error ? raised : new Error(String(raised));
  } finally {
    standIn.closeEverything();
  }

  return { standIn, lines, thrown, loaded };
}

function portsIn(standIn: StandIn): number[] {
  return standIn.started.map((held) => held.port);
}

describe('every bundle is loaded in a container of its own, and two in a row cannot collide', () => {
  describe('two bundles, one after another', () => {
    it('loads both, and names no port of its own, so neither can want the port the other holds', async () => {
      aBundleFor(theAuthorizer);
      aBundleFor(theVault);

      const ran = await checkWith([theAuthorizer, theVault], [refused, notFound]);

      expect(ran.thrown).toBeNull();
      expect(ran.loaded).toBe(2);
      expect(ran.lines).toHaveLength(3);
    });

    it('is given a port for each container by the runtime, and the two are different', async () => {
      aBundleFor(theAuthorizer);
      aBundleFor(theVault);

      const ran = await checkWith([theAuthorizer, theVault], [refused, notFound]);
      const ports = portsIn(ran.standIn);

      expect(ports).toHaveLength(2);
      expect(new Set(ports).size).toBe(2);
      expect(ran.lines[1]).toContain(`on port ${String(ports[0])}`);
      expect(ran.lines[2]).toContain(`on port ${String(ports[1])}`);
    });

    it('asks the runtime to pick the port rather than naming one, which is what used to collide', async () => {
      aBundleFor(theAuthorizer);
      aBundleFor(theVault);

      const ran = await checkWith([theAuthorizer, theVault], [refused, notFound]);
      const published = ran.standIn.commands
        .filter((command) => command[1] === 'run')
        .map((command) => command[command.indexOf('--publish') + 1]);

      expect(published).toEqual([`0:${portInsideTheImage}`, `0:${portInsideTheImage}`]);
    });

    it('removes each container, so nothing is left holding a port when it answers', async () => {
      aBundleFor(theAuthorizer);
      aBundleFor(theVault);

      const ran = await checkWith([theAuthorizer, theVault], [refused, notFound]);

      expect(ran.standIn.running()).toEqual([]);
      expect(ran.standIn.commands.filter((command) => command[1] === 'rm')).toHaveLength(2);
    });
  });

  describe('a run that fails part way', () => {
    it('removes the container it started, so a second bundle is not refused by the first', async () => {
      aBundleFor(theAuthorizer);

      const ran = await checkWith([theAuthorizer, theVault], [notFound, refused]);

      expect(ran.thrown?.message).toContain('emi-authorizer owes that');
      expect(ran.standIn.running()).toEqual([]);
    });

    it('removes the container it started when the bundle of the next function is missing', async () => {
      aBundleFor(theAuthorizer);

      const ran = await checkWith([theAuthorizer, theVault], [refused, notFound]);

      expect(ran.thrown?.message).toContain('emi-vault.zip is not there');
      expect(ran.standIn.running()).toEqual([]);
    });
  });

  describe('the container a start answered with', () => {
    it('is read from the output alone, so the progress of a pull is never read as a container', () => {
      const pull = 'Unable to find image locally\nStatus: Downloaded newer image\n';

      expect(containerIdIn(`7711503f18d2d1592900129dad7906d5\n`)).toBe(
        '7711503f18d2d1592900129dad7906d5',
      );
      expect(containerIdIn(pull)).toBeNull();
      expect(containerIdIn('')).toBeNull();
    });

    it('is refused when a start wrote something that is not a container', async () => {
      aBundleFor(theAuthorizer);

      const ran = await checkWith([theAuthorizer], []);

      expect(ran.thrown?.message).toContain('the image would not start for emi-authorizer');
    });
  });

  describe('the port read back from a container', () => {
    it('is the one the runtime chose, taken from the first address it answers', () => {
      expect(publishedPortIn('8080/tcp -> 0.0.0.0:32769\n8080/tcp -> [::]:32769\n')).toBe(32769);
      expect(publishedPortIn('')).toBeNull();
      expect(publishedPortIn('no such container\n')).toBeNull();
    });
  });

  describe('a run with nothing to load', () => {
    it('fails rather than reporting the success of a loop over an empty list', async () => {
      const ran = await checkWith([], []);

      expect(ran.thrown?.message).toContain('the list of functions is empty');
      expect(ran.loaded).toBe(0);
    });

    it('fails where a zip holds no handler file at its root', async () => {
      aBundleFor(theAuthorizer, `bundle/${bundleFileName}`);

      const ran = await checkWith([theAuthorizer], [refused]);

      expect(ran.thrown?.message).toContain(`holds no ${bundleFileName} at its root`);
    });

    it('fails where a deployed function has no event that proves its bundle answers', async () => {
      const unchecked: DeployedFunction = { ...theVault, name: 'emi-nobody-checks-this' };

      aBundleFor(unchecked);

      const ran = await checkWith([unchecked], [refused]);

      expect(loadChecks[unchecked.name]).toBeUndefined();
      expect(ran.thrown?.message).toContain('no event here proves that its bundle answers');
    });
  });

  describe('the challenge a create trigger bundle owes', () => {
    const check = loadChecks['emi-sign-in-challenge-create'];

    it('takes what the trigger answers', () => {
      const created = createAuthChallenge({
        request: { challengeName: customChallengeName },
        response: {},
      });

      expect(check?.owes(created)).toBe(true);
    });

    it('refuses a challenge whose two parameter maps are empty', () => {
      const empty = {
        response: {
          publicChallengeParameters: {},
          privateChallengeParameters: {},
          challengeMetadata: 'TELEGRAM',
        },
      };

      expect(check?.owes(empty)).toBe(false);
    });
  });

  describe('a machine with no container runtime', () => {
    it('fails and says Docker is missing, rather than skipping every bundle', async () => {
      const lines: string[] = [];
      const missing = (): Answered => ({ status: 1, stdout: '', stderr: 'docker: not found' });

      await expect(
        loadEveryBundle({
          run: missing,
          builtInto: directory,
          report: (line) => lines.push(line),
          functions: [theAuthorizer],
        }),
      ).rejects.toThrow(/Docker is missing/);
      expect(lines).toEqual([]);
    });
  });
});
