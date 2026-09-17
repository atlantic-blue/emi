/** @type {import('jest').Config} */
module.exports = {
  displayName: 'mobile',
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  // The preset skips node_modules apart from the react native family. @noble/ciphers ships as
  // a module and nothing else, so it is named here or the envelope cannot be imported.
  transformIgnorePatterns: [
    '/node_modules/(?!(@noble|.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
