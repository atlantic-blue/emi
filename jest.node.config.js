/** @type {import('jest').Config} */
module.exports = {
  displayName: 'workspace',
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['<rootDir>/packages/**/tests/**/*.test.ts', '<rootDir>/tools/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
};
