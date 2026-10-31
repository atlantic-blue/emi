import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature(join(__dirname, '26.5-the-website-workspace.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');
const notFoundFile = '404.html';

/**
 * The build runs as the command a merge runs, so the flags it needs live in the manifest of the
 * workspace and nowhere else. It cannot be imported here: this runner maps React to the copy the
 * application ships, and react-dom refuses a React copy of another version.
 */
function buildInto(directory: string): { status: number | null; output: string } {
  const run = spawnSync('npm', ['run', 'build', '--workspace', 'apps/website', '--', directory], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });

  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

defineFeature(feature, (test) => {
  test('the website builds a 404 page with no script', ({ given, when, then, and }) => {
    let directory = '';
    let page = '';

    afterEach(() => {
      rmSync(directory, { force: true, recursive: true });
    });

    given('a woman asks myemi.app for a page that is not there', () => {
      directory = mkdtempSync(join(tmpdir(), 'emi-website-'));

      expect(existsSync(join(directory, notFoundFile))).toBe(false);
    });

    when('the website is built', () => {
      const built = buildInto(directory);

      expect(built.output).not.toContain('Error');
      expect(built.status).toBe(0);
      expect(existsSync(join(directory, notFoundFile))).toBe(true);

      page = readFileSync(join(directory, notFoundFile), 'utf8');
    });

    then('a page tells her that page does not exist', () => {
      expect(page).toContain('<h1>This page does not exist</h1>');
    });

    and('it offers her the way back to the Emi home page', () => {
      expect(page).toContain('href="/"');
      expect(page).toContain('Emi');
    });

    and('it carries no script, so nothing counts her visit', () => {
      expect(page.toLowerCase()).not.toContain('<script');
    });

    and('it asks nobody other than Emi for anything', () => {
      expect(page.toLowerCase()).not.toContain('http');
    });
  });
});
