import { resolve } from 'node:path';

import {
  describeThirdPartyEye,
  forbiddenNaming,
  forbiddenPackages,
  installedFor,
  measuredWorkspace,
  packageNameOf,
  readLockfile,
  refusalFor,
  resolveFrom,
  thirdPartyEyesIn,
  thirdPartyEyesUnder,
} from './thirdParty';

const repositoryRoot = resolve(__dirname, '..', '..');

/** Taken from the list rather than written here, so this file invents no package name. */
function theListedPackageStartingWith(beginning: string): string {
  const found = forbiddenPackages.find((name) => name.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`no forbidden package starts with "${beginning}"`);
  }

  return found;
}

const theCrashReporter = theListedPackageStartingWith('@sentry');
const theAdvertisingModule = theListedPackageStartingWith('expo-tracking');

describe('no third party sees anything', () => {
  const lock = readLockfile(repositoryRoot);
  const installed = installedFor(lock, measuredWorkspace).map(packageNameOf);

  describe('the application as it installs today', () => {
    it('carries no analytics, no advertising identifier and no crash reporter', () => {
      expect(thirdPartyEyesUnder(repositoryRoot).map(describeThirdPartyEye)).toEqual([]);
    });

    it('reads the whole installed tree and says how much, not only what is in the manifest', () => {
      expect(installed.length).toBeGreaterThan(100);
      expect(installed).toContain('expo');
      expect(installed).toContain('react-native');
      // Four levels from the manifest, which is the depth one of these would arrive at.
      expect(installed).toContain('scheduler');
    });

    it('leaves the workspace itself out of what it measured', () => {
      expect(installed).not.toContain(measuredWorkspace);
    });
  });

  describe('a package the list names', () => {
    it('is refused by its own name', () => {
      expect(refusalFor(theCrashReporter)).toContain(theCrashReporter);
      expect(refusalFor(theAdvertisingModule)).toContain(theAdvertisingModule);
    });

    it('is refused anywhere under its scope, because a scope is the whole family', () => {
      expect(refusalFor(`${theCrashReporter}/react-native`)).toContain(theCrashReporter);
    });

    it('does not refuse a package that merely begins with the same letters', () => {
      expect(refusalFor(`${theCrashReporter}-shaped-name`)).toBeUndefined();
    });

    it('names the package and the rule when it is found installed', () => {
      const found = thirdPartyEyesIn(['react-native', theCrashReporter]);

      expect(found.map((each) => each.packageName)).toEqual([theCrashReporter]);
      expect(describeThirdPartyEye(found[0] as (typeof found)[number])).toContain(
        'is installed for the application',
      );
    });
  });

  describe('a package nobody has heard of yet', () => {
    it.each([
      'super-analytics',
      'phone-telemetry',
      'rn-crashlytics',
      'some-crash-reporter',
      'advertising-id-native',
      'react-native-idfa-reader',
      'expo-tracking-transparency-shim',
      'replay-session-replay',
    ])('%s is refused on its wording alone', (name) => {
      expect(refusalFor(name)).toBeDefined();
    });

    it.each([
      'dnssd-advertise',
      'es-set-tostringtag',
      'has-tostringtag',
      '@babel/plugin-syntax-import-attributes',
      'react-native-safe-area-context',
      'add-stream',
    ])('%s is left alone, because it is not one of these', (name) => {
      expect(refusalFor(name)).toBeUndefined();
    });

    it('matches on a whole word only, and every pattern says so', () => {
      expect(forbiddenNaming.every((wording) => wording.source.includes('\\b'))).toBe(true);
    });
  });

  describe('the walk over the lockfile', () => {
    it('takes the nested copy of a package over the one at the root', () => {
      const nested = {
        packages: {
          'apps/mobile': { dependencies: { one: '1' } },
          'node_modules/one': {},
          'apps/mobile/node_modules/one': {},
        },
      };

      expect(resolveFrom(nested, 'apps/mobile', 'one')).toBe('apps/mobile/node_modules/one');
    });

    it('climbs out of a nested directory to find what is only at the root', () => {
      const climbing = {
        packages: {
          'node_modules/one': { dependencies: { two: '1' } },
          'node_modules/two': {},
        },
      };

      expect(resolveFrom(climbing, 'node_modules/one', 'two')).toBe('node_modules/two');
    });

    it('answers nothing for a package the lockfile does not hold', () => {
      expect(resolveFrom({ packages: {} }, 'apps/mobile', 'missing')).toBeUndefined();
    });

    it('finds a package that arrives only as an optional dependency', () => {
      const optional = {
        packages: {
          'apps/mobile': { optionalDependencies: { maybe: '1' } },
          'node_modules/maybe': {},
        },
      };

      expect(installedFor(optional, 'apps/mobile')).toEqual(['node_modules/maybe']);
    });

    it('walks a cycle once rather than forever', () => {
      const circular = {
        packages: {
          'apps/mobile': { dependencies: { one: '1' } },
          'node_modules/one': { dependencies: { two: '1' } },
          'node_modules/two': { dependencies: { one: '1' } },
        },
      };

      expect(installedFor(circular, 'apps/mobile')).toEqual([
        'node_modules/one',
        'node_modules/two',
      ]);
    });
  });
});
