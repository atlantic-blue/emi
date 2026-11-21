import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

// Apple refuses an upload built with an older software development kit from April 2027, and Expo
// picks the Xcode a build runs under from this image name alone.
const PRODUCTION_IMAGE = 'macos-tahoe-26.6-xcode-27.2';

interface BuildProfile {
  readonly developmentClient?: boolean;
  readonly distribution?: string;
  readonly autoIncrement?: boolean;
  readonly ios?: { readonly image?: string };
}

interface SubmitProfile {
  readonly ios?: { readonly ascAppId?: string };
}

interface BuildConfiguration {
  readonly cli: { readonly version: string; readonly appVersionSource: string };
  readonly build: Readonly<Record<string, BuildProfile>>;
  readonly submit: Readonly<Record<string, SubmitProfile>>;
}

type PluginEntry = string | readonly [string, Readonly<Record<string, unknown>>];

interface BuildProperties {
  readonly ios?: { readonly enableSceneSupport?: boolean };
}

interface ApplicationConfiguration {
  readonly expo: {
    readonly name: string;
    readonly slug: string;
    readonly owner?: string;
    readonly ios: { readonly bundleIdentifier: string };
    readonly plugins: readonly PluginEntry[];
    readonly extra?: { readonly eas?: { readonly projectId?: string } };
  };
}

interface Manifest {
  readonly dependencies: Readonly<Record<string, string>>;
}

function readJson<T>(...path: string[]): T {
  return JSON.parse(readFileSync(join(repositoryRoot, ...path), 'utf8')) as T;
}

const build = (): BuildConfiguration => readJson<BuildConfiguration>('apps', 'mobile', 'eas.json');

const application = (): ApplicationConfiguration =>
  readJson<ApplicationConfiguration>('apps', 'mobile', 'app.json');

const manifest = (): Manifest => readJson<Manifest>('apps', 'mobile', 'package.json');

function pluginNames(): readonly string[] {
  return application().expo.plugins.map((plugin) =>
    typeof plugin === 'string' ? plugin : plugin[0],
  );
}

function settingsGivenTo(name: string): Readonly<Record<string, unknown>> | undefined {
  for (const plugin of application().expo.plugins) {
    if (typeof plugin !== 'string' && plugin[0] === name) {
      return plugin[1];
    }
  }

  return undefined;
}

const buildProperties = (): BuildProperties =>
  (settingsGivenTo('expo-build-properties') ?? {}) as BuildProperties;

describe('the application carries what EAS needs to build it for TestFlight', () => {
  describe('the profiles a build starts from', () => {
    it('gives her a development build that opens in the development client', () => {
      expect(build().build.development).toEqual({
        developmentClient: true,
        distribution: 'internal',
      });
    });

    it('gives a tester a preview build handed out directly, off the store', () => {
      expect(build().build.preview).toEqual({ distribution: 'internal' });
    });

    it('raises the build number of every production build without anybody typing it', () => {
      expect(build().build.production).toEqual({
        autoIncrement: true,
        ios: { image: PRODUCTION_IMAGE },
      });
      expect(build().build.production?.autoIncrement).toBe(true);
    });

    it('offers these three and nothing else, so a build cannot pick an unwritten profile', () => {
      expect(Object.keys(build().build).sort()).toEqual(['development', 'preview', 'production']);
    });
  });

  describe('the command line that runs the build', () => {
    it('refuses a command line older than the one these profiles were written for', () => {
      expect(build().cli.version).toBe('>= 18.0.6');
    });

    it('counts the version of the build on the service, not in the repository', () => {
      expect(build().cli.appVersionSource).toBe('remote');
    });
  });

  describe('the Expo project a build lands in', () => {
    it('sends the build to the Emi project, by the id the service gave it', () => {
      expect(application().expo.extra?.eas?.projectId).toBe('e75181ac-ed33-4423-905d-a1d0778bd52b');
    });

    it('builds under the account that owns the project, so a build needs no guess', () => {
      expect(application().expo.owner).toBe('atlanticblue');
    });

    it('still builds Emi itself, under the identifier the store knows', () => {
      const { expo } = application();

      expect([expo.name, expo.slug, expo.ios.bundleIdentifier]).toEqual([
        'Emi',
        'emi',
        'blue.atlantic.emi',
      ]);
    });
  });
});

describe('a submit to TestFlight needs no Apple login', () => {
  describe('the profile a submit sends with', () => {
    it('names the Emi record in App Store Connect, so a submit asks for no Apple id', () => {
      expect(build().submit.production?.ios?.ascAppId).toBe('6815742770');
    });

    it('carries the id as text, which is the form the submit profile takes', () => {
      expect(typeof build().submit.production?.ios?.ascAppId).toBe('string');
    });

    it('names the application and nothing besides, so a submit changes no other setting', () => {
      expect(build().submit.production).toEqual({ ios: { ascAppId: '6815742770' } });
    });

    it('offers this one profile, so a submit cannot pick an unwritten profile', () => {
      expect(Object.keys(build().submit)).toEqual(['production']);
    });
  });
});

describe('the iPhone build is made with Xcode 27', () => {
  describe('the image a production build runs on', () => {
    it('builds a release on the image that carries Xcode 27', () => {
      expect(build().build.production?.ios?.image).toBe(PRODUCTION_IMAGE);
    });

    it('builds on a version of Xcode 27, which is the one the store will accept', () => {
      expect(build().build.production?.ios?.image).toMatch(/-xcode-27\.\d+$/);
    });

    it('names one image outright, so no alias chooses the Xcode a release is built with', () => {
      // Each of these points wherever Expo moves it next, and on 2026-11-21 `latest` pointed at a
      // release candidate. A full name is the only one that stays still between two releases.
      expect(['auto', 'latest', 'sdk-57', 'sdk-58']).not.toContain(
        build().build.production?.ios?.image,
      );
    });

    it('leaves a development build and a preview build on the image Expo picks for them', () => {
      expect(build().build.development?.ios).toBeUndefined();
      expect(build().build.preview?.ios).toBeUndefined();
    });
  });

  describe('the scene life cycle such a build has to open through', () => {
    it('takes up the UIKit scene life cycle, without which the build shows her no screen', () => {
      expect(buildProperties().ios?.enableSceneSupport).toBe(true);
    });

    it('asks for it on iOS alone, the platform whose software development kit requires it', () => {
      expect(Object.keys(buildProperties())).toEqual(['ios']);
    });

    it('asks for it and for no other build property, so nothing else about the build moved', () => {
      expect(buildProperties().ios).toEqual({ enableSceneSupport: true });
    });

    it('carries the plugin that writes the setting into the native project', () => {
      expect(pluginNames()).toContain('expo-build-properties');
    });

    it('installs that plugin with the application, so a build can resolve it', () => {
      expect(manifest().dependencies['expo-build-properties']).toMatch(/^[~^]?57\./);
    });

    it('keeps every plugin the application already carried', () => {
      expect(pluginNames()).toEqual([
        './plugins/withoutRemoteNotifications.ts',
        'expo-notifications',
        'expo-router',
        'expo-local-authentication',
        'expo-build-properties',
      ]);
    });
  });
});
