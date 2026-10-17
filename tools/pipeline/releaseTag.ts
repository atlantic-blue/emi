import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Why the tag cannot release the app, or undefined when it can. A release tag is `v` and the
 * version in `apps/mobile/app.json`, so a tag pushed onto the wrong commit builds nothing.
 */
export function releaseTagProblem(tag: string, version: string): string | undefined {
  if (!tag.startsWith('v')) {
    return `the tag ${tag} does not start with v`;
  }
  if (tag.slice(1) !== version) {
    return `the tag ${tag} is not the version ${version} in apps/mobile/app.json`;
  }
  return undefined;
}

/** The version the store reads, from `expo.version` in `apps/mobile/app.json`. */
export function appVersion(root: string): string {
  const config = JSON.parse(readFileSync(join(root, 'apps/mobile/app.json'), 'utf8')) as {
    expo?: { version?: unknown };
  };
  const version = config.expo?.version;
  if (typeof version !== 'string') {
    throw new Error('apps/mobile/app.json has no expo.version');
  }
  return version;
}
