/** @type {import('jest').Config} */
module.exports = {
  displayName: 'workspace',
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: [
    '<rootDir>/packages/**/tests/**/*.test.ts',
    '<rootDir>/tools/**/*.test.ts',
    '<rootDir>/brand/**/*.test.tsx',
  ],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
        ],
        // The brand pages are written as markup, and each one names the runtime that draws it.
        plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]],
      },
    ],
  },
};
