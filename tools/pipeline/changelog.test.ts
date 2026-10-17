import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '..', '..');

function read(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

function versionsInTheChangelog(): string[] {
  return [...read('CHANGELOG.md').matchAll(/^## (\d+\.\d+\.\d+)/gm)].map((match) => match[1] ?? '');
}

describe('the changelog names the version the app is built at', () => {
  it('the newest entry is the version in app.json', () => {
    const appVersion = (JSON.parse(read('apps/mobile/app.json')) as { expo: { version: string } })
      .expo.version;

    expect(versionsInTheChangelog()[0]).toBe(appVersion);
  });

  it('each version appears once, newest first', () => {
    const versions = versionsInTheChangelog();
    const newestFirst = [...versions].sort((left, right) =>
      right.localeCompare(left, undefined, { numeric: true }),
    );

    expect(versions.length).toBeGreaterThan(0);
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toEqual(newestFirst);
  });
});
