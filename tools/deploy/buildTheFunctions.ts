import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { build } from 'esbuild';

import { zipOf } from './archive.ts';
import {
  archiveNameOf,
  bundleFileName,
  buildDirectory,
  deployedFunctions,
  metafileNameOf,
} from './functions.ts';

/**
 * One bundle for each deployed function, each in a zip of its own, with the metafile esbuild wrote
 * beside it.
 *
 * One bundle for each function rather than one shared bundle, because a shared bundle puts the code
 * that reads her records inside the function that stands behind no authorizer. The role refuses the
 * call either way. The sentence this repository gets to say is the point: the function anybody may
 * reach holds no module that can read a record.
 */

/**
 * A module has no require of its own, and the software development kit is bundled from its
 * CommonJS build, which asks for node:https at load time. Without these two lines the runtime
 * refuses every bundle with "Dynamic require of node:https is not supported" before the handler
 * is ever called.
 */
const requireForBundledCommonJs = [
  "import { createRequire as createRequireForBundledCommonJs } from 'node:module';",
  'const require = createRequireForBundledCommonJs(import.meta.url);',
].join('\n');

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const given = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const outputDirectory = given === undefined ? join(repositoryRoot, buildDirectory) : resolve(given);

rmSync(outputDirectory, { force: true, recursive: true });
mkdirSync(outputDirectory, { recursive: true });

if (deployedFunctions.length === 0) {
  process.stderr.write('the list of functions is empty, so this build wrote no bundle at all\n');
  process.exit(1);
}

for (const held of deployedFunctions) {
  const built = await build({
    entryPoints: [join(repositoryRoot, held.entryPoint)],
    outfile: join(outputDirectory, bundleFileName),
    bundle: true,
    platform: 'node',
    // The runtime of every function in `infra/lambda.tf`, so a syntax this Node cannot read is a
    // failure here rather than on the first invocation.
    target: 'node22',
    format: 'esm',
    banner: { js: requireForBundledCommonJs },
    metafile: true,
    write: false,
    // A line in a log names a real function, and nothing in the account reads a source map.
    minify: false,
    sourcemap: false,
    logLevel: 'warning',
  });

  const bundle = built.outputFiles.find((file) => file.path.endsWith(bundleFileName));

  if (bundle === undefined) {
    process.stderr.write(`esbuild wrote no ${bundleFileName} for ${held.name}\n`);
    process.exit(1);
  }

  // The name in the archive carries no directory, because the runtime loads the handler from the
  // root of what it unpacks and finds nothing under a folder name.
  const archive = zipOf([{ name: bundleFileName, contents: bundle.contents }]);
  const modules = Object.keys(built.metafile.inputs).length;

  writeFileSync(join(outputDirectory, archiveNameOf(held)), archive);
  writeFileSync(join(outputDirectory, metafileNameOf(held)), JSON.stringify(built.metafile));

  process.stdout.write(
    `${held.name}: ${archive.length} bytes zipped, ${bundle.contents.length} unzipped, ${modules} modules\n`,
  );
}

process.stdout.write(`${deployedFunctions.length} bundles are in ${outputDirectory}\n`);
