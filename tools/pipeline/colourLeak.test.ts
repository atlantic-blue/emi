import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import { colour } from '../../packages/tokens/src/colour';

const repositoryRoot = resolve(__dirname, '..', '..');
const eslintCommandLine = join(repositoryRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');
const hexAnywhere = /#[0-9a-fA-F]{3,8}\b/;

// The probe is built from a real token rather than written out, so this file holds no hex of its
// own and the repository wide check below can cover every file without an exception for itself.
const probe = `export const brand = '${colour.stone}';\n`;

// The source is fed through standard input under a made up path, so the real configuration
// decides the answer and no probe file is ever left behind in the tree.
function messagesFor(file: string, code: string): string[] {
  const run = spawnSync(
    process.execPath,
    [
      eslintCommandLine,
      '--stdin',
      '--stdin-filename',
      file,
      '--format',
      'json',
      '--no-warn-ignored',
    ],
    { cwd: repositoryRoot, encoding: 'utf8', input: code },
  );

  if (run.stdout.trim().length === 0) {
    throw new Error(`eslint said nothing about ${file}: ${run.stderr}`);
  }

  const results = JSON.parse(run.stdout) as { messages: { message: string }[] }[];

  return results.flatMap((result) => result.messages).map((message) => message.message);
}

function trackedFiles(): string[] {
  const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });

  expect(listed.status).toBe(0);

  return listed.stdout.split('\n').filter((line) => line.length > 0);
}

describe('a colour cannot be written outside the token package', () => {
  it('refuses a hex value in the application', () => {
    expect(messagesFor('apps/mobile/src/app/probe.tsx', probe)).toEqual([
      'A colour belongs in packages/tokens. Import it from @emi/tokens instead of writing a hex value here.',
    ]);
  });

  it('refuses a hex value in another package and in a build tool alike', () => {
    expect(messagesFor('packages/cycle/src/probe.ts', probe)).toHaveLength(1);
    expect(messagesFor('tools/pipeline/probe.ts', probe)).toHaveLength(1);
  });

  it('refuses a hex value hidden inside a longer string', () => {
    const buried = `export const rule = 'border: 1px solid ${colour.hairline}';\n`;

    expect(messagesFor('apps/mobile/src/app/probe.ts', buried)).toHaveLength(1);
  });

  it('refuses a hex value written into a template', () => {
    const templated = 'export const rule = `color: ' + colour.ember + '`;\n';

    expect(messagesFor('apps/mobile/src/app/probe.ts', templated)).toHaveLength(1);
  });

  it('accepts the same value inside the token package', () => {
    expect(messagesFor('packages/tokens/src/probe.ts', probe)).toEqual([]);
  });

  it('accepts a string that only looks like a colour', () => {
    const innocent = "export const anchor = 'https://example.test/page#section';\n";

    expect(messagesFor('apps/mobile/src/app/probe.ts', innocent)).toEqual([]);
  });

  it('finds no hex value in any tracked source or configuration file today', () => {
    const watched = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'];
    const files = trackedFiles().filter(
      (file) =>
        watched.includes(extname(file)) &&
        file !== 'package-lock.json' &&
        !file.startsWith('packages/tokens/'),
    );

    expect(files.length).toBeGreaterThan(10);

    const leaked = files.filter((file) =>
      hexAnywhere.test(readFileSync(join(repositoryRoot, file), 'utf8')),
    );

    expect(leaked).toEqual([]);
  });
});
