import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

interface BuildProfile {
  readonly developmentClient?: boolean;
  readonly distribution?: string;
  readonly autoIncrement?: boolean;
}

interface SubmitProfile {
  readonly ios?: { readonly ascAppId?: string };
}

interface BuildConfiguration {
  readonly cli: { readonly version: string; readonly appVersionSource: string };
  readonly build: Readonly<Record<string, BuildProfile>>;
  readonly submit: Readonly<Record<string, SubmitProfile>>;
}

interface ApplicationConfiguration {
  readonly expo: {
    readonly name: string;
    readonly slug: string;
    readonly owner?: string;
    readonly ios: { readonly bundleIdentifier: string };
    readonly extra?: { readonly eas?: { readonly projectId?: string } };
  };
}

function readJson<T>(...path: string[]): T {
  return JSON.parse(readFileSync(join(repositoryRoot, ...path), 'utf8')) as T;
}

const build = (): BuildConfiguration => readJson<BuildConfiguration>('apps', 'mobile', 'eas.json');

const application = (): ApplicationConfiguration =>
  readJson<ApplicationConfiguration>('apps', 'mobile', 'app.json');

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
      expect(build().build.production).toEqual({ autoIncrement: true });
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
