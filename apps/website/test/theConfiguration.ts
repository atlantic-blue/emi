import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const workspace = resolve(__dirname, '..');

const printer = join(workspace, 'test', 'printTheConfiguration.ts');

/** What playwright-bdd records about the gherkin while the configuration loads. */
export interface RecordedGherkin {
  readonly features?: string | readonly string[];
  readonly steps?: string | readonly string[];
  readonly missingSteps?: string;
}

/** What the browser suite declares about itself, read out of the configuration Playwright loads. */
export interface WhatTheSuiteDeclares {
  readonly baseURL: string | null;
  readonly startsAServer: boolean;
  readonly serverCommand: string | null;
  readonly serverPort: number | null;
  readonly refusesAServerItDidNotStart: boolean;
  /** Smallest first. */
  readonly widths: readonly number[];
  readonly browsers: readonly string[];
  readonly gherkin: readonly RecordedGherkin[];
}

/**
 * The configuration as Playwright loads it: in a process of its own, with the environment it is
 * given and nothing else.
 *
 * It is read in another process on purpose. The file decides where to read when it loads, so
 * asking it twice inside one process would be asking the first answer twice. Playwright itself
 * refuses to be required a second time, which is the same fact from the other side.
 *
 * playwright-bdd works out which directory a configuration belongs to from the command line of
 * the Playwright runner, and no runner is running here, so the directory is stated instead. Only
 * the directory: the suite's own entry is the one the configuration writes, and a second entry
 * under its key reads as two suites disagreeing.
 */
export function asPlaywrightReadsIt(liveHost?: string): WhatTheSuiteDeclares {
  const environment: NodeJS.ProcessEnv = { ...process.env };

  delete environment.BASE_URL;

  environment.PLAYWRIGHT_BDD_CONFIGS = JSON.stringify({
    'the directory the runner would have found': { configDir: workspace },
  });

  if (liveHost !== undefined) {
    environment.BASE_URL = liveHost;
  }

  const read = spawnSync(
    process.execPath,
    ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', printer],
    { cwd: workspace, encoding: 'utf8', env: environment },
  );

  if (read.status !== 0) {
    throw new Error(`The configuration could not be read: ${read.stdout}${read.stderr}`);
  }

  return JSON.parse(read.stdout) as WhatTheSuiteDeclares;
}
