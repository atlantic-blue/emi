import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '..', '..');

/**
 * The pipeline installs from the public registry and holds no credentials for any other. A package
 * installed on a machine whose npm configuration points somewhere else writes that registry into
 * the lock file, and the install in the pipeline then fails with a refused login.
 */
const thePublicRegistry = 'https://registry.npmjs.org/';

interface LockedPackage {
  readonly resolved?: string;
}

function resolvedFromElsewhere(): string[] {
  const lock = JSON.parse(readFileSync(join(repositoryRoot, 'package-lock.json'), 'utf8')) as {
    packages: Record<string, LockedPackage>;
  };

  return Object.entries(lock.packages)
    .filter(([, locked]) => locked.resolved?.startsWith('http') === true)
    .filter(([, locked]) => locked.resolved?.startsWith(thePublicRegistry) !== true)
    .map(([path]) => path);
}

describe('the lock file', () => {
  it('resolves every downloaded package from the public registry', () => {
    expect(resolvedFromElsewhere()).toEqual([]);
  });
});
