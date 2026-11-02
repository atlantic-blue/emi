import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { asPlaywrightReadsIt } from '../../apps/website/test/theConfiguration';
import type { WhatTheSuiteDeclares } from '../../apps/website/test/theConfiguration';

const feature = loadFeature(join(__dirname, '26.12-playwright-runs-the-website.feature'));

const websiteWorkspace = resolve(__dirname, '..', '..', 'apps', 'website');

const theCommandThatRefusesAnEmptyRun = join(websiteWorkspace, 'e2e', 'refuseAnEmptyRun.ts');

/**
 * The three widths the board was drawn at, smallest first, which is the order the suite reports
 * them in: a desktop, a tablet, and the phone most of her reading happens on.
 */
const theWidthsOfTheBoard = [390, 834, 1280];

function asOneList(value: string | readonly string[] | undefined): string[] {
  return value === undefined ? [] : [value].flat();
}

/** The report a Playwright run writes, carrying a count of scenarios and nothing else. */
function aReportOf(scenarios: number): string {
  const file = join(mkdtempSync(join(tmpdir(), 'emi-browser-run-')), 'scenarios.json');

  writeFileSync(
    file,
    JSON.stringify({ stats: { expected: scenarios, unexpected: 0, flaky: 0, skipped: 0 } }),
  );

  return file;
}

function readingThatReport(file: string): { status: number | null; said: string } {
  const ran = spawnSync(
    process.execPath,
    ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', theCommandThatRefusesAnEmptyRun, file],
    { cwd: websiteWorkspace, encoding: 'utf8' },
  );

  return { status: ran.status, said: `${ran.stdout ?? ''}${ran.stderr ?? ''}` };
}

/** Every script of the website workspace that runs the browser suite, read as one line. */
function theScriptsThatRunTheSuite(): string {
  const manifest = JSON.parse(readFileSync(join(websiteWorkspace, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };

  return Object.entries(manifest.scripts ?? {})
    .filter(([name]) => name.startsWith('test:e2e'))
    .map(([, line]) => line)
    .join(' && ');
}

defineFeature(feature, (test) => {
  test('playwright opens the not found page at every width the board was drawn at', ({
    given,
    then,
    and,
  }) => {
    let suite: WhatTheSuiteDeclares;

    given('the suite that reads myemi.app in a browser', () => {
      suite = asPlaywrightReadsIt();
    });

    then('it starts the site this repository builds, and reads it there', () => {
      expect(suite.startsAServer).toBe(true);
      expect(suite.serverCommand).toContain('start');
      expect(suite.serverPort).toEqual(expect.any(Number));
      expect(suite.serverPort).not.toBe(3000);
      expect(suite.baseURL).toBe(`http://127.0.0.1:${suite.serverPort}`);
      expect(suite.refusesAServerItDidNotStart).toBe(true);
      expect(theScriptsThatRunTheSuite()).toContain('build');
      expect(theScriptsThatRunTheSuite()).toContain('playwright test');
    });

    and('it reads at the width of a desktop, of a tablet and of a phone', () => {
      expect(suite.widths).toEqual(theWidthsOfTheBoard);

      // One browser at each width, and the same browser at all of them. Two engines drawing one
      // page write different bytes, so a comparison across two of them would report on the
      // machine rather than on the page.
      expect(suite.browsers).toEqual(theWidthsOfTheBoard.map(() => 'chromium'));
    });

    and('what it reads is the status, the words she gets, and her press back to Emi', () => {
      const sentences = asOneList(suite.gherkin[0]?.features)
        .map((pattern) => pattern.replace('*.feature', 'notFound.feature'))
        .map((pattern) => readFileSync(join(websiteWorkspace, pattern), 'utf8'))
        .join('\n');

      expect(sentences).toContain('which this site does not have');
      expect(sentences).toContain('there is no such page');
      expect(sentences).toContain('the page does not exist');
      expect(sentences).toContain('the press back to Emi');
      expect(sentences).toContain('inside the screen she holds');
    });

    and('a sentence nobody taught it stops the run instead of being skipped', () => {
      expect(suite.gherkin).toHaveLength(1);
      expect(asOneList(suite.gherkin[0]?.features)).toEqual(['e2e/features/*.feature']);
      expect(asOneList(suite.gherkin[0]?.steps)).toEqual(['e2e/steps/*.ts']);
      expect(suite.gherkin[0]?.missingSteps).toBe('fail-on-gen');
    });

    and('told another host, it reads that host and starts no site of its own', () => {
      const live = asPlaywrightReadsIt('https://myemi.app');

      expect(live.baseURL).toBe('https://myemi.app');
      expect(live.startsAServer).toBe(false);
      expect(live.widths).toEqual(theWidthsOfTheBoard);
    });

    and('a run that carried out no scenario at all is refused', () => {
      const nothing = readingThatReport(aReportOf(0));

      expect(nothing.status).not.toBe(0);
      expect(nothing.said).toContain('0 scenarios');

      const something = readingThatReport(aReportOf(2));

      expect(something.status).toBe(0);
      expect(something.said).toContain('2 scenario');
    });
  });
});
