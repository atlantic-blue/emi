/** @type {import('jest').Config} */
module.exports = {
  displayName: 'website',
  // The same cap as the application tier, stated here so a change there cannot uncap this run.
  maxWorkers: 4,
  workerIdleMemoryLimit: '1GB',
  testEnvironment: 'node',
  rootDir: __dirname,
  // test-renderer, which the application tier and its testing library both ask for, brings
  // react-reconciler, and that peer depends on react ^19.3.0. So react hoists to the root at
  // 19.3.0 while react-dom hoists at 19.2.3, and server rendering refuses two versions outright.
  // Every react import in this run is pointed at the copy beside this workspace, which is the
  // version the site ships.
  moduleNameMapper: {
    '^react$': require.resolve('react'),
    // A stylesheet and the loader that copies the font files are answered by a bundler, and no
    // runner runs one. Both are stood in for, and a real build reads both for what they stand in
    // for, in test/builtSite.test.ts.
    '\\.css$': require.resolve('./test/doubles/stylesheet.ts'),
    '^next/font/local$': require.resolve('./test/doubles/nextFontLocal.ts'),
    // The alias the pages use, which components.json also names, so a component added by the
    // shadcn command resolves here without a second entry.
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['<rootDir>/test/**/*.test.ts', '<rootDir>/test/**/*.test.tsx'],
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
