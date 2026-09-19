import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

import { textStyle } from '../../packages/tokens/src/text';

/**
 * The rule that keeps a size and its face together. A rule quietly dropped from the configuration
 * reads exactly like a rule that nothing breaks, so this asks the real eslint what it says.
 */

const repositoryRoot = resolve(__dirname, '..', '..');
const eslintCommandLine = join(repositoryRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');

const theMessage =
  'A font size belongs with its face. Spread textStyle from @emi/tokens rather than setting a size on its own.';

// The source is fed through standard input under a made up path, so the real configuration decides
// the answer and no probe file is ever left behind in the tree.
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

describe('a font size cannot be set without a face beside it', () => {
  it('refuses a style that names a size and no family', () => {
    const drifted = 'export const style = { color: "a", fontSize: 16, lineHeight: 24 };\n';

    expect(messagesFor('apps/mobile/src/features/probe.ts', drifted)).toContain(theMessage);
  });

  it('accepts a style built from the helper, which carries both', () => {
    const helped =
      `export const style = { color: "a", ...${JSON.stringify(textStyle('body-lg'))} };\n`
        .replace('{"fontFamily"', '{ fontFamily')
        .replace('}}', '} }');

    expect(messagesFor('apps/mobile/src/features/probe.ts', helped)).not.toContain(theMessage);
  });

  it('accepts a style that sets both by hand, because the face is there to read', () => {
    const paired =
      'export const style = { fontFamily: "PlusJakartaSans-Regular", fontSize: 16 };\n';

    expect(messagesFor('apps/mobile/src/features/probe.ts', paired)).not.toContain(theMessage);
  });

  it('holds in a package and in a build tool alike', () => {
    const drifted = 'export const style = { fontSize: 16 };\n';

    expect(messagesFor('packages/cycle/src/probe.ts', drifted)).toContain(theMessage);
    expect(messagesFor('tools/pipeline/probe.ts', drifted)).toContain(theMessage);
  });

  it('leaves the token package alone, because the scale is defined there', () => {
    const drifted = 'export const style = { fontSize: 16 };\n';

    expect(messagesFor('packages/tokens/src/probe.ts', drifted)).not.toContain(theMessage);
  });
});
