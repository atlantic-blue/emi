/** @type {import('jest').Config} */
module.exports = {
  displayName: 'mobile',
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  // Expo pins React 19.2.3 and the test renderer asks for 19.3.0, so npm installs both and a
  // component rendered here would hold a different React from the one the renderer drives. Every
  // hook then reads a dispatcher nobody set. One copy for the whole run, and it is the copy the
  // application ships.
  moduleNameMapper: {
    '^react$': require.resolve('react'),
  },
  testTimeout: 60000,
};
