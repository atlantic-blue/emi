const { resolve } = require('node:path');

const mobile = require('../../apps/mobile/jest.config.js');

/**
 * The picture is drawn by the same runner the tests use, because the screen it renders is React
 * Native and nothing else can load it. The default run matches `*.test.tsx` and never picks this
 * up, so the picture is drawn only when it is asked for.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  ...mobile,
  displayName: 'home-picture',
  rootDir: resolve(__dirname, '..', '..', 'apps', 'mobile'),
  testMatch: ['<rootDir>/tests/pictures/*.picture.tsx'],
};
