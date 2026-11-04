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

export interface Invocation {
  /** What kind of function the artifact exports, which is what decides whether its answer is kept. */
  readonly kind: string;
  readonly returnsPromise: boolean;
  readonly answer: unknown;
}

/**
 * One invocation of the Lambda artifact, read through the module loader by the handler name.
 *
 * The kind matters as much as the answer. The Node runtime keeps what a handler returns only when
 * the call gives back a promise. A plain function that returns a value is run, its value is
 * dropped, and the invocation finishes with null, which a function url answers as 200 with the
 * body null. Awaiting a plain value in a test hides that, because await accepts anything, so the
 * call is reported here rather than only its awaited result.
 */
export function lambdaInvocation(): Invocation {
  const artifact = pathToFileURL(join(moduleDirectory, 'code', 'index.mjs')).href;

  return ranInNode(
    '--input-type=module',
    `const loaded = await import(${JSON.stringify(artifact)});\n` +
      'const called = loaded.handler();\n' +
      'process.stdout.write(\n' +
      '  JSON.stringify({\n' +
      '    kind: loaded.handler.constructor.name,\n' +
      "    returnsPromise: typeof called?.then === 'function',\n" +
      '    answer: await called,\n' +
      '  }),\n' +
      ');',
  ) as Invocation;
}
