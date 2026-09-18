import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Contract KEEP-4. The application ships no analytics, no advertising identifier and no crash
 * reporter that carries what she wrote.
 *
 * It reads the lockfile rather than the manifest, because a manifest names what somebody chose and
 * a lockfile names what actually installs. It walks the tree the way Node resolves it, so a
 * package that arrives four levels down inside something else is read like a direct one, which is
 * how one of these usually arrives: nobody adds an analytics library on purpose here, and an
 * Expo module that pulls one in would never show up in a manifest.
 *
 * Only what the application runs is read. The command line tool that serves a development build
 * announces itself on the local network and never reaches a phone, so the build tooling is not on
 * the list of things this measures, and the file says which packages it read.
 */

/** The workspace whose installed tree is measured. */
export const measuredWorkspace = join('apps', 'mobile');

/**
 * Named packages, in the shape a lockfile writes them. A scope is matched whole, so
 * `@sentry/react-native` and everything else under that scope is refused together.
 */
export const forbiddenPackages: readonly string[] = [
  '@amplitude',
  '@bugsnag',
  '@datadog',
  '@microsoft/clarity',
  '@react-native-firebase',
  '@segment',
  '@sentry',
  'appcenter-analytics',
  'appcenter-crashes',
  'branch-sdk',
  'countly-sdk-react-native-bridge',
  'expo-analytics-amplitude',
  'expo-analytics-segment',
  'expo-facebook',
  'expo-firebase-analytics',
  'expo-tracking-transparency',
  'firebase',
  'fullstory',
  'logrocket',
  'matomo-tracker-react-native',
  'mixpanel-react-native',
  'newrelic-react-native-agent',
  'posthog-react-native',
  'react-native-adjust',
  'react-native-appsflyer',
  'react-native-braze-sdk',
  'react-native-fbsdk-next',
  'react-native-google-analytics-bridge',
  'react-native-idfa',
  'react-native-instabug-reactnative',
  'react-native-onesignal',
  'react-native-smartlook-analytics-sdk',
];

/**
 * The shapes a package nobody has heard of yet arrives in. Each one is a whole word, so
 * `dnssd-advertise` on a development server is not read as an advertising identifier and
 * `es-set-tostringtag` is not read as a tag manager.
 */
export const forbiddenNaming: readonly RegExp[] = [
  /\banalytics\b/i,
  /\btelemetry\b/i,
  /\bcrashlytics\b/i,
  /\bcrash[-_]?report(er|ing)?\b/i,
  /\badvertising\b/i,
  /\bidfa\b/i,
  /\bad[-_]?id\b/i,
  /\btracking[-_]?transparency\b/i,
  /\bsession[-_]?replay\b/i,
];

export interface ThirdPartyEye {
  readonly packageName: string;
  /** Which rule refused it: the name it was listed by, or the wording it matched. */
  readonly matched: string;
}

export function describeThirdPartyEye(found: ThirdPartyEye): string {
  return `${found.packageName} is installed for the application, and ${found.matched} refuses it`;
}

interface LockEntry {
  readonly link?: boolean;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly resolved?: string;
}

interface Lockfile {
  readonly packages: Readonly<Record<string, LockEntry>>;
}

export function readLockfile(root: string): Lockfile {
  return JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')) as Lockfile;
}

/** The name a lockfile path ends in, which is the package name including its scope. */
export function packageNameOf(path: string): string {
  return path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
}

/**
 * Where Node would find `name` when it is asked for from `from`: the nested copy first, then each
 * directory above it, which is the rule npm writes the lockfile to.
 */
export function resolveFrom(lock: Lockfile, from: string, name: string): string | undefined {
  let at = from;

  for (;;) {
    const candidate = at === '' ? `node_modules/${name}` : `${at}/node_modules/${name}`;

    if (lock.packages[candidate] !== undefined) {
      return candidate;
    }

    if (at === '') {
      return undefined;
    }

    const nested = at.lastIndexOf('/node_modules/');
    at = nested >= 0 ? at.slice(0, nested) : at.slice(0, Math.max(0, at.lastIndexOf('/')));
  }
}

/** Every package the workspace reaches at run time, by lockfile path, with itself left out. */
export function installedFor(lock: Lockfile, workspace: string = measuredWorkspace): string[] {
  const reached = new Set<string>();

  const walk = (path: string): void => {
    const entry = lock.packages[path];

    if (entry === undefined) {
      return;
    }

    const asked = [
      ...Object.keys(entry.dependencies ?? {}),
      ...Object.keys(entry.optionalDependencies ?? {}),
    ];

    for (const name of asked) {
      const found = resolveFrom(lock, path, name);

      if (found === undefined || reached.has(found)) {
        continue;
      }

      reached.add(found);
      walk(found);
    }
  };

  walk(workspace);

  return [...reached].sort();
}

export function refusalFor(packageName: string): string | undefined {
  const listed = forbiddenPackages.find(
    (name) => packageName === name || packageName.startsWith(`${name}/`),
  );

  if (listed !== undefined) {
    return `the list names ${listed}`;
  }

  return forbiddenNaming.find((wording) => wording.test(packageName))?.source;
}

export function thirdPartyEyesIn(packageNames: readonly string[]): ThirdPartyEye[] {
  return packageNames.flatMap((packageName) => {
    const matched = refusalFor(packageName);

    return matched === undefined ? [] : [{ packageName, matched }];
  });
}

/** The whole check, from a repository root. */
export function thirdPartyEyesUnder(
  root: string,
  workspace: string = measuredWorkspace,
): ThirdPartyEye[] {
  return thirdPartyEyesIn(installedFor(readLockfile(root), workspace).map(packageNameOf));
}
