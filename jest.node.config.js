/** @type {import('jest').Config} */
module.exports = {
  displayName: 'workspace',
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: [
    '<rootDir>/packages/**/tests/**/*.test.ts',
    '<rootDir>/tools/**/*.test.ts',
    '<rootDir>/brand/**/tests/**/*.test.ts',
  ],
  // @noble/ciphers ships as a module and nothing else, so babel has to read it rather than
  // skip it the way it skips the rest of node_modules.
  transformIgnorePatterns: ['/node_modules/(?!@noble/)'],
  transform: {
    '^.+\\.[jt]sx?$': [
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
