import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '..', '..');
const jestCommandLine = join(repositoryRoot, 'node_modules', 'jest', 'bin', 'jest.js');

function runJestIn(directory: string): { status: number | null; output: string } {
  const run = spawnSync(
    process.execPath,
    [jestCommandLine, '--ci', '--config', JSON.stringify({ rootDir: directory })],
    { cwd: directory, encoding: 'utf8', env: { ...process.env, CI: 'true' } },
  );

  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

function scriptsOf(packageFile: string): string[] {
  const contents = JSON.parse(readFileSync(join(repositoryRoot, packageFile), 'utf8')) as {
    scripts?: Record<string, string>;
  };

  return Object.values(contents.scripts ?? {});
}

describe('an empty test run fails instead of passing', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'emi-empty-run-'));
  });

  afterEach(() => {
    rmSync(directory, { force: true, recursive: true });
  });

  it('refuses a directory that holds no test', () => {
    const run = runJestIn(directory);

    expect(run.status).not.toBe(0);
    expect(run.output).toContain('No tests found');
  }, 180_000);

  it('accepts the same directory once it holds one test', () => {
    writeFileSync(join(directory, 'one.test.js'), "test('one', () => { expect(1).toBe(1); });\n");

    const run = runJestIn(directory);

    expect(run.output).toContain('1 passed');
    expect(run.status).toBe(0);
  }, 180_000);

  it('is not undone by a script that asks the runner to pass with no tests', () => {
    const everyScript = [
      ...scriptsOf('package.json'),
      ...scriptsOf('apps/mobile/package.json'),
      ...scriptsOf('packages/tokens/package.json'),
      ...scriptsOf('packages/cycle/package.json'),
      ...scriptsOf('packages/crypto/package.json'),
    ];

    expect(everyScript.filter((script) => script.includes('passWithNoTests'))).toEqual([]);
  });

  it('is not undone by a workflow step that asks the runner to pass with no tests', () => {
    const workflow = readFileSync(join(repositoryRoot, '.github/workflows/ci.yml'), 'utf8');

    expect(workflow).not.toContain('passWithNoTests');
  });
});
