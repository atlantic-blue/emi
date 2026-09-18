import { existsSync, readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { transformSync } from '@babel/core';

const typeScriptExtensions = ['.ts', '.tsx'];

// Node strips types from a .ts file on its own and does nothing at all with the markup in a .tsx
// file, so a brand generator that draws a page needs this hook before it imports one. The resolve
// half is here because TypeScript writes an import without an extension and only a bundler reads
// one of those.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && extname(specifier) === '') {
      for (const extension of typeScriptExtensions) {
        const candidate = `${specifier}${extension}`;
        const parent = context.parentURL;

        if (parent !== undefined && existsSync(fileURLToPath(new URL(candidate, parent)))) {
          return nextResolve(candidate, context);
        }
      }
    }

    return nextResolve(specifier, context);
  },

  load(url, context, nextLoad) {
    if (!url.startsWith('file:') || !url.endsWith('.tsx')) {
      return nextLoad(url, context);
    }

    const path = fileURLToPath(url);
    const transformed = transformSync(readFileSync(path, 'utf8'), {
      babelrc: false,
      configFile: false,
      filename: path,
      presets: [['@babel/preset-typescript', { allExtensions: true, isTSX: true }]],
      plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]],
    });

    if (transformed === null || transformed.code === null || transformed.code === undefined) {
      throw new Error(`${path} holds markup that did not transform`);
    }

    return { format: 'module', shortCircuit: true, source: transformed.code };
  },
});
