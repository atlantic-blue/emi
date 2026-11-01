import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { moduleDirectory } from './runArtifact.ts';

const writer = join(moduleDirectory, 'src', 'write.ts');

/**
 * The writer, run the way a person runs it. It is spawned rather than imported because it reaches
 * prettier through a dynamic import, which Jest refuses inside a test.
 */
function checked(directory: string): { status: number | null; said: string } {
  const run = spawnSync(
    process.execPath,
    [
      '--disable-warning=ExperimentalWarning',
      '--experimental-strip-types',
      writer,
      '--check',
      directory,
    ],
    { encoding: 'utf8' },
  );

  return { status: run.status, said: `${run.stdout}${run.stderr}` };
}

describe('the artifact each platform reads is the TypeScript beside it', () => {
  it('matches what the writer writes, so a stale artifact cannot reach the account', () => {
    const run = checked(moduleDirectory);

    expect(run.said).toContain('2 artifact(s) match');
    expect(run.status).toBe(0);
  });

  describe('a source changed without writing the artifact again', () => {
    let copy = '';

    beforeEach(() => {
      copy = mkdtempSync(join(moduleDirectory, 'tests', 'copy-'));
      cpSync(join(moduleDirectory, 'src'), join(copy, 'src'), { recursive: true });
      cpSync(join(moduleDirectory, 'code'), join(copy, 'code'), { recursive: true });
    });

    afterEach(() => {
      rmSync(copy, { force: true, recursive: true });
    });

    it('is refused, and the artifact is named', () => {
      const source = join(copy, 'src', 'redirect.ts');

      expect(checked(copy).status).toBe(0);

      writeFileSync(
        source,
        readFileSync(source, 'utf8').replace("const defaultLanguage = 'en'", "const x = 'ru'"),
      );

      const run = checked(copy);

      expect(run.said).toContain('redirect.js is not what src/ says it is');
      expect(run.status).toBe(1);
    });
  });

  it('leaves no export in the script, because CloudFront evaluates it and calls a global', () => {
    const script = readFileSync(join(moduleDirectory, 'code', 'redirect.js'), 'utf8');

    expect(script).toContain('function handler(event)');
    expect(script).not.toContain('export ');
  });

  it('keeps the export in the module, because a Lambda runtime resolves index.handler', () => {
    const artifact = readFileSync(join(moduleDirectory, 'code', 'index.mjs'), 'utf8');

    // Async survives the stripping as well as the export does. The runtime drops what a plain
    // function returns, so losing the word here would answer 200 with the body null.
    expect(artifact).toContain('export async function handler()');
  });

  it('carries no type, because neither runtime reads TypeScript', () => {
    for (const file of [join('code', 'redirect.js'), join('code', 'index.mjs')]) {
      const artifact = readFileSync(join(moduleDirectory, file), 'utf8');

      expect(artifact).not.toContain('interface ');
      expect(artifact).not.toContain(': string');
    }
  });
});
