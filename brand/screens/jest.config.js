const { resolve } = require('node:path');

const mobile = require('../../apps/mobile/jest.config.js');

const mobileRoot = resolve(__dirname, '..', '..', 'apps', 'mobile');
const preset = require('jest-expo/jest-preset');

/**
 * The picture is drawn by the same runner the tests use, because the screen it renders is React
 * Native and nothing else can load it. The default run matches `*.test.tsx` and never picks this
 * up, so the picture is drawn only when it is asked for.
 *
 * The preset reads the babel configuration from wherever the command was launched, and this one is
 * launched from the root of the repository rather than from the application. Left alone, babel
 * would find no configuration at all, NativeWind's plugin would never run, and every class name
 * would reach the page as a class name rather than as the points it stands for. So the root is
 * named here.
 *
 * @type {import('jest').Config}
 */
const [transformer, options] = preset.transform['\\.[jt]sx?$'];

module.exports = {
  ...mobile,
  displayName: 'home-picture',
  rootDir: mobileRoot,
  testMatch: ['<rootDir>/tests/pictures/*.picture.tsx'],
  transform: {
    ...preset.transform,
    '\\.[jt]sx?$': [transformer, { ...options, babelrcRoots: mobileRoot, root: mobileRoot }],
  },
};
