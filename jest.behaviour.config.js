const { resolve } = require('node:path');

// A test of a screen takes longer than the default five seconds, and the runner reads that number
// for the whole run rather than for one project inside it, so it is lifted out here.
const { testTimeout, ...mobile } = require('./apps/mobile/jest.config.js');

const features = resolve(__dirname, 'features');
const websiteWorkspace = resolve(__dirname, 'apps', 'website');
const websiteDoubles = resolve(websiteWorkspace, 'test', 'doubles');

/** The same cap as the application tier, on the run and on each project inside it. */
const cap = {
  maxWorkers: 4,
  workerIdleMemoryLimit: '1GB',
};

/**
 * The scenarios of the phone. The runner is the one the application runs under: the same preset,
 * the same transforms and the same single copy of React.
 *
 * The root stays on apps/mobile because babel-preset-expo is resolved from there, and the feature
 * files sit outside it, so both directories are named as roots.
 */
const thePhone = {
  ...mobile,
  ...cap,
  displayName: 'behaviour',
  rootDir: resolve(__dirname, 'apps', 'mobile'),
  roots: [features, resolve(__dirname, 'apps', 'mobile')],
  testMatch: [resolve(features, '**', '*.steps.tsx')],
  // The pages of the site are drawn by a server and this project starts a phone, so the scenarios
  // of the site are left to the project below. The pattern is written as a path fragment rather
  // than an absolute one, because a checkout sits wherever somebody put it.
  testPathIgnorePatterns: ['/node_modules/', 'features/website/'],
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

/**
 * The scenarios of myemi.app. Next.js draws those pages on a server, where there is no window and
 * nothing of a phone, so they are drawn here the same way: node, and the transforms the website
 * workspace already uses.
 */
const theWebsite = {
  ...cap,
  displayName: 'behaviour website',
  testEnvironment: 'node',
  rootDir: __dirname,
  roots: [resolve(features, 'website')],
  testMatch: [resolve(features, 'website', '**', '*.steps.tsx')],
  // react-dom refuses to draw with a React of another version, and the root holds the copy the
  // test renderer of the phone asks for. Every react import in this project is pointed at the
  // copy beside the website workspace, which is the version the site ships.
  moduleNameMapper: {
    '^react$': require.resolve('react', { paths: [websiteWorkspace] }),
    // A stylesheet and the loader that copies the font files are answered by a bundler, and no
    // runner runs one. The website tier stands in the same two doubles, from the same directory,
    // and a real build reads both for what they stand in for.
    '\\.css$': resolve(websiteDoubles, 'stylesheet.ts'),
    '^next/font/local$': resolve(websiteDoubles, 'nextFontLocal.ts'),
    // The alias the pages of the site use, which components.json also names.
    '^@/(.*)$': `${websiteWorkspace}/$1`,
  },
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
        ],
        plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]],
      },
    ],
  },
};

/**
 * The behaviour tier. The scenarios read as sentences and the steps drive the real thing, and the
 * real thing is two: screens in her hand, and pages a server draws. One project for each.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  ...cap,
  testTimeout,
  projects: [thePhone, theWebsite],
};
