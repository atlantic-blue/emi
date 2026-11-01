/**
 * Runs a committed artifact the way its platform runs it, in a child process of node.
 *
 * A test that imported the TypeScript would prove the source and say nothing about the file the
 * platform reads. CloudFront evaluates a script and calls a global named `handler`, so the script
 * is evaluated here with no module wrapper, and an artifact that kept its `export` word fails to
 * parse. A Lambda runtime resolves `index.handler` through the module loader, so the placeholder
 * is imported rather than evaluated, and a file the loader cannot read fails the same way the
 * first invocation of a deploy would.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const moduleDirectory = join(__dirname, '..');

function ranInNode(argument: string, script: string): unknown {
  const run = spawnSync(process.execPath, [argument, '-e', script], { encoding: 'utf8' });

  if (run.status !== 0) {
    throw new Error(`node refused the artifact: ${run.stderr}`);
  }

  return JSON.parse(run.stdout) as unknown;
}

/** The answer the CloudFront artifact gives one viewer request, read by calling the global. */
export function cloudFrontAnswer(event: unknown): unknown {
  const artifact = readFileSync(join(moduleDirectory, 'code', 'redirect.js'), 'utf8');

  return ranInNode(
    '--input-type=commonjs',
    `${artifact}\nprocess.stdout.write(JSON.stringify(handler(${JSON.stringify(event)})));`,
  );
}

/** The answer the Lambda artifact gives, read through the module loader by the handler name. */
export function lambdaAnswer(): unknown {
  const artifact = pathToFileURL(join(moduleDirectory, 'code', 'index.mjs')).href;

  return ranInNode(
    '--input-type=module',
    `const loaded = await import(${JSON.stringify(artifact)});\n` +
      'process.stdout.write(JSON.stringify(await loaded.handler()));',
  );
}
