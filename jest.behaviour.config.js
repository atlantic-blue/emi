const { resolve } = require('node:path');

const mobile = require('./apps/mobile/jest.config.js');

/**
 * The behaviour tier. The scenarios read as sentences and the steps drive the real screens, so the
 * runner is the one the application runs under: the same preset, the same transforms and the same
 * single copy of React.
 *
 * The root stays on apps/mobile because babel-preset-expo is resolved from there, and the feature
 * files sit outside it, so both directories are named as roots.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  ...mobile,
  displayName: 'behaviour',
  rootDir: resolve(__dirname, 'apps', 'mobile'),
  roots: [resolve(__dirname, 'features'), resolve(__dirname, 'apps', 'mobile')],
  testMatch: [resolve(__dirname, 'features', '**', '*.steps.tsx')],
  // The gherkin reader and the identifiers it draws ship as modules, and the preset resolves them
  // to their browser build, so babel reads them here rather than skipping them with the rest of
  // node_modules.
  transformIgnorePatterns: [
    ...mobile.transformIgnorePatterns
      .slice(0, 1)
      .map((pattern) => pattern.replace('(?!(', '(?!(jest-cucumber|@cucumber|uuid|')),
    ...mobile.transformIgnorePatterns.slice(1),
  ],
};
