import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildWebsite, defaultOutputDirectory, notFoundFile } from '../build.ts';

describe('the website builds the page behind an address it does not hold', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'emi-website-'));
  });

  afterEach(() => {
    rmSync(directory, { force: true, recursive: true });
  });

  function pageIn(into: string): string {
    return readFileSync(join(into, notFoundFile), 'utf8');
  }

  describe('the page she is left looking at', () => {
    it('tells her the page does not exist', () => {
      buildWebsite(directory);

      expect(existsSync(join(directory, notFoundFile))).toBe(true);
      expect(pageIn(directory)).toContain('<h1>This page does not exist</h1>');
    });

    it('offers her the way back to the Emi home page', () => {
      buildWebsite(directory);

      expect(pageIn(directory)).toContain('href="/"');
    });

    it('carries no script, so nothing counts her visit', () => {
      buildWebsite(directory);

      expect(pageIn(directory).toLowerCase()).not.toContain('<script');
    });

    it('asks nobody other than Emi for anything', () => {
      buildWebsite(directory);

      expect(pageIn(directory).toLowerCase()).not.toContain('http');
    });

    it('is a whole document, which a browser reads on its own', () => {
      buildWebsite(directory);
      const page = pageIn(directory);

      expect(page.startsWith('<!doctype html>')).toBe(true);
      expect(page).toContain('<html lang="en">');
      expect(page).toContain('Emi');
    });
  });

  describe('what the build answers', () => {
    it('names every file it wrote, so the deploy uploads those and nothing else', () => {
      expect(buildWebsite(directory)).toEqual([join(directory, notFoundFile)]);
    });

    it('creates the directory it writes into when it is absent', () => {
      const absent = join(directory, defaultOutputDirectory);

      buildWebsite(absent);

      expect(existsSync(join(absent, notFoundFile))).toBe(true);
    });
  });

  describe('the command the deploy runs', () => {
    function spawned(
      command: string,
      parameters: string[],
    ): { status: number | null; output: string } {
      const run = spawnSync(command, parameters, { cwd: join(__dirname, '..'), encoding: 'utf8' });

      return { status: run.status, output: `${run.stdout}${run.stderr}` };
    }

    // The script in the manifest is run rather than a copy of it here, because the flag that
    // reads JSX is the thing most easily lost, and a copy would still carry it.
    it('compiles the JSX pages and writes the page, the way a merge will', () => {
      const run = spawned('npm', ['run', 'build', '--', directory]);

      expect(run.output).toContain(notFoundFile);
      expect(run.status).toBe(0);
      expect(pageIn(directory)).toContain('<h1>This page does not exist</h1>');
    }, 60_000);

    it('refuses to start without the loader, naming the file node cannot read', () => {
      const run = spawned(process.execPath, [
        '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
        '--experimental-strip-types',
        'build.ts',
        directory,
      ]);

      expect(run.status).not.toBe(0);
      expect(run.output).toContain('Unknown file extension ".tsx"');
      expect(run.output).toContain('NotFoundPage.tsx');
      expect(existsSync(join(directory, notFoundFile))).toBe(false);
    }, 60_000);
  });
});
