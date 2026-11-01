import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const workspace = resolve(__dirname, '..');

/** What OpenNext writes: the code of the server function, and the files the bucket serves. */
const serverFunction = join(workspace, '.open-next', 'server-functions', 'default');
const assets = join(workspace, '.open-next', 'assets');

/** The build is the slowest check in the repository, and a cold machine is slower still. */
const longEnoughForACompiler = 900_000;

function run(script: string): { status: number | null; output: string } {
  const ran = spawnSync('npm', ['run', script], {
    cwd: workspace,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true' },
  });

  return { status: ran.status, output: `${ran.stdout ?? ''}${ran.stderr ?? ''}` };
}

describe('the site builds into a Lambda function and a folder of assets', () => {
  beforeAll(() => {
    rmSync(join(workspace, '.open-next'), { force: true, recursive: true });
  }, longEnoughForACompiler);

  it(
    'compiles the pages with Next.js',
    () => {
      const built = run('build');

      expect(built.output).not.toContain('Failed to compile');
      expect(built.status).toBe(0);
      expect(existsSync(join(workspace, '.next'))).toBe(true);
    },
    longEnoughForACompiler,
  );

  it(
    'packages that build for Lambda and for the bucket',
    () => {
      expect(existsSync(serverFunction)).toBe(false);

      const packaged = run('build:lambda');

      expect(packaged.status).toBe(0);
      expect(existsSync(serverFunction)).toBe(true);
      expect(existsSync(assets)).toBe(true);
    },
    longEnoughForACompiler,
  );
});
