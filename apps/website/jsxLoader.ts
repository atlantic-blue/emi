import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

import { transformSync } from '@babel/core';

/**
 * Node strips the types out of a .ts file on its own and refuses a .tsx file, because it does not
 * read JSX. So every component compiles through babel on the way in, with the same preset and the
 * same automatic runtime the test runners use.
 *
 * The build asks for this module with --import, which runs it before the entry point, so the hook
 * stands before the first page is imported. Under jest nothing registers it, because babel-jest
 * already compiles every file it loads.
 */
registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith('.tsx')) {
      return nextLoad(url, context);
    }

    const file = fileURLToPath(url);
    const compiled = transformSync(readFileSync(file, 'utf8'), {
      babelrc: false,
      configFile: false,
      filename: file,
      presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
      plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]],
    });

    // An empty module draws an empty page, and an empty page passes for a page, so a compiler that
    // answered nothing has to stop the build here.
    if (compiled === null || typeof compiled.code !== 'string') {
      throw new Error(`babel compiled nothing from ${file}`);
    }

    return { format: 'module', shortCircuit: true, source: compiled.code };
  },
});
