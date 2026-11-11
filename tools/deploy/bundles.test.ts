import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { crc32Of, entriesIn, zipOf } from './archive';
import { archiveNameOf, bundleFileName, deployedFunctions, metafileNameOf } from './functions';

/**
 * What the build wrote, read out of the zips themselves. The build is run the way the pipeline runs
 * it rather than by calling into it, so what these cases read is the artifact that ships.
 */

const repositoryRoot = resolve(__dirname, '..', '..');
const buildScript = join('tools', 'deploy', 'buildTheFunctions.ts');

/** Long enough for esbuild to read the software development kit three times on a cold cache. */
const theBuildTakes = 180_000;

interface Metafile {
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly outputs: Readonly<Record<string, unknown>>;
}

function builtInto(directory: string): string {
  const run = spawnSync(
    process.execPath,
    ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', buildScript, directory],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  if (run.status !== 0) {
    throw new Error(`the build refused: ${run.stdout}${run.stderr}`);
  }

  return `${run.stdout}`;
}

let directory: string;
let output: string;

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'emi-bundles-'));
  output = builtInto(directory);
}, theBuildTakes);

afterAll(() => {
  rmSync(directory, { force: true, recursive: true });
});

function archiveOf(name: string): Buffer {
  return readFileSync(join(directory, `${name}.zip`));
}

function metafileOf(name: string): Metafile {
  return JSON.parse(readFileSync(join(directory, `${name}.meta.json`), 'utf8')) as Metafile;
}

function modulesIn(name: string): string[] {
  return Object.keys(metafileOf(name).inputs);
}

const vaultFunction = 'emi-vault';
const authorizerFunction = 'emi-authorizer';
const articleFunction = 'emi-articles';
const signInFunction = 'emi-sign-in-telegram';
const defineTrigger = 'emi-sign-in-challenge-define';
const createTrigger = 'emi-sign-in-challenge-create';
const verifyTrigger = 'emi-sign-in-challenge-verify';

/** The three clients of the account this service binds, each in a package of its own. */
const theTableClient = '@aws-sdk/client-dynamodb';
const theSecretClient = '@aws-sdk/client-ssm';
const thePoolClient = '@aws-sdk/client-cognito-identity-provider';

/**
 * The functions that read or write a table. The define and the create trigger decide from the
 * event they are handed, so neither one holds a client of anything.
 */
const functionsThatReachTheTable = [
  vaultFunction,
  authorizerFunction,
  articleFunction,
  signInFunction,
  verifyTrigger,
];

describe('one bundle for each deployed function, in the shape the runtime unpacks', () => {
  describe('the list the build reads', () => {
    it('is not empty, so none of the cases below passes by having nothing to read', () => {
      expect(deployedFunctions.length).toBeGreaterThan(0);
      expect(deployedFunctions.map((held) => held.name)).toContain(vaultFunction);
    });

    it('names each function once, and names a file for each one', () => {
      const names = deployedFunctions.map((held) => held.name);
      const entryPoints = deployedFunctions.map((held) => held.entryPoint);

      expect(new Set(names).size).toBe(names.length);
      expect(new Set(entryPoints).size).toBe(entryPoints.length);
    });
  });

  describe('the zip of each function', () => {
    it('is written for every function in the list, and the build says what it wrote', () => {
      for (const held of deployedFunctions) {
        expect(output).toContain(held.name);
        expect(archiveOf(held.name).length).toBeGreaterThan(0);
      }

      expect(output).toContain(`${deployedFunctions.length} bundles`);
    });

    it('holds the handler file at its root, because the runtime finds nothing under a folder', () => {
      for (const held of deployedFunctions) {
        expect(entriesIn(archiveOf(held.name)).map((entry) => entry.name)).toEqual([
          bundleFileName,
        ]);
      }
    });

    it('holds no native binary, which is what would make the architecture of a bundle matter', () => {
      for (const held of deployedFunctions) {
        const names = entriesIn(archiveOf(held.name)).map((entry) => entry.name);

        expect(names.filter((name) => name.endsWith('.node'))).toEqual([]);
      }
    });

    it(
      'is the same bytes when the same source is built again, so an unchanged function is not uploaded again',
      () => {
        const first = deployedFunctions.map((held) => crc32Of(archiveOf(held.name)));
        const second = mkdtempSync(join(tmpdir(), 'emi-bundles-again-'));

        try {
          builtInto(second);

          const again = deployedFunctions.map((held) =>
            crc32Of(readFileSync(join(second, archiveNameOf(held)))),
          );

          expect(again).toEqual(first);
        } finally {
          rmSync(second, { force: true, recursive: true });
        }
      },
      theBuildTakes,
    );
  });

  describe('what each bundle carries, read from the metafile beside it', () => {
    it('is written for every function, and names its own entry point', () => {
      for (const held of deployedFunctions) {
        expect(metafileNameOf(held)).toContain(held.name);
        expect(modulesIn(held.name)).toContain(held.entryPoint);
      }
    });

    it('leaves the vault store out of the article bundle, which stands behind no authorizer', () => {
      const carried = modulesIn(articleFunction);

      expect(carried).not.toContain('services/vault/src/store/dynamo.ts');
      expect(carried).not.toContain('services/vault/src/store/records.ts');
      expect(carried).toContain('services/vault/src/store/dynamoArticles.ts');
    });

    it('leaves every handler of a record out of the authorizer bundle', () => {
      const carried = modulesIn(authorizerFunction);

      expect(carried.filter((module) => module.includes('/handlers/'))).toEqual([]);
      expect(carried).toContain('services/vault/src/auth/authorizer.ts');
    });

    it('leaves the article catalogue out of the vault bundle, and the router out of the other two', () => {
      expect(modulesIn(vaultFunction)).not.toContain('services/vault/src/store/dynamoArticles.ts');
      expect(modulesIn(vaultFunction)).toContain('services/vault/src/router.ts');
      expect(modulesIn(authorizerFunction)).not.toContain('services/vault/src/router.ts');
      expect(modulesIn(articleFunction)).not.toContain('services/vault/src/router.ts');
    });

    it('carries the client of the one table its function reads, where its function reads one', () => {
      for (const held of functionsThatReachTheTable) {
        expect(
          modulesIn(held).filter((module) => module.includes(theTableClient)).length,
        ).toBeGreaterThan(0);
      }
    });

    it('holds the sign in handler alone, so the route that reaches a secret answers nothing else', () => {
      expect(modulesIn(signInFunction).filter((module) => module.includes('/handlers/'))).toEqual([
        'services/vault/src/handlers/signInWithTelegram.ts',
      ]);
    });

    it('leaves the parameter store out of every bundle but the one that reads a secret', () => {
      const carrying = deployedFunctions
        .filter((held) => modulesIn(held.name).some((module) => module.includes(theSecretClient)))
        .map((held) => held.name);

      expect(carrying).toEqual([signInFunction]);
    });

    it('leaves the pool client out of every bundle but that same one', () => {
      const carrying = deployedFunctions
        .filter((held) => modulesIn(held.name).some((module) => module.includes(thePoolClient)))
        .map((held) => held.name);

      expect(carrying).toEqual([signInFunction]);
    });

    it('leaves the two triggers that decide from their event alone with no client at all', () => {
      for (const held of [defineTrigger, createTrigger]) {
        expect(modulesIn(held).filter((module) => module.includes('@aws-sdk/'))).toEqual([]);
        expect(modulesIn(held).filter((module) => module.includes('/store/'))).toEqual([]);
      }
    });

    it('leaves the sign in and the triggers out of the vault bundle, and the vault out of theirs', () => {
      expect(modulesIn(vaultFunction)).not.toContain(
        'services/vault/src/handlers/signInWithTelegram.ts',
      );

      for (const held of [signInFunction, defineTrigger, createTrigger, verifyTrigger]) {
        expect(modulesIn(held)).not.toContain('services/vault/src/router.ts');
      }
    });
  });
});

describe('the archive this build writes, read back out of its own directory', () => {
  it('gives back every entry it was given, with its bytes unchanged', () => {
    const entries = [
      { name: bundleFileName, contents: new TextEncoder().encode('export const handler = 1;\n') },
      { name: 'beside.txt', contents: new Uint8Array([0, 1, 2, 255]) },
    ];

    expect(entriesIn(zipOf(entries))).toEqual(entries);
  });

  it('gives back nothing for an archive that holds nothing', () => {
    expect(entriesIn(zipOf([]))).toEqual([]);
  });

  it('refuses something that is not an archive, rather than reading it as empty', () => {
    expect(() => entriesIn(Buffer.from('this is not a zip'))).toThrow(/not a zip/);
  });

  it('writes the same bytes for the same entries, because the code hash is read from them', () => {
    const entry = [{ name: bundleFileName, contents: new TextEncoder().encode('const one = 1;') }];

    expect(zipOf(entry).equals(zipOf(entry))).toBe(true);
  });
});
