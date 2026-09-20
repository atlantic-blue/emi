/** @type {import('jest').Config} */
module.exports = {
  displayName: 'mobile',
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  // The preset skips node_modules apart from the react native family. @noble/ciphers ships as
  // a module and nothing else, so it is named here or the envelope cannot be imported. The
  // gluestack packages and the react-aria family they are built on ship the same way, and
  // react-native-css is read from source by the babel plugin that rewrites the imports.
  transformIgnorePatterns: [
    '/node_modules/(?!(@noble|yaml|@gluestack-ui|@react-aria|@react-stately|@react-types|@internationalized|react-aria|react-stately|react-native-css|nativewind|tailwind-variants|@legendapp|clsx|tailwind-merge|.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  // Expo pins React 19.2.3 and the test renderer asks for 19.3.0, so npm installs both and a
  // component rendered here would hold a different React from the one the renderer drives. Every
  // hook then reads a dispatcher nobody set. One copy for the whole run, and it is the copy the
  // application ships.
  moduleNameMapper: {
    '^react$': require.resolve('react'),
    // The bundler turns the stylesheet import into the compiled theme. Nothing here does, so the
    // import resolves to a module holding nothing, and a test that needs the theme compiles it.
    '\\.css$': '<rootDir>/tests/fixtures/theStylesheetImport.ts',
  },
  testTimeout: 60000,
};
