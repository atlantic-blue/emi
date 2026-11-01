/** @type {import('jest').Config} */
module.exports = {
  displayName: 'website',
  // The same cap as the application tier, stated here so a change there cannot uncap this run.
  maxWorkers: 4,
  workerIdleMemoryLimit: '1GB',
  testEnvironment: 'node',
  rootDir: __dirname,
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
